import React from 'react';
import { PaymentStatus, ProductionStatus, DeliveryStatus } from '../../types';
import { PAYMENT_STATUS_CONFIG, PRODUCTION_STATUS_CONFIG } from '../../utils/formatters';

export const PaymentBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const config = PAYMENT_STATUS_CONFIG[status] || PAYMENT_STATUS_CONFIG.pendente;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export const ProductionBadge: React.FC<{ status: ProductionStatus }> = ({ status }) => {
  const config = PRODUCTION_STATUS_CONFIG[status] || PRODUCTION_STATUS_CONFIG.aguardando_confirmacao;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg}`}>
      {config.label}
    </span>
  );
};

export const DeliveryBadge: React.FC<{ status: DeliveryStatus }> = ({ status }) => {
  const isDelivered = status === 'entregue';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isDelivered
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
      }`}
    >
      {isDelivered ? 'Entregue' : 'Não entregue'}
    </span>
  );
};

