from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, require_role
from backend.app.models.models import Order, PastoralMember
from backend.app.schemas.schemas import OrderOut

router = APIRouter(prefix="/orders", tags=["Camisetas e Pedidos"])

@router.get("/", response_model=List[OrderOut])
def list_all_orders(
    current_user: dict = Depends(require_role(["admin", "coordenador"])),
    db: Session = Depends(get_db)
):
    """
    Acesso restrito exclusivamente para Coordenadores e Administradores.
    Membros comuns são bloqueados com HTTP 403.
    """
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    return orders

@router.get("/my-order", response_model=Optional[OrderOut])
def get_my_order(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna com privacidade exclusivamente o pedido do membro logado.
    """
    # Find linked pastoral member record
    pmem = db.query(PastoralMember).filter(PastoralMember.user_id == current_user["id"]).first()
    if not pmem or not pmem.buyer_member_id:
        return None
        
    order = db.query(Order).filter(Order.member_id == pmem.buyer_member_id).first()
    return order

@router.get("/{order_id}", response_model=OrderOut)
def get_order_by_id(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
        
    is_coord = current_user.get("role") in ["admin", "coordenador"]
    if not is_coord:
        pmem = db.query(PastoralMember).filter(PastoralMember.user_id == current_user["id"]).first()
        if not pmem or pmem.buyer_member_id != order.member_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para visualizar o pedido de outro membro."
            )
            
    return order
