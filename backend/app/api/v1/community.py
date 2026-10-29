import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, require_role
from backend.app.models.models import CommunityPost, CommunityComment, CommunityLike
from backend.app.schemas.schemas import CommunityPostOut, CommunityPostCreate, CommunityCommentCreate

router = APIRouter(prefix="/community", tags=["Comunidade Missionária"])

@router.get("/posts", response_model=List[CommunityPostOut])
def get_feed(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(CommunityPost).filter(CommunityPost.is_hidden == 0)
    if category and category != "Todas":
        query = query.filter(CommunityPost.category == category)
        
    posts = query.order_by(CommunityPost.pinned.desc(), CommunityPost.created_at.desc()).limit(50).all()
    return posts

@router.post("/posts", response_model=CommunityPostOut)
def create_post(
    post_in: CommunityPostCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post_id = f"post_{uuid.uuid4().hex[:8]}"
    now_str = datetime.utcnow().isoformat()
    
    post = CommunityPost(
        id=post_id,
        author_id=current_user["id"],
        author_name=current_user.get("name", "Missionário"),
        author_photo=None,
        content=post_in.content.strip(),
        category=post_in.category or "Partilha",
        image_url=post_in.image_url,
        link_url=post_in.link_url,
        pinned=0,
        likes_count=0,
        comments_count=0,
        is_hidden=0,
        created_at=now_str,
        updated_at=now_str
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post

@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicação não encontrada.")
        
    existing_like = db.query(CommunityLike).filter(
        CommunityLike.post_id == post_id,
        CommunityLike.user_id == current_user["id"]
    ).first()
    
    if existing_like:
        db.delete(existing_like)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        new_like = CommunityLike(
            id=f"like_{uuid.uuid4().hex[:8]}",
            post_id=post_id,
            user_id=current_user["id"],
            created_at=datetime.utcnow().isoformat()
        )
        db.add(new_like)
        post.likes_count += 1
        liked = True
        
    db.commit()
    return {"liked": liked, "likes_count": post.likes_count}

@router.post("/posts/{post_id}/comments")
def add_comment(
    post_id: str,
    comment_in: CommunityCommentCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicação não encontrada.")
        
    comment_id = f"cmt_{uuid.uuid4().hex[:8]}"
    now_str = datetime.utcnow().isoformat()
    
    comment = CommunityComment(
        id=comment_id,
        post_id=post_id,
        author_id=current_user["id"],
        author_name=current_user.get("name", "Missionário"),
        author_photo=None,
        content=comment_in.content.strip(),
        created_at=now_str
    )
    db.add(comment)
    post.comments_count += 1
    db.commit()
    
    return {
        "id": comment_id,
        "author_name": comment.author_name,
        "content": comment.content,
        "created_at": comment.created_at
    }

@router.delete("/posts/{post_id}")
def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Publicação não encontrada.")
        
    is_coord = current_user.get("role") in ["admin", "coordenador"]
    if post.author_id != current_user["id"] and not is_coord:
        raise HTTPException(status_code=403, detail="Você não tem permissão para excluir esta publicação.")
        
    db.delete(post)
    db.commit()
    return {"message": "Publicação removida com sucesso."}
