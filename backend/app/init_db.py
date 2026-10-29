from backend.app.core.database import engine, Base, SessionLocal
from backend.app.models.models import Member, Order, Campaign, CalendarEvent, LabTheme

def init_models():
    # create_all is additive: it only creates tables if they do not exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        orders_count = db.query(Order).count()
        members_count = db.query(Member).count()
        campaigns_count = db.query(Campaign).count()
        events_count = db.query(CalendarEvent).count()
        themes_count = db.query(LabTheme).count()
        
        print("=== VERIFICAÇÃO DE MODELOS SQLALCHEMY ===")
        print(f"✓ Membros cadastrados: {members_count}")
        print(f"✓ Pedidos cadastrados: {orders_count}")
        print(f"✓ Campanhas: {campaigns_count}")
        print(f"✓ Eventos do Calendário: {events_count}")
        print(f"✓ Temas de Laboratório: {themes_count}")
        
        # Verify 19 orders and 85500 cents
        from sqlalchemy import func
        total_cents = db.query(func.sum(Order.total_amount_cents)).scalar() or 0
        print(f"✓ Valor Total em Centavos: {total_cents} (R$ {total_cents / 100:.2f})")
        
        if orders_count == 19 and total_cents == 85500:
            print("🎉 PARIDADE DE DADOS SQLALCHEMY 100% CONFIRMADA!")
        else:
            print("AVISO: Totais divergentes do esperado")
    finally:
        db.close()

if __name__ == "__main__":
    init_models()
