import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Users,
  Compass,
  FileText,
  TrendingUp,
  Percent,
  ChevronRight,
  Award,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  SupervisorScorecardData,
  RegionalAuditMetric
} from './regionalAuditTypes';
import { formatAuditValue, getMetricBadgeLabel } from './regionalAuditUtils';
import { DEFAULT_DIAS_LABORABLES, DEFAULT_DIAS_TRANSCURRIDOS } from '../volumeQuotasData';

interface SupervisorScorecardPanelProps {
  scorecards: SupervisorScorecardData[];
  metric: RegionalAuditMetric;
  diasLaborables?: number;
  diasTranscurridos?: number;
  onSelectSupervisorForAudit: (supervisor: string) => void;
  onOpenNewCommitment: (supervisor: string) => void;
}

export const SupervisorScorecardPanel: React.FC<SupervisorScorecardPanelProps> = ({
  scorecards,
  metric,
  diasLaborables = DEFAULT_DIAS_LABORABLES,
  diasTranscurridos = DEFAULT_DIAS_TRANSCURRIDOS,
  onSelectSupervisorForAudit,
  onOpenNewCommitment
}) => {
  const metaAlDiaPct = Number(((diasTranscurridos / Math.max(1, diasLaborables)) * 100).toFixed(1));
  // Datos para gráfico comparativo
  const chartData = scorecards.map((s) => ({
    name: s.supervisor,
    Meta: Math.round(s.metaTotal),
    Real: Math.round(s.realTotal),
    Proyectado: Math.round(s.proyectadoEOMTotal),
    pct: s.pctCumplimientoTotal.toFixed(1)
  }));

  const getStatusBadge = (status: SupervisorScorecardData['auditStatus']) => {
    switch (status) {
      case 'en_norma':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> En Norma Operacional
          </span>
        );
      case 'observacion':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> En Observación Regional
          </span>
        );
      case 'alerta_critica':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert className="w-3.5 h-3.5" /> Alerta Crítica (Intervención)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Propósito de Auditoría */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-white/10 rounded-xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-red-500" />
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                Auditoría Comparativa de Supervisores: Johnatan Soto • Ali Perez • Nelson Finol
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-4xl">
              Evaluación de efectividad directiva en campo: cumplimiento de cuotas, dispersión de ventas,
              acompañamiento a vendedores rezagados y mitigación del efecto de concentración en clientes clave.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-400">Métrica:</span>
            <span className="px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 font-mono text-xs font-bold border border-red-500/30">
              {getMetricBadgeLabel(metric)}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico Comparativo Head-to-Head */}
      <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
              Comparativa de Volumen: Meta vs Real vs Proyección de Cierre EOM
            </h4>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-zinc-600 inline-block" /> Meta Asignada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-600 inline-block" /> Real Acumulado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Proyección EOM
            </span>
          </div>
        </div>

        <div className="h-60 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} />
              <YAxis stroke="#a1a1aa" fontSize={11} tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#3f3f46', borderRadius: '8px' }}
                itemStyle={{ color: '#f4f4f5' }}
                formatter={(val: any) => [formatAuditValue(Number(val), metric), '']}
              />
              <Bar dataKey="Meta" fill="#52525b" radius={[4, 4, 0, 0]} name="Meta Asignada" />
              <Bar dataKey="Real" fill="#dc2626" radius={[4, 4, 0, 0]} name="Real Acumulado" />
              <Bar dataKey="Proyectado" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Proyección EOM" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tarjetas Detalladas de Scorecard por Supervisor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {scorecards.map((s) => {
          const isJohnatan = s.supervisor === 'JOHNATAN SOTO';
          const isAli = s.supervisor === 'ALI PEREZ';
          return (
            <div
              key={s.supervisor}
              className="bg-zinc-950 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 hover:border-white/20 transition-all"
            >
              {/* Header del Supervisor */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center font-black text-red-400">
                      {isJohnatan ? 'JS' : isAli ? 'AP' : 'NF'}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white tracking-wide">
                        {s.supervisor}
                      </h4>
                      <p className="text-xs text-zinc-400 font-mono">
                        {s.sellersCount} Vendedores Asignados • Cartera Codizulca
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(s.auditStatus)}
                </div>
              </div>

              {/* Health Score & Resumen de Cuota */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Score */}
                <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Health Score Directivo
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black font-mono ${
                      s.healthScore >= 80 ? 'text-emerald-400' : s.healthScore >= 65 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {s.healthScore}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">/ 100 pts</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${
                        s.healthScore >= 80 ? 'bg-emerald-500' : s.healthScore >= 65 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${s.healthScore}%` }}
                    />
                  </div>
                </div>

                {/* % Cumplimiento */}
                <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/5 space-y-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    % Cumplimiento Actual
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black font-mono text-white">
                      {s.pctCumplimientoTotal.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      (Meta al corte: {metaAlDiaPct}%)
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold ${
                    s.pctCumplimientoTotal >= metaAlDiaPct ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {s.pctCumplimientoTotal >= metaAlDiaPct ? '▲ En ritmo proyectado' : '▼ Requiere aceleración'}
                  </span>
                </div>

                {/* Proyección EOM */}
                <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/5 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Proyección de Cierre
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black font-mono text-amber-400">
                      {formatAuditValue(s.proyectadoEOMTotal, metric)}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    Equivale a {s.pctProyectadoTotal.toFixed(1)}% de meta
                  </span>
                </div>
              </div>

              {/* Indicadores de Auditoría y Control del Equipo */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-3">
                <span className="text-xs font-black text-zinc-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-red-500" />
                  Salud de la Fuerza de Ventas ({s.sellersCount} Vendedores)
                </span>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                    <span className="text-xl font-black font-mono text-emerald-400">{s.vendedoresEnMeta}</span>
                    <span className="text-[10px] text-emerald-300 block font-bold">En Meta (≥100%)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20">
                    <span className="text-xl font-black font-mono text-amber-400">{s.vendedoresEnRiesgo}</span>
                    <span className="text-[10px] text-amber-300 block font-bold">En Riesgo (75-99%)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/20">
                    <span className="text-xl font-black font-mono text-red-400">{s.vendedoresCriticos}</span>
                    <span className="text-[10px] text-red-300 block font-bold">Críticos (&lt;75%)</span>
                  </div>
                </div>

                {/* Concentración y Dispersión */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-zinc-500" />
                    Concentración en Top 3 Vendedores:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">
                      {s.indiceDispersion.toFixed(1)}% del volumen
                    </span>
                    {s.alertaConcentracion && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                        ⚠️ Alerta Dependencia
                      </span>
                    )}
                  </div>
                </div>

                {/* Acompañamiento en ruta */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-zinc-500" />
                    Cobertura de Acompañamiento en Ruta:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">
                      {s.tasaAcompanamientoRuta.toFixed(0)}% del equipo
                    </span>
                    {s.vendedoresDesatendidos > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                        {s.vendedoresDesatendidos} rezagados (&gt;12d)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dictamen y Observaciones del Gerente Regional */}
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-white/10 space-y-1.5 text-xs">
                <span className="font-bold text-red-400 uppercase tracking-wider text-[11px] block">
                  Dictamen Oficial de la Gerencia Regional:
                </span>
                <p className="text-zinc-300 leading-relaxed italic">
                  "{s.observacionGerente}"
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Planes de Acción / Actas Pendientes:</span>
                  <strong className="text-white font-mono">{s.compromisosPendientes} actas activas</strong>
                </div>
              </div>

              {/* Acciones del Gerente Regional */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onSelectSupervisorForAudit(s.supervisor)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition-all active:scale-95"
                >
                  <Users className="w-4 h-4" />
                  <span>Auditar Vendedores de {s.supervisor.split(' ')[0]} (1-a-1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenNewCommitment(s.supervisor)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-white/10 transition-all active:scale-95"
                  title="Levantar acta de auditoría con compromisos obligatorios"
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Levantar Acta</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
