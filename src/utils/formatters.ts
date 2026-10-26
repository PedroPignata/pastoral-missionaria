import { PaymentStatus, ProductionStatus, DeliveryStatus, PaymentMethod } from '../types';

export function formatCurrency(cents: number | undefined | null): string {
  if (cents === undefined || cents === null || isNaN(cents)) return 'R$ 0,00';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '-';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

export const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  pago: {
    label: 'Pago Integral',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
  },
  parcial: {
    label: 'Pagamento Parcial',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
  },
  pendente: {
    label: 'Pendente',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500',
  },
};

export const PRODUCTION_STATUS_CONFIG: Record<
  ProductionStatus,
  { label: string; bg: string; text: string; step: number }
> = {
  aguardando_confirmacao: {
    label: 'Aguardando Confirmação',
    bg: 'bg-slate-100 text-slate-700',
    text: 'text-slate-700',
    step: 1,
  },
  confirmado: {
    label: 'Confirmado',
    bg: 'bg-blue-100 text-blue-800',
    text: 'text-blue-800',
    step: 2,
  },
  encomendado: {
    label: 'Encomendado',
    bg: 'bg-indigo-100 text-indigo-800',
    text: 'text-indigo-800',
    step: 3,
  },
  em_producao: {
    label: 'Em Produção',
    bg: 'bg-amber-100 text-amber-900',
    text: 'text-amber-900',
    step: 4,
  },
  recebido: {
    label: 'Recebido pela Pastoral',
    bg: 'bg-purple-100 text-purple-900',
    text: 'text-purple-900',
    step: 5,
  },
  entregue: {
    label: 'Entregue ao Membro',
    bg: 'bg-emerald-100 text-emerald-800',
    text: 'text-emerald-800',
    step: 6,
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-zinc-200 text-zinc-600',
    text: 'text-zinc-600',
    step: 0,
  },
};

export const PAYMENT_METHODS_MAP: Record<PaymentMethod, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência Bancária',
  outro: 'Outro',
};

