import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Order } from '../../types';
import { api } from '../../services/api';
import { MessageCircle, Copy, ExternalLink, Check } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, order }) => {
  const [type, setType] = useState<'cobranca' | 'confirmacao' | 'entrega'>('cobranca');
  const [text, setText] = useState('');
  const [waLink, setWaLink] = useState('');
  const [hasPhone, setHasPhone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      setLoading(true);
      setCopied(false);
      api.getWhatsAppMessage(order.id, type)
        .then((res) => {
          setText(res.text);
          setWaLink(res.waLink);
          setHasPhone(res.hasPhone);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [order, type, isOpen]);

  if (!order) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    let cleanPhone = (order.member_phone || '').replace(/\D/g, '');
    if (cleanPhone && !cleanPhone.startsWith('55') && cleanPhone.length >= 10) {
      cleanPhone = '55' + cleanPhone;
    }
    const targetUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(targetUrl, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mensagem para WhatsApp"
      subtitle={`Contato com ${order.member_name}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Template Selector */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-2">
            Tipo de Mensagem
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('cobranca')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                type === 'cobranca'
                  ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-sm'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Lembrete de Pagamento
            </button>
            <button
              type="button"
              onClick={() => setType('confirmacao')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                type === 'confirmacao'
                  ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-sm'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Confirmação Pedido
            </button>
            <button
              type="button"
              onClick={() => setType('entrega')}
              className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                type === 'entrega'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              Pronta para Entrega
            </button>
          </div>
        </div>

        {/* Message preview / editor */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider">
              Conteúdo da Mensagem (Editável)
            </label>
            <span className="text-[11px] text-zinc-400">
              {hasPhone ? `Telefone: ${order.member_phone}` : 'Sem telefone cadastrado'}
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            disabled={loading}
            className="w-full p-3 text-xs border border-zinc-300 rounded-xl bg-white font-mono focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado leading-relaxed"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar Texto'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              Abrir no WhatsApp
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

