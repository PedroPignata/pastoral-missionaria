import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, AuthenticatedRequest } from './auth.js';

export const whatsappRouter = Router();

// GET /api/whatsapp/message/:order_id
whatsappRouter.get('/message/:order_id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { order_id } = req.params;
  const { type = 'cobranca' } = req.query; // 'cobranca' | 'confirmacao' | 'entrega'

  const order = db.prepare(`
    SELECT o.*, m.name as member_name, m.phone as member_phone, oi.model, oi.size
    FROM orders o
    JOIN members m ON m.id = o.member_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = ?
  `).get(order_id) as any;

  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  const settingsRow = db.prepare('SELECT value_json FROM integration_settings WHERE key = ?').get('institutional') as any;
  const settings = settingsRow ? JSON.parse(settingsRow.value_json) : { pix_key: 'pastoralmissionaria@agape.org.br' };

  const firstName = order.member_name.split(' ')[0];
  const balanceStr = (order.balance_cents / 100).toFixed(2).replace('.', ',');
  const totalStr = (order.total_amount_cents / 100).toFixed(2).replace('.', ',');
  const pixKey = settings.pix_key || 'Chave Pix da pastoral';

  let text = '';

  if (type === 'cobranca') {
    text = `Olá, ${firstName}! Tudo bem?\n\nPassando para lembrar com carinho sobre o pagamento da camiseta oficial da *Pastoral Missionária* (${order.model} tamanho ${order.size}).\n\nO valor pendente é de *R$ ${balanceStr}*.\n\n*Chave Pix:* ${pixKey}\n\nAssim que realizar o pagamento, por favor nos envie o comprovante para darmos baixa no sistema. Qualquer dúvida, pode me chamar. Deus abençoe! 🙏✨`;
  } else if (type === 'confirmacao') {
    text = `Paz e bem, ${firstName}! Tudo bem?\n\nSeu pedido da camiseta oficial da *Pastoral Missionária* foi confirmado com sucesso!\n\n• Modelo: *${order.model}*\n• Tamanho: *${order.size}*\n• Valor Total: *R$ ${totalStr}*\n• Saldo Pendente: *R$ ${balanceStr}*\n\nEstamos acompanhando a produção e te avisaremos assim que as camisetas chegarem. Deus abençoe sua missão! 🕊️🤎`;
  } else if (type === 'entrega') {
    text = `A paz de Cristo, ${firstName}! Boas notícias! 🎉\n\nSua camiseta oficial da *Pastoral Missionária* (${order.model} tam. ${order.size}) já está pronta para retirada!\n\nVocê pode pegar na próxima reunião ou combinar com a coordenação.\n\n"Uma só coisa é necessária: Estar perto de Jesus." — São Padre Pio 🙏`;
  }

  // Clean phone number for WhatsApp link
  let phoneClean = (order.member_phone || '').replace(/\D/g, '');
  if (phoneClean && !phoneClean.startsWith('55') && phoneClean.length >= 10) {
    phoneClean = '55' + phoneClean;
  }

  const waLink = phoneClean
    ? `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  return res.json({
    memberName: order.member_name,
    memberPhone: order.member_phone,
    text,
    waLink,
    hasPhone: Boolean(phoneClean),
  });
});

