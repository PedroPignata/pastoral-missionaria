from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field

# Auth & User
class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleLoginRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    google_id: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    needs_onboarding: Optional[bool] = False

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    role: str
    picture_url: Optional[str] = None
    google_id: Optional[str] = None
    created_at: str

# Members
class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    display_name: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    active: int = 1

class PastoralMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    user_id: Optional[str] = None
    buyer_member_id: Optional[str] = None
    name: str
    display_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    status: str
    pastoral_role: str
    qualifications_json: str
    skills_json: str
    created_at: str

# Orders & Camisetas
class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    product_name: str
    model: str
    size: str
    quantity: int
    unit_price_cents: int
    total_price_cents: int

class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    campaign_id: str
    member_id: str
    status: str
    total_amount_cents: int
    paid_amount_cents: int
    balance_cents: int
    payment_status: str
    production_status: str
    delivery_status: str
    delivery_date: Optional[str] = None
    delivered_to: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    items: List[OrderItemOut] = []

# Calendar Events
class CalendarEventCreate(BaseModel):
    title: str
    event_date: str
    event_time: Optional[str] = None
    location: Optional[str] = None
    category: str = "Reuniões"
    status: str = "Planejado"
    visibility: str = "publico"
    description: Optional[str] = None

class CalendarEventOut(CalendarEventCreate):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: str
    updated_at: str

# Preaching Labs
class LabThemeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    theme_number: int
    title: str
    category: Optional[str] = "Geral"
    active: int = 1

class LabThemeCreate(BaseModel):
    title: str
    description: Optional[str] = None

class LabEvaluationCreate(BaseModel):
    lab_id: Optional[str] = None
    lab_date: str
    speaker_name: str
    theme_title: str
    crit_dominio_assunto: str = "Sim"
    crit_abordagem_tema: str = "Sim"
    crit_objetividade: str = "Sim"
    crit_cumprimento_tempo: str = "Sim"
    crit_embasamento_biblico: str = "Sim"
    crit_interacao: str = "Sim"
    crit_testemunho: str = "Sim"
    crit_oracao: str = "Sim"
    comments: Optional[str] = None
    suggested_future_themes: Optional[str] = None

class DrawRequest(BaseModel):
    title: Optional[str] = "Laboratório de Pregação"
    lab_date: Optional[str] = None
    duration_minutes: int = 15
    speakers: List[str]
    notes: Optional[str] = None
    draw_mode: str = "order_and_theme"  # order_and_theme | order_only

# Missions & Dispatches
class DispatchRequestCreate(BaseModel):
    requester_name: str
    pastoral_member_id: Optional[str] = None
    event_name: str
    event_date: str
    event_time: Optional[str] = None
    location: str
    organization: Optional[str] = None
    participation_type: Optional[str] = "Pregação"
    role_function: Optional[str] = None
    theme: Optional[str] = None
    recipient: Optional[str] = None
    notes: Optional[str] = None

# Community Feed (32-36)
class CommunityPostCreate(BaseModel):
    content: str
    category: Optional[str] = "Partilha"
    image_url: Optional[str] = None
    link_url: Optional[str] = None

class CommunityCommentCreate(BaseModel):
    content: str

class CommunityPostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    author_id: str
    author_name: str
    author_photo: Optional[str] = None
    content: str
    category: str
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    pinned: int = 0
    likes_count: int = 0
    comments_count: int = 0
    created_at: str

