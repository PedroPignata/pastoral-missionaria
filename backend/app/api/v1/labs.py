import json
import random
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import require_role, get_current_user
from backend.app.models.models import LabTheme, PreachingLab, LabEvaluation
from backend.app.schemas.schemas import (
    LabThemeOut, LabThemeCreate, LabEvaluationCreate, DrawRequest
)

router = APIRouter(prefix="/labs", tags=["Laboratórios de Pregação"])

def fisher_yates_shuffle(items: list) -> list:
    arr = list(items)
    for i in range(len(arr) - 1, 0, -1):
        j = random.randint(0, i)
        arr[i], arr[j] = arr[j], arr[i]
    return arr

@router.get("/")
def get_labs_data(db: Session = Depends(get_db)):
    themes = db.query(LabTheme).order_by(LabTheme.theme_number.asc()).all()
    labs = db.query(PreachingLab).order_by(PreachingLab.created_at.desc()).all()
    evaluations = db.query(LabEvaluation).order_by(LabEvaluation.created_at.desc()).all()
    
    # Parse json for labs draw results
    labs_out = []
    for l in labs:
        try:
            results = json.loads(l.draw_results_json or "[]")
        except Exception:
            results = []
        labs_out.append({
            "id": l.id,
            "title": l.title,
            "lab_date": l.lab_date,
            "duration_minutes": l.duration_minutes,
            "status": l.status,
            "draw_results": results,
            "notes": l.notes,
            "created_at": l.created_at
        })
        
    return {
        "themes": [
            {
                "id": t.id,
                "theme_number": t.theme_number,
                "title": t.title,
                "category": t.category,
                "active": t.active
            }
            for t in themes
        ],
        "labs": labs_out,
        "evaluations": evaluations
    }

@router.post("/draw")
def run_draw(
    req: DrawRequest,
    current_user: dict = Depends(require_role(["admin", "coordenador"])),
    db: Session = Depends(get_db)
):
    if not req.speakers:
        raise HTTPException(status_code=400, detail="Informe ao menos um participante para o sorteio.")
        
    active_themes = db.query(LabTheme).filter(LabTheme.active == 1).all()
    shuffled_speakers = fisher_yates_shuffle(req.speakers)
    shuffled_themes = fisher_yates_shuffle(active_themes)
    
    draw_results = []
    for idx, speaker in enumerate(shuffled_speakers):
        if req.draw_mode == "order_only" or len(shuffled_themes) == 0:
            theme_title = "Tema Livre / A Definir"
            theme_num = None
        else:
            t = shuffled_themes[idx % len(shuffled_themes)]
            theme_title = t.title
            theme_num = t.theme_number
            
        draw_results.append({
            "order": idx + 1,
            "speaker_name": speaker,
            "theme_number": theme_num,
            "theme_title": theme_title,
            "duration_minutes": req.duration_minutes
        })
        
    lab_id = f"lab_{uuid.uuid4().hex[:8]}"
    now_str = datetime.utcnow().isoformat()
    
    lab = PreachingLab(
        id=lab_id,
        title=req.title or f"Laboratório de Pregação — {req.lab_date or now_str[:10]}",
        lab_date=req.lab_date or now_str[:10],
        duration_minutes=req.duration_minutes,
        status="planejado",
        draw_results_json=json.dumps(draw_results),
        notes=req.notes or "",
        created_at=now_str
    )
    db.add(lab)
    db.commit()
    
    return {
        "id": lab_id,
        "draw_results": draw_results,
        "message": "Sorteio de ordem e temas concluído com sucesso!"
    }

@router.post("/evaluate")
def submit_evaluation(
    eval_in: LabEvaluationCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    eval_id = f"eval_{uuid.uuid4().hex[:8]}"
    now_str = datetime.utcnow().isoformat()
    
    evaluation = LabEvaluation(
        id=eval_id,
        lab_id=eval_in.lab_id,
        lab_date=eval_in.lab_date,
        speaker_name=eval_in.speaker_name.strip(),
        theme_title=eval_in.theme_title.strip(),
        evaluator_name=current_user.get("name", "Missionário"),
        crit_dominio_assunto=eval_in.crit_dominio_assunto,
        crit_abordagem_tema=eval_in.crit_abordagem_tema,
        crit_objetividade=eval_in.crit_objetividade,
        crit_cumprimento_tempo=eval_in.crit_cumprimento_tempo,
        crit_embasamento_biblico=eval_in.crit_embasamento_biblico,
        crit_interacao=eval_in.crit_interacao,
        crit_testemunho=eval_in.crit_testemunho,
        crit_oracao=eval_in.crit_oracao,
        comments=eval_in.comments,
        suggested_future_themes=eval_in.suggested_future_themes,
        created_at=now_str
    )
    db.add(evaluation)
    db.commit()
    
    return {
        "message": f"Avaliação de {eval_in.speaker_name} registrada com sucesso!",
        "id": eval_id
    }

@router.post("/themes", response_model=LabThemeOut)
def create_theme(
    theme_in: LabThemeCreate,
    current_user: dict = Depends(require_role(["admin", "coordenador"])),
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    max_num = db.query(func.max(LabTheme.theme_number)).scalar() or 0
    new_theme = LabTheme(
        id=f"thm_{uuid.uuid4().hex[:6]}",
        theme_number=max_num + 1,
        title=theme_in.title.strip(),
        category="Geral",
        active=1
    )
    db.add(new_theme)
    db.commit()
    db.refresh(new_theme)
    return new_theme

@router.patch("/themes/{theme_id}/archive")
def toggle_archive_theme(
    theme_id: str,
    current_user: dict = Depends(require_role(["admin", "coordenador"])),
    db: Session = Depends(get_db)
):
    theme = db.query(LabTheme).filter(LabTheme.id == theme_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Tema não encontrado.")
        
    theme.active = 0 if theme.active == 1 else 1
    db.commit()
    
    return {
        "message": "Tema arquivado com sucesso!" if theme.active == 0 else "Tema reativado com sucesso!",
        "active": theme.active
    }
