import React, { useState, useMemo } from 'react';
import {
  X,
  ClipboardList,
  ShieldAlert,
  Award,
  TrendingUp,
  Share2,
  Download,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Building2,
  Users,
  MapPin,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ParetoRowItem,
  ParetoSummaryStats,
  ParetoInsightsData,
  ParetoDimension,
  ParetoMetric,
  MONTH_LABELS
} from './paretoTypes';
import { formatParetoValue, getParetoMetricLabel } from './paretoExportUtils';

interface ParetoActionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: ParetoRowItem[];
  summary: ParetoSummaryStats | null;
  insights: ParetoInsightsData | null;
  dimension: ParetoDimension;
  metric: ParetoMetric;
  selectedMonth: string;
}

export const ParetoActionPlanModal: React.FC<ParetoActionPlanModalProps> = ({
  isOpen,
  onClose,
  rows,
  summary,
  insights,
  dimension,
  metric,
  selectedMonth,
}) => {
  const [activePlanTab, setActivePlanTab] = useState<'VIP' | 'AT_RISK' | 'GROWTH'>('AT_RISK');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('ALL');
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Filtrado de registros según la pestaña operativa
  const planRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedSupervisor !== 'ALL' && r.supervisor && r.supervisor !== selectedSupervisor) {
        return false;
      }
      if (activePlanTab === 'VIP') {
        return r.clasificacion === 'A';
      }
      if (activePlanTab === 'AT_RISK') {
        return r.insightStatus === 'AT_RISK';
      }
      if (activePlanTab === 'GROWTH') {
        return r.insightStatus === 'GROWTH_OPPORTUNITY';
      }
      return true;
    });
  }, [rows, activePlanTab, selectedSupervisor]);

  if (!isOpen) return null;

  const toggleComplete = (id: string) => {
    setCompletedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Generador de texto para WhatsApp
  const handleCopyWhatsApp = () => {
    const monthLabel = MONTH_LABELS[selectedMonth] || selectedMonth;
    const metricLabel = getParetoMetricLabel(metric);
    const dateStr = new Date().toLocaleDateString('es-VE');

    let text = `📋 *PLAN DE ACCIÓN OPERATIVO PARETO - CODIZULCA*\n`;
    text += `📅 *Fecha:* ${dateStr} | *Período:* ${monthLabel}\n`;
    text += `👤 *Supervisor:* ${selectedSupervisor === 'ALL' ? 'Todos los Supervisores' : selectedSupervisor}\n`;
    text += `📊 *Métrica:* ${metricLabel}\n\n`;

    if (activePlanTab === 'AT_RISK') {
      text += `🚨 *CLIENTES VIP EN RIESGO DE DESERCIÓN (ACCIÓN INMEDIATA):*\n`;
      text += `_Se requiere visita de supervisión y rescate comercial:_\n\n`;
      planRows.slice(0, 15).forEach((r, idx) => {
        text += `${idx + 1}. *${r.nombre}*\n`;
        text += `   • Vend: ${r.secundario || 'N/A'} | Sup: ${r.supervisor || 'N/A'}\n`;
        text += `   • Estado: ${r.dropPct ? `Caída -${r.dropPct}%` : 'Sin compras recientes'}\n`;
        text += `   • Histórico: ${formatParetoValue(r.valor, metric)}\n\n`;
      });
    } else if (activePlanTab === 'VIP') {
      text += `⭐ *TOP CUENTAS CLAVE A BLINDAR (CLASE A - 80% DEL VOLUMEN):*\n`;
      text += `_Garantizar prioridad de despacho, crédito y atención VIP:_\n\n`;
      planRows.slice(0, 15).forEach((r, idx) => {
        text += `${idx + 1}. *${r.nombre}*\n`;
        text += `   • Vend: ${r.secundario || 'N/A'} | Zona: ${r.zona || 'N/A'}\n`;
        text += `   • Volumen: ${formatParetoValue(r.valor, metric)} (${r.pctIndividual.toFixed(1)}% total)\n\n`;
      });
    } else {
      text += `🚀 *CUENTAS CON POTENCIAL DE CRECIMIENTO (CLASE B HACIA A):*\n`;
      text += `_Ofrecer condiciones especiales para aumentar ticket promedio:_\n\n`;
      planRows.slice(0, 15).forEach((r, idx) => {
        text += `${idx + 1}. *${r.nombre}*\n`;
        text += `   • Vend: ${r.secundario || 'N/A'} | Canal: ${r.canal || 'N/A'}\n`;
        text += `   • Volumen actual: ${formatParetoValue(r.valor, metric)}\n\n`;
      });
    }

    text += `\n✅ _Generado desde Codizulca Dashboard (Submódulo Pareto 80/20)_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 3000);
    });
  };

  // Descarga del Plan Operativo en Excel
  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const metricLabel = getParetoMetricLabel(metric);

    const sheetData = planRows.map((r, i) => ({
      '#': i + 1,
      'Prioridad': activePlanTab === 'AT_RISK' ? '1 - CRÍTICA (Rescate)' : activePlanTab === 'VIP' ? '2 - VIP (Blindaje)' : '3 - CRECIMIENTO',
      'Cliente / Entidad': r.nombre,
      'Canal': r.canal || 'GENERAL',
      'Vendedor Asignado': r.secundario || '',
      'Supervisor': r.supervisor || '',
      'Zona': r.zona || '',
      [`Volumen (${metricLabel})`]: Math.round(r.valor),
      'Estado / Diagnóstico': r.insightStatus === 'AT_RISK' ? `Caída detectada (${r.dropPct ? `-${r.dropPct}%` : 'Inactivo'})` : r.insightStatus === 'GROWTH_OPPORTUNITY' ? 'Acelerando' : 'Cuenta VIP Vital',
      'Contacto Realizado': completedItems[r.id] ? 'SÍ' : 'NO',
      'Fecha Visita': '',
      'Acuerdo Comercial / Pedido': '',
      'Observaciones': '',
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Plan Operativo de Campo');
    XLSX.writeFile(wb, `Codizulca_Plan_Operativo_${activePlanTab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Encabezado del Modal */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide uppercase">
                  Plan de Acción Operativa y Despacho Prioritario
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  HERRAMIENTA DE CAMPO
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Genera hojas de ruta para supervisores, rescate de clientes en riesgo y fidelización de cuentas VIP.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Controles y Pestañas Operativas */}
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/30">
          {/* Selector de Pestañas del Plan */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setActivePlanTab('AT_RISK')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activePlanTab === 'AT_RISK'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Rescate en Riesgo ({insights?.vipAtRiskCount || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlanTab('VIP')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activePlanTab === 'VIP'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Blindaje VIP Clase A ({summary?.countA || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePlanTab('GROWTH')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activePlanTab === 'GROWTH'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Desarrollo Clase B ({insights?.growthOpportunityCount || 0})</span>
            </button>
          </div>

          {/* Filtro por Supervisor */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Supervisor:</span>
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-200 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">Todos los Supervisores</option>
              <option value="JOHNATAN SOTO">JOHNATAN SOTO</option>
              <option value="ALI PEREZ">ALI PEREZ</option>
              <option value="NELSON FINOL">NELSON FINOL</option>
            </select>
          </div>
        </div>

        {/* Lista Interactiva de Cuentas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {planRows.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No hay registros para este filtro operativo.
            </div>
          ) : (
            planRows.map((item, idx) => {
              const isChecked = !!completedItems[item.id];
              return (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => toggleComplete(item.id)}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-zinc-900/20 border-white/5 opacity-60'
                      : item.insightStatus === 'AT_RISK'
                      ? 'bg-red-950/20 border-red-500/30 hover:border-red-500/60'
                      : 'bg-zinc-900/50 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="mt-0.5 text-zinc-400 hover:text-white transition-colors"
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-500" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          {idx + 1}. {item.nombre}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.clasificacion === 'A'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          Clase {item.clasificacion}
                        </span>
                        {item.insightStatus === 'AT_RISK' && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-black bg-red-600 text-white">
                            {item.dropPct ? `CAÍDA -${item.dropPct}%` : 'INACTIVO'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400 mt-1">
                        <span>👔 Vend: <strong className="text-zinc-300">{item.secundario || 'N/A'}</strong></span>
                        <span>👤 Sup: <strong className="text-zinc-300">{item.supervisor || 'N/A'}</strong></span>
                        <span>🗺️ Zona: <strong className="text-zinc-300">{item.zona || 'N/A'}</strong></span>
                        <span>🏢 Canal: <strong className="text-zinc-300">{item.canal || 'GENERAL'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right self-end sm:self-center font-mono">
                    <span className="text-xs text-zinc-400 block font-sans">Volumen Registrado</span>
                    <span className="text-sm font-black text-white">{formatParetoValue(item.valor, metric)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie de Acciones Operativas (WhatsApp & Excel) */}
        <div className="p-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60">
          <div className="text-xs text-zinc-400">
            {Object.keys(completedItems).filter((k) => completedItems[k]).length} de {planRows.length} tareas marcadas como contactadas
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-emerald-600/20"
            >
              {copiedSuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSuccess ? '¡Copiado para WhatsApp!' : 'Copiar para WhatsApp'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-colors border border-white/10"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Plan (Excel)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
