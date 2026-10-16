import React, { useState } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Maximize2,
} from 'lucide-react';
import { ParetoInsightsData, ParetoDimension, ParetoMetric, Pareto360Mode } from './paretoTypes';

interface ParetoInsightsPanelProps {
  insights: ParetoInsightsData | null;
  dimension: ParetoDimension;
  metric: ParetoMetric;
  currentFilterInsight: string;
  onFilterInsightChange: (filter: string) => void;
  onOpenActionPlan: () => void;
  onOpen360: (mode: Pareto360Mode) => void;
}

export const ParetoInsightsPanel: React.FC<ParetoInsightsPanelProps> = ({
  insights,
  dimension,
  currentFilterInsight,
  onFilterInsightChange,
  onOpenActionPlan,
  onOpen360,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!insights) return null;

  return (
    <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
      {/* Encabezado colapsable compacto sin texto redundante */}
      <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <h3 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
            Riesgos y Oportunidades (Insights)
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
            AUDITORÍA ACTIVA
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón a Plan de Acción Operativa */}
          <button
            type="button"
            onClick={onOpenActionPlan}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 active:scale-95 cursor-pointer"
            title="Abrir Plan de Acción Táctico Operativo"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Plan Operativo de Campo</span>
            <span className="sm:hidden">Plan Campo</span>
          </button>

          {/* Toggle Expandir / Colapsar */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Ocultar Insights' : 'Mostrar Insights'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Contenido de Insights: 3 Tarjetas con Métricas Grandes y sin Párrafos Largos */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Alerta de Clientes VIP en Riesgo */}
          <div
            onClick={() => onOpen360('AT_RISK')}
            className={`group cursor-pointer p-3.5 sm:p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
              currentFilterInsight === 'AT_RISK'
                ? 'bg-red-950/40 border-red-500 shadow-xl shadow-red-500/15'
                : 'bg-zinc-900/40 border-red-500/20 hover:border-red-500/60 hover:bg-red-950/20 hover:shadow-lg hover:shadow-red-500/10'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-red-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                  Alerta de Fuga (Clase A)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-300 border border-red-500/30">
                  URGENTE
                </span>
              </div>

              {/* Métrica Grande */}
              <div className="flex items-baseline gap-2.5 my-1">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight group-hover:text-red-300 transition-colors">
                  {insights.vipAtRiskCount}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-red-400 leading-tight">
                    {dimension === 'clientes' ? 'Cuentas VIP' : 'Entidades A'}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">con caída &gt; 50%</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilterInsightChange(currentFilterInsight === 'AT_RISK' ? 'ALL' : 'AT_RISK');
                }}
                className="font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {currentFilterInsight === 'AT_RISK' ? 'Quitar filtro' : 'Filtrar en tabla'}
              </button>

              <span className="font-bold text-red-400 group-hover:text-red-300 flex items-center gap-1 transition-colors">
                <span>Ver 360°</span>
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 2. Concentración de Cartera */}
          <div
            onClick={() => onOpen360('CONCENTRATION')}
            className="group cursor-pointer p-3.5 sm:p-4 rounded-xl border bg-zinc-900/40 border-white/10 hover:border-amber-500/60 hover:bg-amber-950/20 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  Concentración de Cartera
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${
                    insights.concentrationLevel === 'ALTA'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  RIESGO {insights.concentrationLevel}
                </span>
              </div>

              {/* Métricas Grandes en Grid */}
              <div className="grid grid-cols-3 gap-1.5 py-1 text-center bg-black/50 p-2 rounded-xl border border-white/5 my-1">
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Top 1</span>
                  <span className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-300 transition-colors">
                    {insights.top1Pct}%
                  </span>
                </div>
                <div className="border-x border-white/5">
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Top 3</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-400">
                    {insights.top3Pct}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Top 10</span>
                  <span className="text-xl sm:text-2xl font-black text-red-400">
                    {insights.top10Pct}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end pt-2 border-t border-white/5 text-xs">
              <span className="font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1 transition-colors">
                <span>Ver 360°</span>
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* 3. Cuentas de Alto Potencial */}
          <div
            onClick={() => onOpen360('GROWTH')}
            className={`group cursor-pointer p-3.5 sm:p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
              currentFilterInsight === 'GROWTH_OPPORTUNITY'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-xl shadow-emerald-500/15'
                : 'bg-zinc-900/40 border-emerald-500/20 hover:border-emerald-500/60 hover:bg-emerald-950/20 hover:shadow-lg hover:shadow-emerald-500/10'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  Cuentas de Alto Potencial
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  CRECIMIENTO
                </span>
              </div>

              {/* Métrica Grande */}
              <div className="flex items-baseline gap-2.5 my-1">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                  {insights.growthOpportunityCount}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-emerald-400 leading-tight">
                    {dimension === 'clientes' ? 'Cuentas Clase B' : 'Entidades B'}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">en aceleración</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilterInsightChange(
                    currentFilterInsight === 'GROWTH_OPPORTUNITY' ? 'ALL' : 'GROWTH_OPPORTUNITY'
                  );
                }}
                className="font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {currentFilterInsight === 'GROWTH_OPPORTUNITY' ? 'Quitar filtro' : 'Filtrar en tabla'}
              </button>

              <span className="font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1 transition-colors">
                <span>Ver 360°</span>
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
