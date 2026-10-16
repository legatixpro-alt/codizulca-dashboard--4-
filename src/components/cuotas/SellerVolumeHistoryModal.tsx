import React, { useState, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Package,
  DollarSign,
  Scale,
  Calendar,
  Award,
  FileText,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { getSellerMetadata } from './sellerSupervisorMap';
import { getSellerVolumeQuota, DEFAULT_DIAS_LABORABLES, DEFAULT_DIAS_TRANSCURRIDOS } from './volumeQuotasData';

export type MetricType = 'cajas' | 'monto' | 'kgs';

const MONTH_ORDER = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

const SHORT_MONTHS: Record<string, string> = {
  ENERO: 'ENE',
  FEBRERO: 'FEB',
  MARZO: 'MAR',
  ABRIL: 'ABR',
  MAYO: 'MAY',
  JUNIO: 'JUN',
  JULIO: 'JUL',
  AGOSTO: 'AGO',
  SEPTIEMBRE: 'SEP',
  OCTUBRE: 'OCT',
  NOVIEMBRE: 'NOV',
  DICIEMBRE: 'DIC',
};

interface SellerVolumeHistoryModalProps {
  sellerName: string | null;
  isOpen: boolean;
  onClose: () => void;
  rawSellerMonthlyData: any[];
  currentMetric?: MetricType;
}

export const SellerVolumeHistoryModal: React.FC<SellerVolumeHistoryModalProps> = ({
  sellerName,
  isOpen,
  onClose,
  rawSellerMonthlyData,
  currentMetric = 'kgs',
}) => {
  const [metric, setMetric] = useState<MetricType>(currentMetric);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Metadata del vendedor
  const metadata = useMemo(() => {
    if (!sellerName) return { supervisor: 'N/A', zona: 'N/A', region: 'N/A' };
    return getSellerMetadata(sellerName);
  }, [sellerName]);

  // Historial de meses del vendedor
  const monthlyHistory = useMemo(() => {
    if (!sellerName || !rawSellerMonthlyData || !rawSellerMonthlyData.length) return [];

    const normTarget = sellerName.trim().toUpperCase();
    const rows = rawSellerMonthlyData.filter(
      (r) => r.vendedor && r.vendedor.trim().toUpperCase() === normTarget
    );

    // Ordenar cronológicamente
    rows.sort((a, b) => MONTH_ORDER.indexOf(a.mes) - MONTH_ORDER.indexOf(b.mes));

    const quotaKgs = getSellerVolumeQuota(sellerName, 'kgs');
    const quotaCajas = getSellerVolumeQuota(sellerName, 'cajas');
    const quotaMonto = getSellerVolumeQuota(sellerName, 'monto');

    return rows.map((r, idx) => {
      const prev = idx > 0 ? rows[idx - 1] : null;

      let valPrev = 0;
      let valCurr = 0;

      if (metric === 'cajas') {
        valCurr = r.cajas || 0;
        valPrev = prev ? prev.cajas || 0 : 0;
      } else if (metric === 'monto') {
        valCurr = r.montoNeto || 0;
        valPrev = prev ? prev.montoNeto || 0 : 0;
      } else {
        valCurr = r.kgs || 0;
        valPrev = prev ? prev.kgs || 0 : 0;
      }

      const diff = valCurr - valPrev;
      const momPct = valPrev > 0 ? ((valCurr - valPrev) / valPrev) * 100 : 0;

      const activeQuota = metric === 'cajas' ? quotaCajas : metric === 'monto' ? quotaMonto : quotaKgs;
      const pctCumplimiento = activeQuota > 0 ? (valCurr / activeQuota) * 100 : 0;

      return {
        mes: r.mes,
        shortMes: SHORT_MONTHS[r.mes] || r.mes,
        ano: r.ano || 2026,
        cajas: r.cajas || 0,
        cajasFA: r.cajasFA || 0,
        cajasDV: r.cajasDV || 0,
        kgs: r.kgs || 0,
        montoNeto: r.montoNeto || 0,
        montoFA: r.montoFA || 0,
        montoDV: r.montoDV || 0,
        facturasCount: r.facturasCount || 0,
        valCurr,
        valPrev,
        diff,
        momPct: Number(momPct.toFixed(1)),
        quota: activeQuota,
        pctCumplimiento: Number(pctCumplimiento.toFixed(1)),
      };
    });
  }, [sellerName, rawSellerMonthlyData, metric]);

  // Resumen / KPIs acumulados
  const summaryKpis = useMemo(() => {
    if (!monthlyHistory.length) {
      return {
        total: 0,
        promedio: 0,
        maxMes: null,
        totalFacturas: 0,
        totalKgs: 0,
        totalCajas: 0,
        totalMonto: 0,
      };
    }

    let tot = 0;
    let maxVal = -Infinity;
    let bestMes = '';
    let totFacturas = 0;
    let totKgs = 0;
    let totCajas = 0;
    let totMonto = 0;

    monthlyHistory.forEach((m) => {
      tot += m.valCurr;
      totFacturas += m.facturasCount;
      totKgs += m.kgs;
      totCajas += m.cajas;
      totMonto += m.montoNeto;

      if (m.valCurr > maxVal) {
        maxVal = m.valCurr;
        bestMes = m.mes;
      }
    });

    return {
      total: tot,
      promedio: tot / monthlyHistory.length,
      maxMes: { mes: bestMes, val: maxVal },
      totalFacturas: totFacturas,
      totalKgs: totKgs,
      totalCajas: totCajas,
      totalMonto: totMonto,
    };
  }, [monthlyHistory]);

  if (!isOpen || !sellerName) return null;

  const formatUnit = (val: number, type: MetricType = metric) => {
    if (type === 'monto') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(val);
    }
    return (
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0,
      }).format(val) + (type === 'cajas' ? ' cj' : ' kg')
    );
  };

  const metricLabel = metric === 'kgs' ? 'Kgs' : metric === 'cajas' ? 'Cajas' : 'Monto ($)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-white/15 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-zinc-900/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-base shadow-inner">
              {sellerName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  {sellerName}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-white/10 text-[11px] font-semibold text-zinc-300">
                  Historial de Volumen
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                <span>
                  Supervisor: <strong className="text-zinc-200">{metadata.supervisor}</strong>
                </span>
                <span>•</span>
                <span>
                  Zona: <strong className="text-zinc-200">{metadata.zona}</strong>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  Región: <strong className="text-zinc-300">{metadata.region}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* BARRA DE HERRAMIENTAS: SELECTOR DE MÉTRICA */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/50 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Métrica de Análisis:
              </span>
              <div className="inline-flex items-center p-1 bg-black/60 border border-white/10 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setMetric('kgs')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                    metric === 'kgs' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Kgs / Lts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetric('cajas')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                    metric === 'cajas' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Cajas (cj)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetric('monto')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                    metric === 'monto' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Monto ($)</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span>Tipo de gráfico:</span>
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  chartType === 'area' ? 'bg-zinc-800 text-white border border-white/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Área Continua
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                  chartType === 'bar' ? 'bg-zinc-800 text-white border border-white/20' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Barras Mensuales
              </button>
            </div>
          </div>

          {/* TARJETAS RESUMEN KPIS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-900/70 border border-white/10 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span>Total Acumulado</span>
                <Scale className="w-4 h-4 text-red-500" />
              </div>
              <div className="font-mono text-lg sm:text-xl font-black text-white">
                {formatUnit(summaryKpis.total)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                En {monthlyHistory.length} meses registrados (2026)
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/10 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span>Promedio Mensual</span>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>
              <div className="font-mono text-lg sm:text-xl font-bold text-amber-300">
                {formatUnit(summaryKpis.promedio)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                Promedio mensual de despacho
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/10 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span>Mejor Mes</span>
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="font-mono text-lg sm:text-xl font-bold text-emerald-400">
                {summaryKpis.maxMes?.mes || '-'}
              </div>
              <div className="text-[10px] text-emerald-500 font-mono mt-1">
                {summaryKpis.maxMes ? formatUnit(summaryKpis.maxMes.val) : '-'}
              </div>
            </div>

            <div className="bg-zinc-900/70 border border-white/10 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                <span>Facturas Totales</span>
                <FileText className="w-4 h-4 text-blue-500" />
              </div>
              <div className="font-mono text-lg sm:text-xl font-bold text-blue-300">
                {new Intl.NumberFormat('en-US').format(summaryKpis.totalFacturas)}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                Documentos emitidos en 2026
              </div>
            </div>
          </div>

          {/* GRÁFICO HISTÓRICO DE TENDENCIA */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Evolución Histórica de Mercancía ({metricLabel})
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                Enero 2026 - Septiembre 2026
              </span>
            </div>

            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={monthlyHistory} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
                    <defs>
                      <linearGradient id="volumenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="shortMes"
                      stroke="#71717a"
                      fontSize={11}
                      tick={{ fill: '#a1a1aa' }}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={11}
                      tickFormatter={(val) => formatUnit(val)}
                      tick={{ fill: '#a1a1aa' }}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatUnit(Number(val)), `Volumen (${metricLabel})`]}
                      contentStyle={{
                        backgroundColor: '#09090b',
                        borderColor: '#27272a',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                      }}
                    />
                    <ReferenceLine
                      y={summaryKpis.promedio}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: `Promedio (${formatUnit(summaryKpis.promedio)})`,
                        position: 'top',
                        fill: '#f59e0b',
                        fontSize: 10,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="valCurr"
                      stroke="#ef4444"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#volumenGradient)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyHistory} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                      dataKey="shortMes"
                      stroke="#71717a"
                      fontSize={11}
                      tick={{ fill: '#a1a1aa' }}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={11}
                      tickFormatter={(val) => formatUnit(val)}
                      tick={{ fill: '#a1a1aa' }}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatUnit(Number(val)), `Volumen (${metricLabel})`]}
                      contentStyle={{
                        backgroundColor: '#09090b',
                        borderColor: '#27272a',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                      }}
                    />
                    <ReferenceLine
                      y={summaryKpis.promedio}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Promedio',
                        position: 'top',
                        fill: '#f59e0b',
                        fontSize: 10,
                      }}
                    />
                    <Bar
                      dataKey="valCurr"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* TABLA DETALLADA MES A MES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Desglose Mensual Detallado
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {monthlyHistory.length} meses auditados
              </span>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden bg-zinc-950">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-white/10 text-zinc-300 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3 border-r border-white/10">Mes</th>
                      <th className="p-3 text-center border-r border-white/10">Kgs Totales</th>
                      <th className="p-3 text-center border-r border-white/10">Cajas Netas</th>
                      <th className="p-3 text-center border-r border-white/10">Cj Factura</th>
                      <th className="p-3 text-center border-r border-white/10">Cj Dev</th>
                      <th className="p-3 text-center border-r border-white/10">Monto Neto ($)</th>
                      <th className="p-3 text-center border-r border-white/10">Facturas</th>
                      <th className="p-3 text-center border-r border-white/10">Variación MoM</th>
                      <th className="p-3 text-center">Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {monthlyHistory.map((m, idx) => {
                      const isUp = m.diff > 0;
                      const isDown = m.diff < 0;

                      return (
                        <tr key={m.mes} className="hover:bg-white/[0.03] transition-colors">
                          <td className="p-3 border-r border-white/10 font-bold text-white font-sans flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                            {m.mes}
                          </td>

                          <td className="p-3 text-center border-r border-white/10 text-zinc-200 font-semibold">
                            {new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(m.kgs)} kg
                          </td>

                          <td className="p-3 text-center border-r border-white/10 font-bold text-white">
                            {new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(m.cajas)} cj
                          </td>

                          <td className="p-3 text-center border-r border-white/10 text-zinc-400 text-[11px]">
                            {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(m.cajasFA)}
                          </td>

                          <td className="p-3 text-center border-r border-white/10 text-rose-400/80 text-[11px]">
                            {m.cajasDV !== 0
                              ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(m.cajasDV)
                              : '-'}
                          </td>

                          <td className="p-3 text-center border-r border-white/10 text-emerald-400 font-semibold">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 0,
                            }).format(m.montoNeto)}
                          </td>

                          <td className="p-3 text-center border-r border-white/10 text-zinc-300">
                            {m.facturasCount}
                          </td>

                          {/* Variación MoM */}
                          <td className="p-3 text-center border-r border-white/10">
                            {idx === 0 ? (
                              <span className="text-zinc-600 text-[11px]">-</span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                  isUp
                                    ? 'text-emerald-400 bg-emerald-500/10'
                                    : isDown
                                    ? 'text-rose-400 bg-rose-500/10'
                                    : 'text-zinc-400 bg-zinc-800'
                                }`}
                              >
                                {isUp ? (
                                  <ArrowUpRight className="w-3 h-3" />
                                ) : isDown ? (
                                  <ArrowDownRight className="w-3 h-3" />
                                ) : (
                                  <Minus className="w-3 h-3" />
                                )}
                                {isUp ? '+' : ''}
                                {m.momPct}%
                              </span>
                            )}
                          </td>

                          {/* Cumplimiento estimado */}
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                m.pctCumplimiento >= 100
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : m.pctCumplimiento >= 70
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {m.pctCumplimiento}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Datos sincronizados en tiempo real desde Supabase y Google Sheets.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-md active:scale-95"
          >
            Cerrar Historial
          </button>
        </div>
      </div>
    </div>
  );
};
