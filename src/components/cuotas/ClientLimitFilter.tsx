import React from 'react';

export type ClientLimit = 20 | 50 | 100 | 'ALL';

interface ClientLimitFilterProps {
  value: ClientLimit;
  onChange: (limit: ClientLimit) => void;
  className?: string;
  label?: string;
  totalAvailable?: number;
}

export const ClientLimitFilter: React.FC<ClientLimitFilterProps> = ({
  value,
  onChange,
  className = '',
  label = 'LÍMITE DE CLIENTES',
  totalAvailable,
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider select-none">
            {label}
          </span>
          {typeof totalAvailable === 'number' && (
            <span className="px-1.5 py-0.2 rounded-md bg-white/5 border border-white/10 text-[10px] text-zinc-400 font-mono">
              Total: {totalAvailable}
            </span>
          )}
        </div>
      )}
      <div className="inline-flex items-center gap-1 bg-black/80 border border-white/10 rounded-2xl p-1 shadow-inner backdrop-blur-md">
        <button
          type="button"
          onClick={() => onChange(20)}
          className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            value === 20
              ? 'bg-[#e00613] text-white shadow-[0_0_12px_rgba(224,6,19,0.45)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          title="Ver los primeros 20 clientes ordenados por mayor venta"
        >
          Top 20
        </button>

        <button
          type="button"
          onClick={() => onChange(50)}
          className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            value === 50
              ? 'bg-[#e00613] text-white shadow-[0_0_12px_rgba(224,6,19,0.45)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          title="Ver los primeros 50 clientes ordenados por mayor venta"
        >
          Top 50
        </button>

        <button
          type="button"
          onClick={() => onChange(100)}
          className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            value === 100
              ? 'bg-[#e00613] text-white shadow-[0_0_12px_rgba(224,6,19,0.45)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          title="Ver los primeros 100 clientes ordenados por mayor venta"
        >
          Top 100
        </button>

        <button
          type="button"
          onClick={() => onChange('ALL')}
          className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
            value === 'ALL'
              ? 'bg-[#e00613] text-white shadow-[0_0_12px_rgba(224,6,19,0.45)]'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
          title="Ver todos los clientes disponibles en el análisis"
        >
          {typeof totalAvailable === 'number' && totalAvailable < 100
            ? `Todos (${totalAvailable})`
            : 'Todos'}
        </button>
      </div>
    </div>
  );
};
