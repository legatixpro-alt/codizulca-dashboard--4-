import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  Award,
  Users,
  Building2,
  MapPin,
  Calendar,
  Search,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart as PieChartIcon,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Zap,
  DollarSign,
  Package,
  Layers,
  PhoneCall
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';
import {
  ParetoRowItem,
  ParetoSummaryStats,
  ParetoInsightsData,
  ParetoDimension,
  ParetoMetric,
  Pareto360Mode,
  MONTH_LABELS,
  CHRONOLOGICAL_MONTHS
} from './paretoTypes';
import { formatParetoValue, getParetoMetricLabel, getParetoDimensionLabel } from './paretoExportUtils';

interface Pareto360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Pareto360Mode;
  onModeChange: (newMode: Pareto360Mode) => void;
  rows: ParetoRowItem[];
  summary: ParetoSummaryStats | null;
  insights: ParetoInsightsData | null;
  dimension: ParetoDimension;
  metric: ParetoMetric;
  selectedMonth: string;
}

const PIE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'];

export const Pareto360Modal: React.FC<Pareto360ModalProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
  rows,
  summary,
  insights,
  dimension,
  metric,
  selectedMonth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('ALL');
  const [selectedCanal, setSelectedCanal] = useState('ALL');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');

  // Available supervisors & channels in current dataset
  const availableSupervisors = useMemo(() => {
    return ['JOHNATAN SOTO', 'NELSON FINOL'];
  }, []);

  const availableCanales = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.canal && r.canal.trim() !== '') set.add(r.canal.trim());
    });
    return Array.from(set).sort();
  }, [rows]);

  // Current mode fallback to AT_RISK if null
  const currentMode: Pareto360Mode = mode || 'AT_RISK';

  // 1. DATASET FILTRADO PARA EL MODO 360 SELECCIONADO
  const modeRows = useMemo(() => {
    if (currentMode === 'AT_RISK') {
      return rows.filter((r) => r.insightStatus === 'AT_RISK');
    }
    if (currentMode === 'GROWTH') {
      return rows.filter((r) => r.insightStatus === 'GROWTH_OPPORTUNITY');
    }
    if (currentMode === 'CONCENTRATION') {
      // Top 20 accounts
      return rows.slice(0, 20);
    }
    return rows;
  }, [rows, currentMode]);

  // 2. DATASET CON FILTROS DE USUARIO APLICADOS (BÚSQUEDA, SUPERVISOR, CANAL)
  const filteredRows = useMemo(() => {
    return modeRows.filter((r) => {
      const matchSearch =
        r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.secundario && r.secundario.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.supervisor && r.supervisor.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSupervisor =
        selectedSupervisor === 'ALL' || (r.supervisor && r.supervisor === selectedSupervisor);

      const matchCanal =
        selectedCanal === 'ALL' || (r.canal && r.canal === selectedCanal);

      let matchSeverity = true;
      if (currentMode === 'AT_RISK' && severityFilter !== 'ALL') {
        if (severityFilter === 'CRITICAL') {
          matchSeverity = (r.dropPct || 0) >= 80;
        } else if (severityFilter === 'HIGH') {
          matchSeverity = (r.dropPct || 0) >= 50 && (r.dropPct || 0) < 80;
        }
      }

      return matchSearch && matchSupervisor && matchCanal && matchSeverity;
    });
  }, [modeRows, searchTerm, selectedSupervisor, selectedCanal, severityFilter, currentMode]);

  // 3. ESTADÍSTICAS 360 CALCULADAS SEGÚN MODO
  const metrics360 = useMemo(() => {
    if (!summary || !insights) return null;

    if (currentMode === 'AT_RISK') {
      const totalRiskVolume = modeRows.reduce((acc, r) => acc + r.valor, 0);
      const totalPotentialLoss = modeRows.reduce((acc, r) => {
        const hist = r.avgMonthly ? r.avgMonthly * 3 : r.valor * 1.5;
        const current = r.valor;
        return acc + Math.max(0, hist - current);
      }, 0);
      const sotoCount = modeRows.filter((r) => r.supervisor === 'JOHNATAN SOTO').length;
      const finolCount = modeRows.filter((r) => r.supervisor === 'NELSON FINOL').length;
      const criticalCount = modeRows.filter((r) => (r.dropPct || 0) >= 80).length;

      return {
        totalAccounts: modeRows.length,
        totalVolume: totalRiskVolume,
        estimatedLoss: totalPotentialLoss,
        sotoCount,
        finolCount,
        criticalCount,
        avgDrop:
          modeRows.length > 0
            ? (modeRows.reduce((acc, r) => acc + (r.dropPct || 50), 0) / modeRows.length).toFixed(1)
            : '0'
      };
    }

    if (currentMode === 'CONCENTRATION') {
      const totalVal = summary.totalSum || 1;
      const top1Val = rows[0]?.valor || 0;
      const top3Val = rows.slice(0, 3).reduce((acc, r) => acc + r.valor, 0);
      const top5Val = rows.slice(0, 5).reduce((acc, r) => acc + r.valor, 0);
      const top10Val = rows.slice(0, 10).reduce((acc, r) => acc + r.valor, 0);
      const top20Val = rows.slice(0, 20).reduce((acc, r) => acc + r.valor, 0);
      const restVal = Math.max(0, totalVal - top20Val);

      return {
        top1Val,
        top1Pct: ((top1Val / totalVal) * 100).toFixed(1),
        top3Val,
        top3Pct: ((top3Val / totalVal) * 100).toFixed(1),
        top5Val,
        top5Pct: ((top5Val / totalVal) * 100).toFixed(1),
        top10Val,
        top10Pct: ((top10Val / totalVal) * 100).toFixed(1),
        top20Val,
        top20Pct: ((top20Val / totalVal) * 100).toFixed(1),
        restVal,
        restPct: ((restVal / totalVal) * 100).toFixed(1),
        riskLevel: insights.concentrationLevel,
      };
    }

    if (currentMode === 'GROWTH') {
      const totalGrowthVolume = modeRows.reduce((acc, r) => acc + r.valor, 0);
      const sotoCount = modeRows.filter((r) => r.supervisor === 'JOHNATAN SOTO').length;
      const finolCount = modeRows.filter((r) => r.supervisor === 'NELSON FINOL').length;
      const avgGrowth =
        modeRows.length > 0
          ? (modeRows.reduce((acc, r) => acc + (r.growthPct || 25), 0) / modeRows.length).toFixed(1)
          : '0';

      return {
        totalAccounts: modeRows.length,
        totalVolume: totalGrowthVolume,
        sotoCount,
        finolCount,
        avgGrowth,
      };
    }

    return null;
  }, [modeRows, rows, summary, insights, currentMode]);

  // 4. DATOS PARA GRÁFICOS RECHARTS
  const chartData360 = useMemo(() => {
    if (currentMode === 'AT_RISK') {
      return modeRows.slice(0, 8).map((r) => ({
        name: r.nombre.length > 15 ? r.nombre.slice(0, 15) + '...' : r.nombre,
        fullName: r.nombre,
        actual: Math.round(r.valor),
        caidaPct: r.dropPct || 50,
        supervisor: r.supervisor || 'N/A'
      }));
    }

    if (currentMode === 'CONCENTRATION') {
      if (!summary) return [];
      const total = summary.totalSum || 1;
      const top1 = rows[0]?.valor || 0;
      const top2_3 = rows.slice(1, 3).reduce((acc, r) => acc + r.valor, 0);
      const top4_5 = rows.slice(3, 5).reduce((acc, r) => acc + r.valor, 0);
      const top6_10 = rows.slice(5, 10).reduce((acc, r) => acc + r.valor, 0);
      const top11_20 = rows.slice(10, 20).reduce((acc, r) => acc + r.valor, 0);
      const rest = Math.max(0, total - (top1 + top2_3 + top4_5 + top6_10 + top11_20));

      return [
        { name: 'Top 1 (Cliente Ancla)', value: Math.round(top1), pct: ((top1 / total) * 100).toFixed(1) },
        { name: 'Top 2 - 3', value: Math.round(top2_3), pct: ((top2_3 / total) * 100).toFixed(1) },
        { name: 'Top 4 - 5', value: Math.round(top4_5), pct: ((top4_5 / total) * 100).toFixed(1) },
        { name: 'Top 6 - 10', value: Math.round(top6_10), pct: ((top6_10 / total) * 100).toFixed(1) },
        { name: 'Top 11 - 20', value: Math.round(top11_20), pct: ((top11_20 / total) * 100).toFixed(1) },
        { name: 'Resto Cartera (21+)', value: Math.round(rest), pct: ((rest / total) * 100).toFixed(1) },
      ];
    }

    if (currentMode === 'GROWTH') {
      return modeRows.slice(0, 8).map((r) => ({
        name: r.nombre.length > 15 ? r.nombre.slice(0, 15) + '...' : r.nombre,
        fullName: r.nombre,
        volumen: Math.round(r.valor),
        crecimientoPct: r.growthPct || 20,
        supervisor: r.supervisor || 'N/A'
      }));
    }

    return [];
  }, [modeRows, rows, summary, currentMode]);

  // Generador de minuta WhatsApp
  const handleCopyWhatsApp = () => {
    const monthLabel = MONTH_LABELS[selectedMonth] || selectedMonth;
    const metricLabel = getParetoMetricLabel(metric);
    const dateStr = new Date().toLocaleDateString('es-VE');

    let text = '';
    if (currentMode === 'AT_RISK') {
      text = `🚨 *DASHBOARD 360° - ALERTA DE FUGA CLIENTES VIP (CODIZULCA)*\n`;
      text += `📅 *Fecha:* ${dateStr} | *Período:* ${monthLabel}\n`;
      text += `📊 *Métrica Evaluada:* ${metricLabel}\n`;
      text += `⚠️ *Total Cuentas VIP en Riesgo:* ${modeRows.length} clientes Clase A con caída > 50%\n`;
      text += `👤 *Filtro Supervisor:* ${selectedSupervisor === 'ALL' ? 'Todos' : selectedSupervisor}\n\n`;
      text += `🎯 *TOP CUENTAS VIP PARA RESCATE PRIORITARIO:*\n`;
      filteredRows.slice(0, 10).forEach((r, idx) => {
        text += `${idx + 1}. *${r.nombre}*\n`;
        text += `   • Vend: ${r.secundario || 'N/A'} | Sup: ${r.supervisor || 'N/A'}\n`;
        text += `   • Venta Actual: ${formatParetoValue(r.valor, metric)} | Caída: -${r.dropPct || 50}%\n`;
      });
      text += `\n📌 *Acción Comercial Inmediata:* Visita conjunta de supervisor y vendedor para renegociación y reactivación de despacho.`;
    } else if (currentMode === 'CONCENTRATION') {
      text = `⚠️ *DASHBOARD 360° - DIAGNÓSTICO DE CONCENTRACIÓN (CODIZULCA)*\n`;
      text += `📅 *Fecha:* ${dateStr} | *Período:* ${monthLabel}\n`;
      text += `📊 *Ratios de Absorción de Cartera:*\n`;
      text += `   • *Top 1:* ${insights?.top1Pct}% (${rows[0]?.nombre || 'N/A'})\n`;
      text += `   • *Top 3:* ${insights?.top3Pct}%\n`;
      text += `   • *Top 5:* ${insights?.top5Pct}%\n`;
      text += `   • *Top 10:* ${insights?.top10Pct}%\n`;
      text += `🛡️ *Diagnóstico:* Nivel de Riesgo ${insights?.concentrationLevel}\n\n`;
      text += `⭐ *TOP 5 CUENTAS DE MAYOR ABSORCIÓN:*\n`;
      rows.slice(0, 5).forEach((r, idx) => {
        text += `${idx + 1}. *${r.nombre}* (${Number(r.pctIndividual).toFixed(2)}% venta) - Vend: ${r.secundario || 'N/A'}\n`;
      });
    } else {
      text = `🚀 *DASHBOARD 360° - CUENTAS DE ALTO POTENCIAL CLASE B (CODIZULCA)*\n`;
      text += `📅 *Fecha:* ${dateStr} | *Período:* ${monthLabel}\n`;
      text += `📈 *Cuentas en Aceleración (+20% o más):* ${modeRows.length} comercios\n\n`;
      text += `⭐ *CANDIDATOS A PROMOCIÓN A CLASE A:*\n`;
      filteredRows.slice(0, 10).forEach((r, idx) => {
        text += `${idx + 1}. *${r.nombre}*\n`;
        text += `   • Vend: ${r.secundario || 'N/A'} | Sup: ${r.supervisor || 'N/A'}\n`;
        text += `   • Volumen Actual: ${formatParetoValue(r.valor, metric)} (+${r.growthPct || 20}%)\n`;
      });
      text += `\n💡 *Estrategia:* Aumentar cupo de crédito y presentar catálogo completo para consolidar volumen Clase A.`;
    }

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  // Exportar Excel 360
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().slice(0, 10);
    const metricLabel = getParetoMetricLabel(metric);
    const dimLabel = getParetoDimensionLabel(dimension);

    // Hoja Detallada
    const excelData = filteredRows.map((r, idx) => ({
      Ranking: r.ranking,
      Código: r.id,
      Nombre: r.nombre,
      Supervisor: r.supervisor || 'N/A',
      Vendedor: r.secundario || 'N/A',
      Canal: r.canal || 'N/A',
      Zona: r.zona || 'N/A',
      Clasificación: r.clasificacion,
      [`Valor (${metricLabel})`]: r.valor,
      '% Individual': `${Number(r.pctIndividual).toFixed(2)}%`,
      '% Acumulado': `${Number(r.pctAcumulado).toFixed(2)}%`,
      'Diagnóstico 360':
        currentMode === 'AT_RISK'
          ? `Alerta Caída (-${r.dropPct || 50}%)`
          : currentMode === 'GROWTH'
          ? `Potencial Crecimiento (+${r.growthPct || 20}%)`
          : `Top Concentración (${r.ranking})`,
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const sheetName =
      currentMode === 'AT_RISK'
        ? 'Fuga_VIP_360'
        : currentMode === 'CONCENTRATION'
        ? 'Concentracion_360'
        : 'Alto_Potencial_360';

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Codizulca_Dashboard360_${currentMode}_${dateStr}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-950 border border-white/15 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-zinc-100">
        {/* ========================================================= */}
        {/* 1. HEADER 360° CON SWITCHER DE MODOS Y ACCIONES */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-zinc-900/90 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border shadow-inner ${
                  currentMode === 'AT_RISK'
                    ? 'bg-red-500/15 border-red-500/30 text-red-400'
                    : currentMode === 'CONCENTRATION'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                }`}
              >
                {currentMode === 'AT_RISK' ? (
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                ) : currentMode === 'CONCENTRATION' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <TrendingUp className="w-6 h-6 animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest bg-white/10 border border-white/10 text-white uppercase">
                    DASHBOARD 360°
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                    {currentMode === 'AT_RISK' && 'Auditoría de Fuga & Rescate de Clientes VIP (Clase A)'}
                    {currentMode === 'CONCENTRATION' && 'Diagnóstico de Concentración & Absorción de Cartera'}
                    {currentMode === 'GROWTH' && 'Aceleración Comercial & Promoción de Cuentas (Clase B ➔ A)'}
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Análisis estratégico 360° sobre {getParetoDimensionLabel(dimension)} • Métrica:{' '}
                  <strong className="text-white">{getParetoMetricLabel(metric)}</strong> • Período:{' '}
                  <strong className="text-zinc-300">{MONTH_LABELS[selectedMonth] || selectedMonth}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00a854] hover:bg-[#009248] text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                title="Copiar Minuta Ejecutiva para WhatsApp"
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSuccess ? '¡Copiado!' : 'Minuta WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-white/10 rounded-lg text-xs font-bold transition-all shadow-md"
                title="Exportar listado a Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5 transition-colors"
                title="Cerrar Dashboard 360"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* BARRA DE NAVEGACIÓN ENTRE LAS 3 MÉTRICAS 360° */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onModeChange('AT_RISK')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                currentMode === 'AT_RISK'
                  ? 'bg-red-600/20 border-red-500 text-red-300 shadow-md shadow-red-500/10'
                  : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              <span>1. Alerta de Fuga VIP</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-300">
                {insights?.vipAtRiskCount || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('CONCENTRATION')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                currentMode === 'CONCENTRATION'
                  ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>2. Concentración de Cartera</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                Top 10: {insights?.top10Pct}%
              </span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('GROWTH')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                currentMode === 'GROWTH'
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10'
                  : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>3. Cuentas de Alto Potencial</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
                {insights?.growthOpportunityCount || 0}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. BODY SCROLLABLE: KPIS, GRÁFICOS Y TABLA DRILLDOWN */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-zinc-950">
          {/* TARJETAS KPI 360° ESPECÍFICAS SEGÚN EL MODO */}
          {metrics360 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {currentMode === 'AT_RISK' && (
                <>
                  <div className="p-3.5 rounded-xl border bg-red-950/20 border-red-500/30">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                      Cuentas VIP en Riesgo
                    </span>
                    <p className="text-2xl font-black text-white mt-1">{metrics360.totalAccounts}</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {metrics360.criticalCount} con caída crítica (&gt;80%)
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-white/10">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Volumen Aportado Actual
                    </span>
                    <p className="text-2xl font-black text-red-400 mt-1">
                      {formatParetoValue(metrics360.totalVolume, metric)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">Desaceleración promedio: -{metrics360.avgDrop}%</p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-white/10">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Impacto por Supervisor
                    </span>
                    <div className="mt-1 flex items-center justify-between text-xs font-bold text-white">
                      <span>J. Soto: <strong className="text-red-400">{metrics360.sotoCount}</strong></span>
                      <span>N. Finol: <strong className="text-red-400">{metrics360.finolCount}</strong></span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1.5">Distribución de cartera VIP en supervisión</p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-white/10">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Pérdida de Volumen Estimada
                    </span>
                    <p className="text-2xl font-black text-amber-400 mt-1">
                      {formatParetoValue(metrics360.estimatedLoss, metric)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">Brecha frente al promedio histórico</p>
                  </div>
                </>
              )}

              {currentMode === 'CONCENTRATION' && (
                <>
                  <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-white/10">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Top 1 (Cliente Ancla)
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-2xl font-black text-white">{metrics360.top1Pct}%</p>
                      <span className="text-xs text-zinc-400 font-mono">
                        {formatParetoValue(metrics360.top1Val, metric)}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate mt-1">{rows[0]?.nombre || 'N/A'}</p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-white/10">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Top 3 (Absorción Clave)
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-2xl font-black text-amber-400">{metrics360.top3Pct}%</p>
                      <span className="text-xs text-zinc-400 font-mono">
                        {formatParetoValue(metrics360.top3Val, metric)}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">Concentración en 3 cuentas vitales</p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-white/10">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                      Top 10 (Núcleo de Facturación)
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-2xl font-black text-red-400">{metrics360.top10Pct}%</p>
                      <span className="text-xs text-zinc-400 font-mono">
                        {formatParetoValue(metrics360.top10Val, metric)}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">Representa el 80% de estabilidad</p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-emerald-950/20 border-emerald-500/30">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Resto Cartera (21+)
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-2xl font-black text-emerald-400">{metrics360.restPct}%</p>
                      <span className="text-xs text-zinc-400 font-mono">
                        {formatParetoValue(metrics360.restVal, metric)}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">Dispersión de riesgo en clientes B y C</p>
                  </div>
                </>
              )}

              {currentMode === 'GROWTH' && (
                <>
                  <div className="p-3.5 rounded-xl border bg-emerald-950/20 border-emerald-500/30">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Cuentas en Aceleración
                    </span>
                    <p className="text-2xl font-black text-white mt-1">{metrics360.totalAccounts}</p>
                    <p className="text-xs text-zinc-400 mt-1">Candidatos a ingresar a Clase A</p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-white/10">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Volumen Generado
                    </span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">
                      {formatParetoValue(metrics360.totalVolume, metric)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">Aporte de cuentas Clase B en ascenso</p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-white/10">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Crecimiento Promedio
                    </span>
                    <p className="text-2xl font-black text-white mt-1">+{metrics360.avgGrowth}%</p>
                    <p className="text-xs text-zinc-400 mt-1">Incremento intermensual sostenido</p>
                  </div>

                  <div className="p-3.5 rounded-xl border bg-zinc-900/60 border-white/10">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Oportunidades por Supervisor
                    </span>
                    <div className="mt-1 flex items-center justify-between text-xs font-bold text-white">
                      <span>J. Soto: <strong className="text-emerald-400">{metrics360.sotoCount}</strong></span>
                      <span>N. Finol: <strong className="text-emerald-400">{metrics360.finolCount}</strong></span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1.5">Planes de volumen a implementar</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* GRÁFICAS 360°: DISTRIBUCIÓN Y TOP IMPACTO */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Gráfico Principal 360 */}
            <div className="lg:col-span-8 bg-zinc-900/40 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-red-500" />
                  <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                    {currentMode === 'AT_RISK' && 'Top Cuentas VIP con Mayor Caída de Ventas'}
                    {currentMode === 'CONCENTRATION' && 'Estructura de Absorción de Cartera (Curva de Dominancia)'}
                    {currentMode === 'GROWTH' && 'Top Cuentas Clase B con Mayor Crecimiento'}
                  </h4>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {currentMode === 'AT_RISK' && 'Ranking por volumen histórico'}
                  {currentMode === 'CONCENTRATION' && 'Concentración acumulada'}
                  {currentMode === 'GROWTH' && 'Incremento porcentual'}
                </span>
              </div>

              <div className="h-[240px] w-full pt-1">
                {currentMode === 'CONCENTRATION' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData360} margin={{ top: 10, right: 15, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                      <YAxis stroke="#71717a" fontSize={10} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '10px', fontSize: '11px' }}
                        formatter={(val: any, name: any, item: any) => [
                          `${formatParetoValue(Number(val), metric)} (${item.payload.pct}%)`,
                          'Volumen'
                        ]}
                      />
                      <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]}>
                        {chartData360.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData360} margin={{ top: 10, right: 15, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={10} interval={0} angle={-20} textAnchor="end" />
                      <YAxis stroke="#71717a" fontSize={10} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '10px', fontSize: '11px' }}
                        formatter={(val: any, name: any, item: any) => [
                          `${formatParetoValue(Number(val), metric)} (${
                            currentMode === 'AT_RISK' ? `-${item.payload.caidaPct}%` : `+${item.payload.crecimientoPct}%`
                          })`,
                          currentMode === 'AT_RISK' ? 'Volumen Actual' : 'Volumen Generado'
                        ]}
                      />
                      <Bar
                        dataKey={currentMode === 'AT_RISK' ? 'actual' : 'volumen'}
                        fill={currentMode === 'AT_RISK' ? '#ef4444' : '#10b981'}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Panel Estratégico Lateral 360 */}
            <div className="lg:col-span-4 bg-zinc-900/40 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">
                    Plan de Acción Táctico 360°
                  </h4>
                </div>

                <div className="space-y-2.5 text-xs text-zinc-300 mt-3 leading-relaxed">
                  {currentMode === 'AT_RISK' && (
                    <>
                      <div className="p-2.5 bg-red-950/30 border border-red-500/20 rounded-xl">
                        <strong className="text-red-400 block font-bold mb-1">1. Visita de Rescate Inmediata:</strong>
                        Coordinar con los supervisores Johnatan Soto y Nelson Finol una reunión presencial con las cuentas VIP con caída &gt;80%.
                      </div>
                      <div className="p-2.5 bg-zinc-900/70 border border-white/5 rounded-xl">
                        <strong className="text-white block font-bold mb-1">2. Auditoría de Crédito y Despacho:</strong>
                        Verificar si la desaceleración responde a cupo de crédito bloqueado o falta de disponibilidad en rubros clave.
                      </div>
                    </>
                  )}

                  {currentMode === 'CONCENTRATION' && (
                    <>
                      <div className="p-2.5 bg-amber-950/30 border border-amber-500/20 rounded-xl">
                        <strong className="text-amber-400 block font-bold mb-1">1. Blindaje de Cuentas Ancla:</strong>
                        El Top 10 concentra el <strong>{insights?.top10Pct}%</strong> del volumen. Garantizar stock de seguridad y atención prioritaria de despacho.
                      </div>
                      <div className="p-2.5 bg-zinc-900/70 border border-white/5 rounded-xl">
                        <strong className="text-white block font-bold mb-1">2. Diversificación de Cartera:</strong>
                        Impulsar incentivos en clientes medianos (Clase B) para mitigar el riesgo de dependencia excesiva en pocas cuentas.
                      </div>
                    </>
                  )}

                  {currentMode === 'GROWTH' && (
                    <>
                      <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/20 rounded-xl">
                        <strong className="text-emerald-400 block font-bold mb-1">1. Ampliación de Línea y Cupo:</strong>
                        Presentar portafolio completo a los <strong>{modeRows.length}</strong> clientes Clase B en crecimiento para elevar su ticket.
                      </div>
                      <div className="p-2.5 bg-zinc-900/70 border border-white/5 rounded-xl">
                        <strong className="text-white block font-bold mb-1">2. Promoción a Clase A:</strong>
                        Establecer metas mensuales escalonadas para que alcancen el umbral de cliente VIP antes del cierre del trimestre.
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="w-full py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Enviar Alerta a Supervisores</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 3. BARRA DE FILTROS SECUNDARIOS & BÚSQUEDA */}
          {/* ========================================================= */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Detalle Drilldown 360° ({filteredRows.length} registros)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Severidad (solo en AT_RISK) */}
              {currentMode === 'AT_RISK' && (
                <div className="flex items-center bg-zinc-900 p-0.5 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setSeverityFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      severityFilter === 'ALL' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Todas ({modeRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeverityFilter('CRITICAL')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      severityFilter === 'CRITICAL' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Críticas &gt;80%
                  </button>
                </div>
              )}

              {/* Filtro Supervisor */}
              <select
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-500"
              >
                <option value="ALL">Todos los Supervisores</option>
                {availableSupervisors.map((s) => (
                  <option key={s} value={s}>
                    Sup: {s}
                  </option>
                ))}
              </select>

              {/* Filtro Canal */}
              <select
                value={selectedCanal}
                onChange={(e) => setSelectedCanal(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-red-500 max-w-[150px]"
              >
                <option value="ALL">Todos los Canales</option>
                {availableCanales.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Buscador */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, RIF o vendedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 w-52 sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. TABLA DETALLADA CON DESGLOSE DRILLDOWN POR CLIENTE */}
          {/* ========================================================= */}
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-zinc-950">
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-900/90 text-zinc-400 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-white/10 backdrop-blur-md">
                  <tr>
                    <th className="py-3 px-3 text-center w-12">#</th>
                    <th className="py-3 px-3">Cliente / Razón Social</th>
                    <th className="py-3 px-3">Vendedor & Supervisor</th>
                    <th className="py-3 px-3">Canal / Zona</th>
                    <th className="py-3 px-3 text-right">Volumen ({getParetoMetricLabel(metric)})</th>
                    <th className="py-3 px-3 text-right">% Venta</th>
                    <th className="py-3 px-3 text-center">Diagnóstico 360°</th>
                    <th className="py-3 px-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500">
                        No se encontraron registros con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((r, idx) => {
                      const isExpanded = expandedRowId === r.id;

                      return (
                        <React.Fragment key={r.id}>
                          <tr
                            onClick={() => setExpandedRowId(isExpanded ? null : r.id)}
                            className={`cursor-pointer transition-colors ${
                              isExpanded ? 'bg-zinc-900/90' : 'hover:bg-zinc-900/40'
                            }`}
                          >
                            <td className="py-3 px-3 text-center font-mono font-bold text-zinc-400">
                              {r.ranking}
                            </td>
                            <td className="py-3 px-3 font-medium text-white max-w-[260px]">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold truncate">{r.nombre}</span>
                                {r.idsList && r.idsList.length > 1 && (
                                  <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    {r.idsList.length} Sucursales
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono">
                                {r.idsList && r.idsList.length > 1
                                  ? `IDs: ${r.idsList.slice(0, 3).join(', ')}${r.idsList.length > 3 ? '...' : ''}`
                                  : `ID: ${r.id}`}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-zinc-300">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-zinc-200 truncate">{r.secundario || 'N/A'}</span>
                                {r.vendedoresList && r.vendedoresList.length > 1 && (
                                  <span
                                    className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0"
                                    title={`Vendedores: ${r.vendedoresList.join(', ')}`}
                                  >
                                    +{r.vendedoresList.length - 1}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500">{r.supervisor || 'N/A'}</div>
                            </td>
                            <td className="py-3 px-3 text-zinc-400">
                              <div>{r.canal || 'N/A'}</div>
                              <div className="text-[10px] text-zinc-500">{r.zona || 'N/A'}</div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-white">
                              {formatParetoValue(r.valor, metric)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-zinc-200">
                              {Number(r.pctIndividual).toFixed(2)}%
                            </td>
                            <td className="py-3 px-3 text-center">
                              {currentMode === 'AT_RISK' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600/20 text-red-400 border border-red-500/30">
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>Caída -{r.dropPct || 50}%</span>
                                </span>
                              )}
                              {currentMode === 'CONCENTRATION' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <Award className="w-3 h-3" />
                                  <span>Top {r.ranking}</span>
                                </span>
                              )}
                              {currentMode === 'GROWTH' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                                  <TrendingUp className="w-3 h-3" />
                                  <span>Crecimiento +{r.growthPct || 20}%</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center text-zinc-500">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4" />}
                            </td>
                          </tr>

                          {/* FICHA DESPLEGABLE DRILLDOWN 360° */}
                          {isExpanded && (
                            <tr className="bg-zinc-900/80 border-b border-white/10">
                              <td colSpan={8} className="p-4">
                                <div className="bg-black/60 border border-white/10 rounded-xl p-4 space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                                        Ficha Técnica 360° del Cliente
                                      </span>
                                      <h5 className="text-sm font-black text-white">{r.nombre}</h5>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="px-2 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-300 font-mono">
                                        CÓDIGO: <strong className="text-red-400 font-black">#{r.id}</strong>
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                        Clasificación: <strong className="text-red-400">Clase {r.clasificacion}</strong>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Desglose de meses ordenados cronológicamente */}
                                  {r.months && Object.keys(r.months).length > 0 && (
                                    <div>
                                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                                        Historial de Compras Intermensual 2026 (Cronológico):
                                      </span>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
                                        {Object.keys(r.months)
                                          .sort((a, b) => {
                                            const idxA = CHRONOLOGICAL_MONTHS.indexOf(a.toUpperCase());
                                            const idxB = CHRONOLOGICAL_MONTHS.indexOf(b.toUpperCase());
                                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                                            return a.localeCompare(b);
                                          })
                                          .map((mesKey) => {
                                            const monthVal = r.months![mesKey] as { monto: number; cajas: number; kgs: number };
                                            const rawNum = metric === 'cajas' ? monthVal.cajas : metric === 'kgs' ? monthVal.kgs : monthVal.monto;
                                            const isNegative = rawNum < 0;
                                            const isZero = rawNum === 0;

                                            return (
                                              <div
                                                key={mesKey}
                                                className={`p-2.5 rounded-xl border text-center transition-all ${
                                                  isNegative
                                                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                                                    : isZero
                                                    ? 'bg-zinc-900/40 border-white/5 opacity-50'
                                                    : 'bg-zinc-900/90 border-white/10 hover:border-white/20'
                                                }`}
                                              >
                                                <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">
                                                  {MONTH_LABELS[mesKey] || mesKey}
                                                </span>
                                                <span
                                                  className={`text-xs font-mono font-black block mt-1 ${
                                                    isNegative
                                                      ? 'text-amber-400'
                                                      : isZero
                                                      ? 'text-zinc-500'
                                                      : 'text-white'
                                                  }`}
                                                >
                                                  {formatParetoValue(rawNum, metric)}
                                                </span>
                                                {isNegative && (
                                                  <span className="text-[9px] text-amber-400/90 block mt-0.5 font-sans font-medium">
                                                    (Devolución)
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-zinc-400">
                                    <div className="flex flex-wrap items-center gap-4">
                                      <span>Supervisor: <strong className="text-zinc-200">{r.supervisor || 'N/A'}</strong></span>
                                      <span>
                                        Vendedor Principal: <strong className="text-zinc-200">{r.secundario || 'N/A'}</strong>
                                        {r.vendedoresList && r.vendedoresList.length > 1 && (
                                          <span className="text-zinc-400 text-[11px] ml-1">
                                            (Todos: {r.vendedoresList.join(', ')})
                                          </span>
                                        )}
                                      </span>
                                      <span>Canal: <strong className="text-zinc-200">{r.canal || 'N/A'}</strong></span>
                                      {r.idsList && r.idsList.length > 1 && (
                                        <span>
                                          Códigos ERP ({r.idsList.length}): <strong className="text-zinc-200 font-mono">{r.idsList.join(', ')}</strong>
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const text = `🚨 *FICHA COMERCIAL 360° - CODIZULCA*\n` +
                                          `• Cliente: *${r.nombre}* (${r.idsList && r.idsList.length > 1 ? `${r.idsList.length} Sucursales [${r.idsList.join(', ')}]` : r.id})\n` +
                                          `• Vendedor: ${r.secundario || 'N/A'}${r.vendedoresList && r.vendedoresList.length > 1 ? ` (Vendedores: ${r.vendedoresList.join(', ')})` : ''} | Sup: ${r.supervisor || 'N/A'}\n` +
                                          `• Canal: ${r.canal || 'N/A'}\n` +
                                          `• Venta Actual: ${formatParetoValue(r.valor, metric)} (${Number(r.pctIndividual).toFixed(2)}%)\n` +
                                          `• Estado: ${currentMode === 'AT_RISK' ? `En Riesgo (-${r.dropPct || 50}%)` : `Crecimiento (+${r.growthPct || 20}%)`}`;
                                        navigator.clipboard.writeText(text);
                                        setCopiedSuccess(true);
                                        setTimeout(() => setCopiedSuccess(false), 2500);
                                      }}
                                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copiar Ficha Cliente</span>
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. FOOTER CON RESUMEN Y BOTÓN DE CIERRE */}
        {/* ========================================================= */}
        <div className="p-4 border-t border-white/10 bg-zinc-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
          <div>
            Mostrando <strong className="text-white">{filteredRows.length}</strong> de <strong className="text-white">{modeRows.length}</strong> cuentas analizadas en este módulo 360°.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors"
            >
              Cerrar Dashboard 360°
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
