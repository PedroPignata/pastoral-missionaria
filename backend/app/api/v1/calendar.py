import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import require_role
from backend.app.models.models import CalendarEvent
from backend.app.schemas.schemas import CalendarEventOut, CalendarEventCreate

router = APIRouter(prefix="/calendar", tags=["Calendário"])

@router.get("/events", response_model=List[CalendarEventOut])
def list_calendar_events(
    year: Optional[int] = Query(None, description="Filtrar por ano (ex: 2027)"),
    month: Optional[str] = Query(None, description="Mês de 2 dígitos (ex: '01')"),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(CalendarEvent).filter(CalendarEvent.status != "Cancelado")
    
    if category and category != "Todas":
        query = query.filter(CalendarEvent.category == category)
        
    events = query.order_by(CalendarEvent.event_date.asc()).all()
    
    if year:
        events = [e for e in events if e.event_date.startswith(str(year))]
    if month and month != "Todas":
        events = [e for e in events if len(e.event_date) >= 7 and e.event_date[5:7] == month]
        
    return events

@router.get("/next-event", response_model=Optional[CalendarEventOut])
def get_next_event(db: Session = Depends(get_db)):
    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # 1. Look for next event with date >= today
    next_ev = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.status != "Cancelado", CalendarEvent.event_date >= today_str)
        .order_by(CalendarEvent.event_date.asc())
        .first()
    )
    if next_ev:
        return next_ev
        
    # 2. If no event >= today (e.g. browsing future years), pick earliest planned event
    earliest = (
        db.query(CalendarEvent)
        .filter(CalendarEvent.status != "Cancelado")
        .order_by(CalendarEvent.event_date.asc())
        .first()
    )
    return earliest

@router.post("/events", response_model=CalendarEventOut)
def create_event(
    event_in: CalendarEventCreate,
    current_user: dict = Depends(require_role(["admin", "coordenador"])),
    db: Session = Depends(get_db)
):
    now_str = datetime.utcnow().isoformat()
    new_id = f"cal_{uuid.uuid4().hex[:8]}"
    
    event = CalendarEvent(
        id=new_id,
        title=event_in.title.strip(),
        description=event_in.description.strip() if event_in.description else None,
        event_date=event_in.event_date,
        event_time=event_in.event_time,
        location=event_in.location,
        category=event_in.category,
        status=event_in.status,
        visibility=event_in.visibility,
        source="fastapi",
        created_at=now_str,
        updated_at=now_str
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
