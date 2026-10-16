import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Package,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  Download,
  ShieldAlert,
  Truck,
  Layers,
  ArrowRight,
  RefreshCw,
  Award,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ParetoRowItem, ParetoMetric, ABCClass, MONTH_LABELS } from './paretoTypes';
import { formatParetoValue, getParetoMetricLabel } from './paretoExportUtils';

export interface AIDistributionClientPlan {
  id_cliente: string;
  cliente: string;
  vendedor: string;
  clasificacion: ABCClass;
  pctSugerido: number;
  cajasSugeridas: number;
  prioridad: 'URGENTE_BLINDAJE' | 'CRECIMIENTO_ESTRATEGICO' | 'DISTRIBUCION_REGULAR';
  justificacion: string;
  recomendacionRuta: string;
}

export interface AIDistributionResult {
  resumenEjecutivo: string;
  analisisVariacionTop: string;
  estrategiaDistribucion: {
    criterioAsignacion: string;
    pctClaseA: number;
    pctClaseB: number;
    pctReservaEstrategica: number;
    politicaDespacho: string;
  };
  planDistribucion: AIDistributionClientPlan[];
  accionesFuerzaVentas: string[];
  alertasRiesgo: string[];
  stockDistribuidoTotal?: number;
  source?: string;
}

interface AIDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ParetoRowItem;
  selectedMonths: string[];
  metric: ParetoMetric;
  clientLimit: number | 'ALL';
  clients: any[];
  totalProductValue: number;
}

export const AIDistributionModal: React.FC<AIDistributionModalProps> = ({
  isOpen,
  onClose,
  product,
  selectedMonths,
  metric,
  clientLimit,
  clients,
  totalProductValue,
}) => {
  const [availableStock, setAvailableStock] = useState<number>(
    Math.round(totalProductValue > 0 ? totalProductValue : 1000)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AIDistributionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'estrategia' | 'variacion'>('plan');

  const monthsText =
    selectedMonths.length === 0 || selectedMonths.includes('ALL')
      ? 'Todo el Año (Acumulado 2026)'
      : selectedMonths.map((m) => MONTH_LABELS[m] || m).join(', ');

  // Fetch AI distribution plan
  const generatePlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = {
        product: {
          id: product.id,
          nombre: product.nombre,
        },
        selectedMonths: selectedMonths.length > 0 ? selectedMonths : ['ALL'],
        clientLimit: clientLimit === 'ALL' ? clients.length : clientLimit,
        metric,
        totalProductValue,
        availableStock: Number(availableStock) > 0 ? Number(availableStock) : totalProductValue,
        clients: clients.map((c, i) => ({
          ranking: c.ranking || i + 1,
          id_cliente: c.id_cliente,
          cliente: c.cliente,
          vendedor: c.vendedor,
          val: c.val,
          pctIndividual: c.pctIndividual,
          clasificacion: c.clasificacion,
          monthlyBreakdown:
            c.monthlyBreakdown ||
            (c.months
              ? Object.fromEntries(
                  Object.entries(c.months).map(([mName, val]: [string, any]) => [
                    mName,
                    metric === 'cajas' ? val.cajas : metric === 'kgs' ? val.kgs : val.monto,
                  ])
                )
              : {}),
        })),
      };

      const res = await fetch('/api/pareto/ai-distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}: Error al generar plan de distribución`);
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      console.error('Error generating AI distribution plan:', err);
      setError(err?.message || 'Error al conectar con el motor de IA.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !result && !isLoading) {
      generatePlan();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Export to Excel
  const handleExportExcel = () => {
    if (!result?.planDistribucion) return;

    const data = result.planDistribucion.map((row) => ({
      'Código Cliente': row.id_cliente,
      'Cliente / Razón Social': row.cliente,
      'Vendedor Asignado': row.vendedor,
      'Clasificación ABC': `Clase ${row.clasificacion}`,
      'Prioridad de Despacho': row.prioridad,
      '% Asignación Sugerida': `${row.pctSugerido}%`,
      [`Unidades Asignadas (${metric})`]: row.cajasSugeridas,
      'Justificación Comercial': row.justificacion,
      'Recomendación de Ruta': row.recomendacionRuta,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plan de Distribución IA');
    const safeName = product.nombre.replace(/[/\\?%*:|"<>]/g, '').slice(0, 20);
    XLSX.writeFile(
      wb,
      `Distribucion_IA_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c0c0e] border border-red-500/40 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_10px_50px_rgba(220,38,38,0.25)] overflow-hidden">
        {/* Top Gradient Stripe */}
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Plan de Distribución de Mercancía con IA
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600/20 text-red-300 border border-red-500/30">
                  {result?.source === 'gemini' ? 'Gemini 3.8 Flash' : 'Motor Analítico Codizulca'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-white font-bold">{product.nombre}</span>
                <span>• SKU: #{product.id}</span>
                <span>• Período: {monthsText}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {result && (
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-red-500" />
                <span>Exportar Excel</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stock Input & Controls Bar */}
        <div className="p-4 bg-zinc-900/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-xl px-3 py-1.5">
              <Package className="w-4 h-4 text-red-500 shrink-0" />
              <label htmlFor="stockInput" className="font-bold text-zinc-300 whitespace-nowrap">
                Lote de Mercancía a Distribuir:
              </label>
              <input
                id="stockInput"
                type="number"
                min="1"
                value={availableStock}
                onChange={(e) => setAvailableStock(Math.max(1, Number(e.target.value) || 0))}
                className="w-28 bg-zinc-900 border border-white/15 rounded-lg px-2 py-1 text-right font-mono font-bold text-white focus:outline-none focus:border-red-500"
              />
              <span className="text-zinc-400 uppercase font-mono">{metric}</span>
            </div>

            <button
              type="button"
              onClick={generatePlan}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-md shadow-red-600/25 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Analizando...' : 'Recalcular con IA'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <span>Muestra analizada:</span>
            <strong className="text-white font-mono">
              Top {clientLimit === 'ALL' ? clients.length : clientLimit} compradores
            </strong>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/5 bg-zinc-950">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'plan'
                ? 'border-red-500 text-white bg-white/[0.02]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-red-500" />
            <span>Asignación de Mercancía</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('estrategia')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'estrategia'
                ? 'border-red-500 text-white bg-white/[0.02]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Reglas de Despacho & Fuerza de Ventas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('variacion')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'variacion'
                ? 'border-red-500 text-white bg-white/[0.02]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Variación y Diagnóstico Intermensual</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-6 h-6 text-red-500" />
                </div>
                <RefreshCw className="w-5 h-5 animate-spin text-white absolute -top-1 -right-1" />
              </div>
              <h4 className="text-sm font-bold text-white">
                Analizando demanda con Gemini 3.8 Flash...
              </h4>
              <p className="text-xs text-zinc-400 max-w-md">
                Evaluando la variación de compras entre {monthsText} y calculando cuotas de despacho
                óptimas para evitar desabastecimiento.
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/30 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">Error al generar análisis</h4>
              <p className="text-xs text-red-300">{error}</p>
              <button
                type="button"
                onClick={generatePlan}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg"
              >
                Reintentar Análisis
              </button>
            </div>
          ) : result ? (
            <>
              {/* Resumen Ejecutivo Banner */}
              <div className="bg-gradient-to-br from-red-950/30 via-zinc-900 to-black border border-red-500/30 rounded-2xl p-4 shadow-inner space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                    Diagnóstico Estratégico de Demanda
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
                  {result.resumenEjecutivo}
                </p>
              </div>

              {/* TAB 1: TABLA DE PLAN DE ASIGNACIÓN */}
              {activeTab === 'plan' && (
                <div className="space-y-4">
                  {/* KPI Quick Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-950 border border-white/10 rounded-xl p-3">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                        Stock Asignado
                      </span>
                      <p className="text-lg font-black text-white font-mono mt-0.5">
                        {availableStock.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-zinc-400">{metric}</span>
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-white/10 rounded-xl p-3">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                        Blindaje Clase A
                      </span>
                      <p className="text-lg font-black text-red-400 font-mono mt-0.5">
                        {result.estrategiaDistribucion?.pctClaseA || 65}%
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-white/10 rounded-xl p-3">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                        Aceleración Clase B
                      </span>
                      <p className="text-lg font-black text-amber-400 font-mono mt-0.5">
                        {result.estrategiaDistribucion?.pctClaseB || 25}%
                      </p>
                    </div>

                    <div className="bg-zinc-950 border border-white/10 rounded-xl p-3">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                        Reserva Logística
                      </span>
                      <p className="text-lg font-black text-blue-400 font-mono mt-0.5">
                        {result.estrategiaDistribucion?.pctReservaEstrategica || 10}%
                      </p>
                    </div>
                  </div>

                  {/* Tabla de Asignación por Cliente */}
                  <div className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-3 border-b border-white/10 flex items-center justify-between bg-zinc-900/40 text-xs">
                      <span className="font-bold text-white uppercase tracking-wide">
                        Cuota Sugerida por Cliente ({result.planDistribucion.length} clientes)
                      </span>
                      <span className="text-zinc-400 text-[11px]">
                        Calculado con IA según histórico y variación intermensual
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-900 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-white/10">
                          <tr>
                            <th className="py-2.5 px-3">Cliente / Razón Social</th>
                            <th className="py-2.5 px-3">Vendedor</th>
                            <th className="py-2.5 px-3 text-center">Clase</th>
                            <th className="py-2.5 px-3 text-center">Prioridad</th>
                            <th className="py-2.5 px-3 text-right">% Sugerido</th>
                            <th className="py-2.5 px-3 text-right">Asignación ({metric})</th>
                            <th className="py-2.5 px-3">Justificación Comercial & Directiva de Ruta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {result.planDistribucion.map((row) => (
                            <tr key={row.id_cliente} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-white max-w-xs truncate" title={row.cliente}>
                                  {row.cliente}
                                </div>
                                <div className="text-[10px] text-zinc-500 font-mono">
                                  ID: #{row.id_cliente}
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-zinc-300 text-[11px] whitespace-nowrap">
                                {row.vendedor || '-'}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    row.clasificacion === 'A'
                                      ? 'bg-red-500/20 text-red-300'
                                      : row.clasificacion === 'B'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  {row.clasificacion}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide border ${
                                    row.prioridad === 'URGENTE_BLINDAJE'
                                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                      : row.prioridad === 'CRECIMIENTO_ESTRATEGICO'
                                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                  }`}
                                >
                                  {row.prioridad === 'URGENTE_BLINDAJE'
                                    ? 'Blindaje'
                                    : row.prioridad === 'CRECIMIENTO_ESTRATEGICO'
                                    ? 'Crecimiento'
                                    : 'Regular'}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-300">
                                {row.pctSugerido.toFixed(1)}%
                              </td>

                              <td className="py-2.5 px-3 text-right font-mono font-black text-white">
                                <span className="text-red-400">
                                  {row.cajasSugeridas.toLocaleString()}
                                </span>{' '}
                                <span className="text-[10px] font-normal text-zinc-500">{metric}</span>
                              </td>

                              <td className="py-2.5 px-3 text-[11px] text-zinc-300 max-w-sm">
                                <p className="line-clamp-2" title={row.justificacion}>
                                  {row.justificacion}
                                </p>
                                {row.recomendacionRuta && (
                                  <p className="text-[10px] text-amber-300/90 mt-0.5 line-clamp-1">
                                    🚗 {row.recomendacionRuta}
                                  </p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ESTRATEGIA & REGLAS DE DESPACHO */}
              {activeTab === 'estrategia' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Política de Despacho */}
                  <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-red-500" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Política y Criterio de Despacho
                      </h4>
                    </div>
                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 space-y-1.5 text-xs text-zinc-300">
                      <span className="text-[11px] text-zinc-400 font-bold uppercase">
                        Criterio de Asignación:
                      </span>
                      <p>{result.estrategiaDistribucion?.criterioAsignacion}</p>
                    </div>

                    <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 space-y-1.5 text-xs text-zinc-300">
                      <span className="text-[11px] text-zinc-400 font-bold uppercase">
                        Política Logística:
                      </span>
                      <p>{result.estrategiaDistribucion?.politicaDespacho}</p>
                    </div>
                  </div>

                  {/* Acciones para Fuerza de Ventas */}
                  <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Directivas para Supervisores y Vendedores
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {result.accionesFuerzaVentas?.map((acc, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 p-2.5 rounded-xl bg-zinc-900/40 border border-white/5 text-xs text-zinc-200"
                        >
                          <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>{acc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Alertas de Riesgo */}
                  <div className="md:col-span-2 bg-zinc-950 border border-red-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Alertas Comerciales & Riesgos Logísticos
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.alertasRiesgo?.map((alerta, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-xs text-red-200 flex items-start gap-2"
                        >
                          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <span>{alerta}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: VARIACIÓN INTERMENSUAL */}
              {activeTab === 'variacion' && (
                <div className="space-y-4">
                  <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Análisis Comparativo del Top en los Meses Seleccionados
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
                      {result.analisisVariacionTop}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
