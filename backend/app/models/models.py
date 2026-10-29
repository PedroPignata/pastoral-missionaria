from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=True)
    role = Column(String, nullable=False, default="membro")  # admin, coordenador, delegado, membro, pendente
    google_id = Column(String, nullable=True)
    picture_url = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    default_price_cents = Column(Integer, nullable=False, default=4500)
    status = Column(String, default="ativa")
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    orders = relationship("Order", back_populates="campaign")


class Member(Base):
    __tablename__ = "members"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    orders = relationship("Order", back_populates="member")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    member_id = Column(String, ForeignKey("members.id"), nullable=False)
    status = Column(String, default="ativo")
    total_amount_cents = Column(Integer, nullable=False)
    paid_amount_cents = Column(Integer, default=0)
    balance_cents = Column(Integer, nullable=False)
    payment_status = Column(String, default="pendente")
    production_status = Column(String, default="aguardando_confirmacao")
    delivery_status = Column(String, default="nao_entregue")
    delivery_date = Column(String, nullable=True)
    delivered_to = Column(String, nullable=True)
    delivery_notes = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    member = relationship("Member", back_populates="orders")
    campaign = relationship("Campaign", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    product_name = Column(String, nullable=False)
    model = Column(String, nullable=False)
    size = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    unit_price_cents = Column(Integer, nullable=False)
    total_price_cents = Column(Integer, nullable=False)
    created_at = Column(String, nullable=False)

    order = relationship("Order", back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    member_id = Column(String, ForeignKey("members.id"), nullable=False)
    amount_cents = Column(Integer, nullable=False)
    payment_date = Column(String, nullable=False)
    payment_method = Column(String, nullable=False)
    recorded_by = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    is_reversed = Column(Integer, default=0)
    reversal_reason = Column(Text, nullable=True)
    reversed_at = Column(String, nullable=True)
    reversed_by = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    order = relationship("Order", back_populates="payments")


class PastoralMember(Base):
    __tablename__ = "pastoral_members"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=True)
    buyer_member_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    status = Column(String, default="ativo")  # ativo, inativo, pendente
    pastoral_role = Column(String, default="membro")  # coordenador, delegado, membro
    joined_at = Column(String, nullable=True)
    qualifications_json = Column(Text, default='["Intercessão"]')
    skills_json = Column(Text, default='[]')
    availability_json = Column(Text, default='{}')
    welcome_checklist_json = Column(Text, default='{}')
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id = Column(String, primary_key=True)
    external_stable_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(String, nullable=False)
    event_time = Column(String, nullable=True)
    location = Column(String, nullable=True)
    category = Column(String, default="Reuniões")
    status = Column(String, default="Planejado")
    visibility = Column(String, default="publico")
    responsibles_json = Column(Text, default="[]")
    materials_json = Column(Text, default="[]")
    notes = Column(Text, nullable=True)
    source = Column(String, default="manual")
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)


class LabTheme(Base):
    __tablename__ = "lab_themes"

    id = Column(String, primary_key=True)
    theme_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, default="Geral")
    active = Column(Integer, default=1)


class PreachingLab(Base):
    __tablename__ = "preaching_labs"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    lab_date = Column(String, nullable=False)
    duration_minutes = Column(Integer, default=15)
    status = Column(String, default="planejado")
    draw_results_json = Column(Text, default="[]")
    notes = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)


class LabEvaluation(Base):
    __tablename__ = "lab_evaluations"

    id = Column(String, primary_key=True)
    lab_id = Column(String, nullable=True)
    lab_date = Column(String, nullable=False)
    speaker_name = Column(String, nullable=False)
    theme_title = Column(String, nullable=False)
    evaluator_name = Column(String, default="Coordenação")
    crit_dominio_assunto = Column(String, default="Sim")
    crit_abordagem_tema = Column(String, default="Sim")
    crit_objetividade = Column(String, default="Sim")
    crit_cumprimento_tempo = Column(String, default="Sim")
    crit_embasamento_biblico = Column(String, default="Sim")
    crit_interacao = Column(String, default="Sim")
    crit_testemunho = Column(String, default="Sim")
    crit_oracao = Column(String, default="Sim")
    comments = Column(Text, nullable=True)
    suggested_future_themes = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)


class DispatchRequest(Base):
    __tablename__ = "dispatch_requests"

    id = Column(String, primary_key=True)
    requester_name = Column(String, nullable=False)
    pastoral_member_id = Column(String, nullable=True)
    event_name = Column(String, nullable=False)
    event_date = Column(String, nullable=False)
    event_time = Column(String, nullable=True)
    location = Column(String, nullable=False)
    organization = Column(String, nullable=True)
    participation_type = Column(String, nullable=True)
    role_function = Column(String, nullable=True)
    theme = Column(String, nullable=True)
    recipient = Column(String, nullable=True)
    status = Column(String, default="pendente")
    notes = Column(Text, nullable=True)
    coordinator_feedback = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)


class EventTemplate(Base):
    __tablename__ = "event_templates"

    id = Column(String, primary_key=True)
    slug = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    target_audience = Column(String, nullable=False)
    objective = Column(Text, nullable=False)
    suggested_theme = Column(String, nullable=True)
    schedule_json = Column(Text, default="[]")
    teams_json = Column(Text, default="[]")
    guidelines = Column(Text, nullable=True)
    source_reference = Column(String, nullable=True)


class CoordinationSuccession(Base):
    __tablename__ = "coordination_succession"

    id = Column(String, primary_key=True)
    coordinator_name = Column(String, nullable=False)
    role_title = Column(String, nullable=False)
    status = Column(String, default="ativo")
    proposed_by = Column(String, nullable=False)
    started_at = Column(String, nullable=False)
    ended_at = Column(String, nullable=True)
    checklist_json = Column(Text, default="{}")
    notes = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, default="Geral")
    audience = Column(String, default="todos")
    pinned = Column(Integer, default=0)
    author_name = Column(String, default="Coordenação")
    expires_at = Column(String, nullable=True)
    created_at = Column(String, nullable=False)


# 32-36. Comunidade Missionária (Feed Social Interno)
class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(String, primary_key=True)
    author_id = Column(String, nullable=False)
    author_name = Column(String, nullable=False)
    author_photo = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    category = Column(String, default="Partilha")
    image_url = Column(String, nullable=True)
    link_url = Column(String, nullable=True)
    pinned = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    is_hidden = Column(Integer, default=0)
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id = Column(String, primary_key=True)
    post_id = Column(String, ForeignKey("community_posts.id"), nullable=False)
    author_id = Column(String, nullable=False)
    author_name = Column(String, nullable=False)
    author_photo = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(String, nullable=False)


class CommunityLike(Base):
    __tablename__ = "community_likes"

    id = Column(String, primary_key=True)
    post_id = Column(String, ForeignKey("community_posts.id"), nullable=False)
    user_id = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
