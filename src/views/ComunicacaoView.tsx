import React, { useState, useMemo } from 'react';
import { Order, Member } from '../types';
import { formatCurrency } from '../utils/formatters';
import { MessageCircle, Copy, Check, ExternalLink, Send, HeartHandshake } from 'lucide-react';

interface ComunicacaoViewProps {
  orders: Order[];
  members: Member[];
}

export const ComunicacaoView: React.FC<ComunicacaoViewProps> = ({ orders, members }) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [messageType, setMessageType] = useState<'cobranca' | 'confirmacao' | 'entrega'>('cobranca');
  const [copied, setCopied] = useState(false);

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || orders[0];
  }, [orders, selectedOrderId]);

  const messageText = useMemo(() => {
    if (!selectedOrder) return '';
    const firstName = selectedOrder.member_name.split(' ')[0];
    const firstItem = selectedOrder.items[0] || { model: 'Tradicional', size: 'M' };
    const balanceStr = (selectedOrder.balance_cents / 100).toFixed(2).replace('.', ',');
    const totalStr = (selectedOrder.total_amount_cents / 100).toFixed(2).replace('.', ',');

    if (messageType === 'cobranca') {
      return `Olá, ${firstName}! Tudo bem?\n\nPassando para lembrar com carinho sobre o pagamento da camiseta oficial da *Pastoral Missionária* (${firstItem.model} tamanho ${firstItem.size}).\n\nO valor pendente é de *R$ ${balanceStr}*.\n\n*Chave Pix:* pastoralmissionaria@agape.org.br\n\nAssim que realizar o pagamento, por favor nos envie o comprovante para darmos baixa no sistema. Qualquer dúvida, pode me chamar. Deus abençoe! 🙏✨`;
    }

    if (messageType === 'confirmacao') {
      return `Paz e bem, ${firstName}! Tudo bem?\n\nSeu pedido da camiseta oficial da *Pastoral Missionária* foi confirmado com sucesso!\n\n• Modelo: *${firstItem.model}*\n• Tamanho: *${firstItem.size}*\n• Quantidade: *${selectedOrder.items.reduce((acc, it) => acc + it.quantity, 0)}*\n• Valor Total: *R$ ${totalStr}*\n• Saldo Pendente: *R$ ${balanceStr}*\n\nEstamos acompanhando a produção e te avisaremos assim que as camisetas chegarem. Deus abençoe sua missão! 🕊️🤎`;
    }

    return `A paz de Cristo, ${firstName}! Boas notícias! 🎉\n\nSua camiseta oficial da *Pastoral Missionária* (${firstItem.model} tam. ${firstItem.size}) já está pronta para retirada!\n\nVocê pode pegar na próxima reunião da pastoral ou combinar com a coordenação.\n\n"Uma só coisa é necessária: Estar perto de Jesus." — São Padre Pio 🙏`;
  }, [selectedOrder, messageType]);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (!selectedOrder) return;
    let cleanPhone = (selectedOrder.member_phone || '').replace(/\D/g, '');
    if (cleanPhone && !cleanPhone.startsWith('55') && cleanPhone.length >= 10) {
      cleanPhone = '55' + cleanPhone;
    }
    const targetUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(targetUrl, '_blank');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-emerald-600" />
          Central de Mensagens para WhatsApp
        </h2>
        <p className="text-xs text-zinc-500">
          Gere mensagens gentis e pastorais com dados reais de pagamentos, modelos e tamanhos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Member & Template Selector */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-2">
              1. Selecione o Membro
            </label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full p-2.5 text-xs font-medium border border-zinc-300 rounded-xl bg-white"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.member_name} — Pendente: {formatCurrency(o.balance_cents)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-2">
              2. Modelo de Mensagem
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMessageType('cobranca')}
                className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all ${
                  messageType === 'cobranca'
                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-xs'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                }`}
              >
                Lembrete Amigável de Pagamento
              </button>

              <button
                type="button"
                onClick={() => setMessageType('confirmacao')}
                className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all ${
                  messageType === 'confirmacao'
                    ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                }`}
              >
                Confirmação de Pedido
              </button>

              <button
                type="button"
                onClick={() => setMessageType('entrega')}
                className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all ${
                  messageType === 'entrega'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                    : 'border-zinc-200 hover:bg-zinc-50 text-zinc-600'
                }`}
              >
                Aviso de Camiseta Pronta
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Message Preview and Actions */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-pastoral-cafe">
                Pré-visualização da Mensagem
              </h3>
              <span className="text-[11px] text-zinc-400">
                {selectedOrder?.member_phone ? `Envio para ${selectedOrder.member_phone}` : 'Sem telefone salvo'}
              </span>
            </div>

            <div className="p-4 bg-pastoral-creme/50 rounded-xl border border-pastoral-dourado/30 text-xs font-mono whitespace-pre-line leading-relaxed text-pastoral-cafe">
              {messageText}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado para Área de Transferência!' : 'Copiar Mensagem'}
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              Enviar pelo WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

