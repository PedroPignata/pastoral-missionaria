import base64
import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from backend.app.core.database import get_db
from backend.app.core.security import create_access_token, get_current_user
from backend.app.models.models import User, PastoralMember
from backend.app.schemas.schemas import LoginRequest, GoogleLoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas. Verifique o e-mail ou a senha."
        )
        
    try:
        is_valid = bcrypt.checkpw(request.password.encode('utf-8'), user.password_hash.encode('utf-8'))
    except Exception:
        is_valid = False
        
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas. Verifique o e-mail ou a senha."
        )
        
    user_payload = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "picture_url": user.picture_url,
    }
    token = create_access_token(user_payload)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_payload,
        "needs_onboarding": user.role == "pendente",
    }

@router.post("/google", response_model=TokenResponse)
def google_login(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    email = ""
    name = ""
    picture_url = None
    google_id = None

    if request.credential:
        try:
            parts = request.credential.split(".")
            if len(parts) == 3:
                # Add padding if needed
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                payload = json.loads(base64.b64decode(padded).decode("utf-8"))
                email = payload.get("email", "")
                name = payload.get("name", payload.get("given_name", ""))
                picture_url = payload.get("picture")
                google_id = payload.get("sub")
        except Exception:
            pass

    if not email and request.email:
        email = request.email
        name = request.name or email.split("@")[0]
        picture_url = request.picture
        google_id = request.google_id

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-mail do Google não informado ou inválido."
        )

    email = email.strip().lower()
    name = (name or email.split("@")[0]).strip()
    now = datetime.utcnow().isoformat()

    existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        if picture_url and not existing_user.picture_url:
            existing_user.picture_url = picture_url
        if google_id and not existing_user.google_id:
            existing_user.google_id = google_id
        existing_user.updated_at = now
        db.commit()
        db.refresh(existing_user)

        user_payload = {
            "id": existing_user.id,
            "name": existing_user.name,
            "email": existing_user.email,
            "role": existing_user.role,
            "picture_url": existing_user.picture_url,
        }
        token = create_access_token(user_payload)
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user_payload,
            "needs_onboarding": existing_user.role == "pendente",
        }

    # New user: determine role
    is_named_coordinator = (
        "pedropignata" in email
        or "fernanda" in email
        or email == "admin@pastoralmissionaria.com.br"
    )

    if is_named_coordinator:
        assigned_role = "coordenador"
    else:
        # Check if matches existing pastoral member
        pmatch = db.query(PastoralMember).filter(PastoralMember.email == email).first()
        if pmatch:
            assigned_role = pmatch.pastoral_role or "membro"
        else:
            name_match = db.query(PastoralMember).filter(PastoralMember.name == name).first()
            if name_match:
                assigned_role = name_match.pastoral_role or "membro"
            else:
                assigned_role = "pendente"

    new_user_id = str(uuid.uuid4())
    new_user = User(
        id=new_user_id,
        name=name,
        email=email,
        password_hash=None,
        role=assigned_role,
        google_id=google_id,
        picture_url=picture_url,
        created_at=now,
        updated_at=now,
    )
    db.add(new_user)
    db.commit()

    user_payload = {
        "id": new_user_id,
        "name": name,
        "email": email,
        "role": assigned_role,
        "picture_url": picture_url,
    }
    token = create_access_token(user_payload)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_payload,
        "needs_onboarding": assigned_role == "pendente",
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user["id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return user
