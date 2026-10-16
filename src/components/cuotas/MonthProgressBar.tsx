import React from 'react';
import { Calendar, Share2, ShieldCheck } from 'lucide-react';

export type MainTab = 'activacion' | 'volumen' | 'pareto';
export type ViewLevel = 'vendedor' | 'supervisores' | 'gerente';

interface MonthProgressBarProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  activeView: ViewLevel;
  onViewChange: (view: ViewLevel) => void;
  onShare: () => void;
  diasLaborables?: number;
  diasTranscurridos?: number;
}

export const MonthProgressBar: React.FC<MonthProgressBarProps> = ({
  activeTab,
  onTabChange,
  activeView,
  onViewChange,
  onShare,
  diasLaborables = 26,
  diasTranscurridos = 15,
}) => {
  const porcentaje = Number(((diasTranscurridos / diasLaborables) * 100).toFixed(1));

  return (
    <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3.5 sm:p-4 shadow-xl space-y-4">
      {/* Top Header: Progreso del Mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-red-500 shrink-0" />
          <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Progreso del Mes
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm text-zinc-400">
          <div>
            <span>Días Laborables: </span>
            <strong className="text-white font-bold">{diasLaborables}</strong>
          </div>
          <div>
            <span>Transcurridos: </span>
            <strong className="text-white font-bold">{diasTranscurridos}</strong>
          </div>
          <div>
            <span>Recorrido: </span>
            <strong className="text-red-500 font-bold">{porcentaje}%</strong>
          </div>

          {/* Progress Bar */}
          <div className="w-24 sm:w-28 h-2.5 bg-zinc-800 rounded-full overflow-hidden shrink-0">
            <div
              className="bg-red-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Subtabs & Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
        {/* Subpestañas del Módulo */}
        <div className="inline-flex items-center p-1 bg-black/50 border border-white/10 rounded-lg text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => onTabChange('activacion')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'activacion'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Activación
          </button>
          <button
            type="button"
            onClick={() => onTabChange('volumen')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'volumen'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Volumen
          </button>
          <button
            type="button"
            onClick={() => onTabChange('pareto')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-md font-bold transition-all ${
              activeTab === 'pareto'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pareto
          </button>
        </div>

        {/* Nivel de Vista */}
        <div className="inline-flex items-center p-1 bg-black/50 border border-white/10 rounded-lg text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => onViewChange('vendedor')}
            className={`px-3 sm:px-4 py-1.5 rounded-md font-bold transition-all ${
              activeView === 'vendedor'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Por Vendedor
          </button>
          <button
            type="button"
            onClick={() => onViewChange('supervisores')}
            className={`px-3 sm:px-4 py-1.5 rounded-md font-bold transition-all ${
              activeView === 'supervisores'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Consolidado (Supervisores)
          </button>
          <button
            type="button"
            onClick={() => onViewChange('gerente')}
            className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-md font-bold transition-all ${
              activeView === 'gerente'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Gerente Regional</span>
          </button>
        </div>

        {/* Compartir Button */}
        <button
          type="button"
          onClick={onShare}
          className="inline-flex items-center gap-2 bg-[#00a854] hover:bg-[#009248] text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-lg shadow-md transition-all active:scale-95 shrink-0"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartir</span>
        </button>
      </div>
    </div>
  );
};
