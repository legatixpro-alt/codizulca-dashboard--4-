import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  X as CloseIcon,
  Package as PackageIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Layers as LayersIcon,
  Users as UsersIcon,
  Store as StoreIcon,
  FileText as FileTextIcon,
  ArrowDownLeft as ArrowDownLeftIcon,
  Calendar as CalendarIcon,
  Download as DownloadIcon,
  CheckCircle2 as CheckCircle2Icon,
  Scale as ScaleIcon,
  Sparkles as SparklesIcon
} from 'lucide-react';
import { Product360Dossier, MonthlyEvolutionItem } from './types';

interface Product360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  idArticulo: number | null;
  productName?: string;
}

export const Product360Modal: React.FC<Product360ModalProps> = ({
  isOpen,
  onClose,
  idArticulo,
  productName
}) => {
  const [data, setData] = useState<Product360Dossier | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'evolucion' | 'facturacion' | 'clientes' | 'tiendas'>('evolucion');
  const [chartMetric, setChartMetric] = useState<'monto' | 'volumen' | 'precio'>('monto');

  useEffect(() => {
    if (!isOpen || !idArticulo) return;

    setIsLoading(true);
    fetch(`/api/inventory/product-360?id_articulo=${idArticulo}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.product) {
          setData(json);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching product 360 data:', err);
        setIsLoading(false);
      });
  }, [isOpen, idArticulo]);

  if (!isOpen) return null;

  const product = data?.product;
  const liveStats = data?.liveStats;
  const isPesable = product?.isPesable ?? false;
  const unit = isPesable ? 'kg' : 'cj';
  const unitLabel = isPesable ? 'Kilos (Kg)' : 'Cajas (Cj)';
  const unitName = isPesable ? 'Kilo' : 'Caja';

  const formatUSD = (val: number) => {
    return '$' + Math.round(val).toLocaleString('es-VE');
  };

  const formatCurrencyDetailed = (val: number) => {
    return (val < 0 ? '-$' : '$') + Math.abs(val).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Totales acumulados de la tabla de evolución
  const totalFA_Evo = data?.monthlyEvolution.reduce((acc, m) => acc + m.montoFA, 0) || 0;
  const totalDV_Evo = data?.monthlyEvolution.reduce((acc, m) => acc + m.montoDV, 0) || 0;
  const totalNet_Evo = data?.monthlyEvolution.reduce((acc, m) => acc + m.monto, 0) || 0;
  const totalVol_Evo = data?.monthlyEvolution.reduce((acc, m) => acc + m.primaryVolume, 0) || 0;
  const avgPriceGlobal = totalVol_Evo > 0 ? totalNet_Evo / totalVol_Evo : 0;

  // Exportar ficha 360° a Excel con datos exactos y sin mentiras
  const handleExportExcel = () => {
    if (!data) return;
    try {
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen General
      const summaryRows = [
        { Concepto: 'Código SKU (Supabase)', Valor: data.product.codigo },
        { Concepto: 'Descripción Oficial', Valor: data.product.articulo },
        { Concepto: 'Categoría Comercial', Valor: data.product.category },
        { Concepto: 'Modalidad de Comercialización', Valor: isPesable ? 'PESABLE (Venta estricta por peso/romana - Kilos)' : 'EMPACADO (Venta por empaque - Cajas)' },
        { Concepto: 'Unidad de Medida Oficial', Valor: unitLabel },
        { Concepto: 'Contabilización por Cajas Físicas', Valor: isPesable ? 'NO APLICA (Este producto no se vende por cajas, solo por peso)' : `${Math.round(data.product.totalCajas).toLocaleString('es-VE')} Cajas` },
        { Concepto: 'Facturación Bruta Acumulada ($ USD)', Valor: data.product.totalFA },
        { Concepto: 'Devoluciones Aplicadas ($ USD)', Valor: data.product.totalDV },
        { Concepto: 'Venta Neta Real ($ USD)', Valor: data.product.totalMonto },
        { Concepto: isPesable ? 'Kilos Netos Facturados (Kg)' : 'Cajas Físicas Despachadas (Cj)', Valor: data.product.primaryVolume },
        { Concepto: isPesable ? 'Precio Promedio Ponderado por Kilo ($/Kg)' : 'Precio Promedio Ponderado por Caja ($/Cj)', Valor: data.product.avgPricePerUnit },
        { Concepto: 'Tasa Global de Devolución (%)', Valor: `${data.product.returnRate.toFixed(2)}%` },
        { Concepto: 'Clientes Compradores Activos', Valor: data.liveStats.activeClientsCount },
        { Concepto: 'Transacciones Totales Auditadas', Valor: data.liveStats.totalTransactions },
        { Concepto: 'Fecha de Emisión del Reporte', Valor: new Date().toLocaleString('es-VE') }
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ficha Resumen 360');

      // Hoja 2: Evolución Mes a Mes
      const evoRows = data.monthlyEvolution.map((m) => ({
        Mes: m.mes,
        Facturacion_Bruta_FA_USD: m.montoFA,
        Devoluciones_DV_USD: m.montoDV,
        Venta_Neta_USD: m.monto,
        [isPesable ? 'Kilos_Netos_Kg' : 'Cajas_Fisicas_Cj']: m.primaryVolume,
        [isPesable ? 'Precio_Promedio_USD_Kg' : 'Precio_Promedio_USD_Cj']: m.avgPriceUnit,
        Participacion_Pct: `${m.share.toFixed(2)}%`,
        Crecimiento_MoM_Pct: `${m.momGrowth.toFixed(2)}%`
      }));
      const wsEvo = XLSX.utils.json_to_sheet(evoRows);
      XLSX.utils.book_append_sheet(wb, wsEvo, 'Evolución Mensual 2026');

      // Hoja 3: Top Clientes
      const clientRows = data.topClients.map((c) => ({
        Cliente: c.cliente,
        Facturado_FA_USD: c.totalFA,
        Devoluciones_DV_USD: c.totalDV,
        Venta_Neta_USD: c.netMonto,
        [isPesable ? 'Kilos_Adquiridos_Kg' : 'Cajas_Adquiridas_Cj']: isPesable ? c.kgs : c.boxes,
        [isPesable ? 'Precio_Promedio_USD_Kg' : 'Precio_Promedio_USD_Cj']: c.avgPrice || 0
      }));
      const wsClients = XLSX.utils.json_to_sheet(clientRows);
      XLSX.utils.book_append_sheet(wb, wsClients, 'Top Clientes');

      // Hoja 4: Auditorías de Stock en Tiendas
      if (data.storeAudits && data.storeAudits.length > 0) {
        const storeRows = data.storeAudits.map((s) => ({
          Tienda: s.store,
          Producto: s.product,
          Stock_Inicial: s.initialQuantity,
          Stock_Final: s.finalQuantity,
          Degustaciones_Merma: s.degustations,
          Promotor: s.promoter,
          Comentarios: s.comments,
          Fecha: s.date
        }));
        const wsStore = XLSX.utils.json_to_sheet(storeRows);
        XLSX.utils.book_append_sheet(wb, wsStore, 'Auditorias Stock Tiendas');
      }

      XLSX.writeFile(wb, `Dossier_360_${data.product.codigo}_${data.product.articulo.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.xlsx`);
    } catch (err) {
      console.error('Error exporting 360 to Excel:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in-50 duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-zinc-950 border border-white/15 rounded-2xl shadow-2xl overflow-hidden font-sans text-zinc-100">
        
        {/* 1. Header Oficial 360° */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/30">
                {product?.codigo || `SKU-${idArticulo}`}
              </span>

              {/* Badge Dinámico de Modalidad de Venta: PESABLE vs EMPACADO */}
              {isPesable ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-950/80 text-white border border-red-600/60 shadow-sm">
                  <ScaleIcon className="w-3 h-3 text-red-500" />
                  <span>PESABLE — VENTA POR KILO (KG)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-900 text-white border border-white/20 shadow-sm">
                  <PackageIcon className="w-3 h-3 text-zinc-300" />
                  <span>EMPACADO — VENTA POR CAJA (CJ)</span>
                </span>
              )}

              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                {product?.category || 'GENERAL'}
              </span>

              <span className="text-[10px] text-zinc-400 font-mono">
                CÓDIGO OFICIAL SUPABASE #{idArticulo}
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-wide">
              {product?.articulo || productName || 'Cargando producto...'}
            </h2>
            <p className="text-xs text-zinc-400">
              Dossier analítico 360° • Evolución mes a mes durante 2026, trazabilidad exacta de facturación, devoluciones y stock.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isLoading || !data}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 transition-colors disabled:opacity-50"
              title="Descargar Ficha 360° a Excel con datos exactos"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">Exportar 360°</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Cerrar ventana"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Cuerpo del Dashboard 360° */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          {isLoading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-zinc-400">
                Extrayendo historial completo y datos exactos de Supabase...
              </p>
            </div>
          ) : !data ? (
            <div className="py-24 text-center text-zinc-500">
              No se pudo cargar la información de este producto desde Supabase.
            </div>
          ) : (
            <>
              {/* Banner de Validación Operativa de Modalidad */}
              {isPesable ? (
                <div className="flex items-start sm:items-center gap-3 p-3.5 rounded-xl bg-red-950/40 border border-red-600/50 text-white text-xs shadow-sm">
                  <ScaleIcon className="w-5 h-5 shrink-0 text-red-500 mt-0.5 sm:mt-0" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-white uppercase tracking-wide flex items-center gap-2">
                      <span>Validación de Modalidad: Producto Pesable a la Balanza / Romana</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-600 text-white font-black">OFICIAL</span>
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      Este producto (cortes avícolas como el muslo, pechuga o carnes) <strong className="text-white">no se comercializa por cajas</strong>, sino estrictamente por <strong className="text-white">peso en Kilogramos (Kg)</strong>. El sistema ha ajustado las métricas de volumen a Kilos netos y el precio a $/Kg, garantizando información fidedigna sin contabilizaciones ficticias en cajas.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start sm:items-center gap-3 p-3.5 rounded-xl bg-zinc-900 border border-white/15 text-white text-xs shadow-sm">
                  <PackageIcon className="w-4 h-4 shrink-0 text-zinc-300 mt-0.5 sm:mt-0" />
                  <div>
                    <span className="font-bold text-white">Modalidad Estándar: Producto Empacado en Cajas. </span>
                    <span className="text-[11px] text-zinc-300">
                      Este artículo se comercializa y despacha por cajas físicas estándar que contienen unidades preempacadas de fábrica.
                    </span>
                  </div>
                </div>
              )}

              {/* Tarjetas KPI Superiores con Métricas Exactas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Venta Neta Real */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Venta Neta Real
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-white truncate">
                    {formatUSD(product?.totalMonto || 0)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Facturas menos notas DV
                  </div>
                </div>

                {/* 2. Facturación Bruta (FA) */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                    <FileTextIcon className="w-3 h-3 text-red-500" />
                    <span>Facturación (FA)</span>
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-white truncate">
                    {formatUSD(product?.totalFA || 0)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Total emitido en 2026
                  </div>
                </div>

                {/* 3. Volumen Despachado (Adaptado a PESABLE o CAJAS) */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                    {isPesable ? (
                      <>
                        <ScaleIcon className="w-3 h-3 text-red-500" />
                        <span>Kilos Facturados</span>
                      </>
                    ) : (
                      <>
                        <PackageIcon className="w-3 h-3 text-zinc-400" />
                        <span>Cajas Despachadas</span>
                      </>
                    )}
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-white truncate">
                    {Math.round(product?.primaryVolume || 0).toLocaleString('es-VE')}{' '}
                    <span className="text-xs text-red-400 font-bold">{unit}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {isPesable ? '0 cajas • Venta por peso' : 'Cajas físicas despachadas'}
                  </div>
                </div>

                {/* 4. Precio Promedio Ponderado por Unidad Real */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    {isPesable ? 'Precio Prom. / Kg' : 'Precio Prom. / Caja'}
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-zinc-200 truncate">
                    ${(product?.avgPricePerUnit || 0).toFixed(2)}{' '}
                    <span className="text-xs text-zinc-400 font-normal">/{unit}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {isPesable ? 'USD neto por kilogramo' : 'USD neto por caja'}
                  </div>
                </div>

                {/* 5. Tasa de Devolución Exacta */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                    <ArrowDownLeftIcon className="w-3 h-3 text-red-500" />
                    <span>Tasa de Devolución</span>
                  </span>
                  <div className={`text-base sm:text-lg font-black font-mono truncate ${
                    (product?.returnRate || 0) > 25 ? 'text-red-500' : 'text-zinc-200'
                  }`}>
                    {(product?.returnRate || 0).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {formatUSD(product?.totalDV || 0)} devueltos
                  </div>
                </div>

                {/* 6. Clientes Activos */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                    <UsersIcon className="w-3 h-3 text-zinc-400" />
                    <span>Clientes Activos</span>
                  </span>
                  <div className="text-base sm:text-lg font-black font-mono text-white truncate">
                    {liveStats?.activeClientsCount || 0}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Compraron en 2026
                  </div>
                </div>
              </div>

              {/* Navegación por Pestañas */}
              <div className="flex border-b border-white/10 gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('evolucion')}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === 'evolucion'
                      ? 'border-red-500 text-red-400 bg-red-500/10'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <TrendingUpIcon className="w-3.5 h-3.5" />
                  <span>Evolución Anual (Mes a Mes)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('facturacion')}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === 'facturacion'
                      ? 'border-red-500 text-red-400 bg-red-500/10'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <FileTextIcon className="w-3.5 h-3.5" />
                  <span>Facturas (FA) vs Devoluciones (DV)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('clientes')}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === 'clientes'
                      ? 'border-red-500 text-red-400 bg-red-500/10'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <UsersIcon className="w-3.5 h-3.5" />
                  <span>Distribución General & Top Clientes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tiendas')}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === 'tiendas'
                      ? 'border-red-500 text-red-400 bg-red-500/10'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <StoreIcon className="w-3.5 h-3.5" />
                  <span>Presencia en PDV ({data.storeAudits?.length || 0})</span>
                </button>
              </div>

              {/* PESTAÑA 1: EVOLUCIÓN ANUAL MES A MES */}
              {activeTab === 'evolucion' && (
                <div className="space-y-5 animate-in fade-in-50 duration-300">
                  {/* Selector de Métrica y Gráfico Dinámico */}
                  <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Evolución Temporal del Producto ({isPesable ? 'Ventas en Dólares, Kilos y Precio/Kg' : 'Ventas en Dólares, Cajas y Precio/Cj'})
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          {isPesable 
                            ? 'Este producto se comercializa y audita por peso neto en Kilogramos (Kg).' 
                            : 'Este producto se comercializa por empaque en Cajas Físicas (Cj).'}
                        </p>
                      </div>

                      <div className="inline-flex rounded-lg p-0.5 bg-zinc-950 border border-white/10 text-xs">
                        <button
                          type="button"
                          onClick={() => setChartMetric('monto')}
                          className={`px-3 py-1 rounded-md font-bold transition-all ${
                            chartMetric === 'monto' ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Ventas ($ USD)
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartMetric('volumen')}
                          className={`px-3 py-1 rounded-md font-bold transition-all ${
                            chartMetric === 'volumen' 
                              ? 'bg-zinc-800 text-white border border-white/20 shadow' 
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {isPesable ? 'Kilos (Kg)' : 'Cajas (Cj)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setChartMetric('precio')}
                          className={`px-3 py-1 rounded-md font-bold transition-all ${
                            chartMetric === 'precio' 
                              ? 'bg-zinc-800 text-white border border-white/20 shadow' 
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {isPesable ? 'Precio ($/Kg)' : 'Precio ($/Cj)'}
                        </button>
                      </div>
                    </div>

                    {/* Gráfico Recharts */}
                    <div className="h-64 sm:h-72 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.monthlyEvolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis
                            dataKey="mes"
                            stroke="#71717a"
                            fontSize={11}
                            tickLine={false}
                          />
                          <YAxis
                            stroke="#71717a"
                            fontSize={11}
                            tickLine={false}
                            tickFormatter={(v) => {
                              if (chartMetric === 'monto') return `$${Math.round(v / 1000)}k`;
                              if (chartMetric === 'precio') return `$${Number(v).toFixed(2)}`;
                              return `${Math.round(v)}`;
                            }}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '0.75rem', fontSize: '12px' }}
                            formatter={(value: any) => {
                              if (chartMetric === 'monto') {
                                return [formatUSD(Number(value)), 'Venta Neta'];
                              }
                              if (chartMetric === 'precio') {
                                return [`$${Number(value).toFixed(2)} / ${unit}`, isPesable ? 'Precio por Kilo' : 'Precio por Caja'];
                              }
                              return [
                                `${Math.round(Number(value)).toLocaleString('es-VE')} ${unit}`,
                                isPesable ? 'Kilos Netos' : 'Cajas'
                              ];
                            }}
                          />
                          <Bar
                            dataKey={chartMetric === 'monto' ? 'monto' : chartMetric === 'precio' ? 'avgPriceUnit' : 'primaryVolume'}
                            fill={chartMetric === 'monto' ? '#e00613' : chartMetric === 'precio' ? '#ffffff' : '#991b1b'}
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Tabla de Detalle Mensual Exacto */}
                  <div className="border border-white/10 rounded-xl overflow-hidden bg-zinc-950">
                    <div className="p-3 bg-zinc-900 border-b border-white/10 font-bold text-xs uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                      <span>Detalle Numérico Mes a Mes (Datos Reales 2026)</span>
                      <span className="text-[10px] text-zinc-400 font-mono font-normal">
                        Unidad Principal: <strong className="text-white">{unitLabel}</strong>
                        {isPesable && <span className="ml-1 text-red-400 font-bold">(Venta Exclusiva por Peso)</span>}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-zinc-900/60 text-zinc-400 font-bold uppercase tracking-wider border-b border-white/10">
                            <th className="p-3">Mes</th>
                            <th className="p-3 text-right">Facturación Bruta (FA)</th>
                            <th className="p-3 text-right">Devoluciones (DV)</th>
                            <th className="p-3 text-right">Venta Neta ($ USD)</th>
                            <th className="p-3 text-right">
                              {isPesable ? 'Kilos Netos (Kg)' : 'Cajas (Cj)'}
                            </th>
                            <th className="p-3 text-right">
                              {isPesable ? 'Precio Prom / Kg' : 'Precio Prom / Caja'}
                            </th>
                            <th className="p-3 text-right">Part. Anual</th>
                            <th className="p-3 text-right">Crecimiento MoM</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.monthlyEvolution.map((m) => (
                            <tr key={m.mes} className="hover:bg-white/[0.02]">
                              <td className="p-3 font-bold text-white flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5 text-red-500" />
                                <span>{m.mes} 2026</span>
                              </td>
                              <td className="p-3 text-right font-mono text-zinc-300">
                                {formatUSD(m.montoFA)}
                              </td>
                              <td className="p-3 text-right font-mono text-zinc-400">
                                {m.montoDV > 0 ? formatUSD(m.montoDV) : '$0'}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-white">
                                {formatUSD(m.monto)}
                              </td>
                              <td className="p-3 text-right font-mono text-white font-bold">
                                {Math.round(m.primaryVolume).toLocaleString('es-VE')} {unit}
                              </td>
                              <td className="p-3 text-right font-mono text-zinc-300">
                                ${m.avgPriceUnit.toFixed(2)}
                              </td>
                              <td className="p-3 text-right font-mono text-zinc-400">
                                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/5">
                                  {m.share.toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold">
                                {m.momGrowth === 0 ? (
                                  <span className="text-zinc-500">—</span>
                                ) : m.momGrowth > 0 ? (
                                  <span className="text-white flex items-center justify-end gap-1">
                                    <TrendingUpIcon className="w-3 h-3 text-red-500" /> +{m.momGrowth.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-red-400 flex items-center justify-end gap-1">
                                    <TrendingDownIcon className="w-3 h-3" /> {m.momGrowth.toFixed(1)}%
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-zinc-900 border-t-2 border-white/10 font-bold text-white text-xs">
                            <td className="p-3 uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                              <CheckCircle2Icon className="w-4 h-4 text-red-500" />
                              <span>TOTAL CONSOLIDADO (2026)</span>
                            </td>
                            <td className="p-3 text-right font-mono text-zinc-200">
                              {formatUSD(totalFA_Evo)}
                            </td>
                            <td className="p-3 text-right font-mono text-zinc-300">
                              {formatUSD(totalDV_Evo)}
                            </td>
                            <td className="p-3 text-right font-mono text-white text-sm">
                              {formatUSD(totalNet_Evo)}
                            </td>
                            <td className="p-3 text-right font-mono text-white text-sm">
                              {Math.round(totalVol_Evo).toLocaleString('es-VE')} {unit}
                            </td>
                            <td className="p-3 text-right font-mono text-zinc-200">
                              ${avgPriceGlobal.toFixed(2)} /{unit}
                            </td>
                            <td className="p-3 text-right font-mono text-zinc-300">
                              100%
                            </td>
                            <td className="p-3 text-right font-mono text-zinc-500">
                              —
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: FACTURAS VS DEVOLUCIONES EXACTAS */}
              {activeTab === 'facturacion' && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
                      <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider">
                        <FileTextIcon className="w-4 h-4 text-red-500" />
                        <span>Facturación Bruta (FA)</span>
                      </div>
                      <div className="text-2xl font-black font-mono text-white">
                        {formatUSD(product?.totalFA || 0)}
                      </div>
                      <p className="text-xs text-zinc-400">
                        Total emitido en facturas sin deducciones
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
                      <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider">
                        <ArrowDownLeftIcon className="w-4 h-4 text-red-500" />
                        <span>Devoluciones Aplicadas (DV)</span>
                      </div>
                      <div className="text-2xl font-black font-mono text-zinc-200">
                        {formatUSD(product?.totalDV || 0)}
                      </div>
                      <p className="text-xs text-zinc-400">
                        Notas de crédito y devoluciones de clientes
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
                      <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider">
                        <TrendingUpIcon className="w-4 h-4 text-red-500" />
                        <span>Venta Neta Efectiva</span>
                      </div>
                      <div className="text-2xl font-black font-mono text-white">
                        {formatUSD(product?.totalMonto || 0)}
                      </div>
                      <p className="text-xs text-zinc-400">
                        Ingreso neto consolidado para el negocio
                      </p>
                    </div>
                  </div>

                  {/* Comparativa de Volumen Despachado vs Devoluciones */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
                      <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider">
                        {isPesable ? <ScaleIcon className="w-4 h-4 text-red-500" /> : <PackageIcon className="w-4 h-4 text-zinc-300" />}
                        <span>{isPesable ? 'Kilos Brutos Facturados' : 'Cajas Brutas Emitidas'}</span>
                      </div>
                      <div className="text-2xl font-black font-mono text-white">
                        {Math.round(isPesable ? (liveStats?.totalKgsFA || product?.totalKgs || 0) : (liveStats?.totalBoxesFA || product?.totalCajas || 0)).toLocaleString('es-VE')}{' '}
                        <span className="text-xs text-zinc-400 font-normal">{unit}</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {isPesable ? 'Volumen bruto despachado según báscula' : 'Cajas totales despachadas de almacén'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
                      <div className="flex items-center gap-2 text-zinc-300 text-xs font-bold uppercase tracking-wider">
                        <ArrowDownLeftIcon className="w-4 h-4 text-red-500" />
                        <span>{isPesable ? 'Kilos Devueltos / Mermas' : 'Cajas Devueltas'}</span>
                      </div>
                      <div className="text-2xl font-black font-mono text-zinc-200">
                        {Math.round(isPesable 
                          ? ((product?.totalFA ? (product.totalDV / product.totalFA) * (product.totalKgs || 0) : 0)) 
                          : ((product?.totalFA ? (product.totalDV / product.totalFA) * (product.totalCajas || 0) : 0))
                        ).toLocaleString('es-VE')}{' '}
                        <span className="text-xs text-zinc-400 font-normal">{unit}</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {isPesable ? 'Ajustes de romana y devoluciones de ruta' : 'Averías y devoluciones comerciales'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2">
                      <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2Icon className="w-4 h-4 text-red-500" />
                        <span>{isPesable ? 'Kilos Netos Cobrados' : 'Cajas Netas Facturadas'}</span>
                      </div>
                      <div className="text-2xl font-black font-mono text-white">
                        {Math.round(product?.primaryVolume || 0).toLocaleString('es-VE')}{' '}
                        <span className="text-xs text-red-400 font-bold">{unit}</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Volumen neto consolidado cobrado en 2026
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/10 space-y-2 text-xs">
                    <span className="font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ScaleIcon className="w-4 h-4 text-red-500" />
                      <span>Diagnóstico Comercial y Operativo de Despacho:</span>
                    </span>
                    <p className="text-zinc-400 leading-relaxed">
                      Este artículo presenta una tasa global de devolución del <strong className="text-white">{(product?.returnRate || 0).toFixed(2)}%</strong> sobre las facturas brutas emitidas ({formatUSD(product?.totalDV || 0)} devueltos). 
                      {isPesable 
                        ? ' Al ser un producto pesable de origen avícola/cárnico (como el muslo o pollo), las notas de devolución se auditan por diferencias de gramaje en báscula en el local del cliente, mermas por cadena de frío o ajustes de romana en los camiones de reparto.'
                        : ' Por ser un producto empacado en cajas estándar, las notas de devolución se auditan por averías de empaque exterior o devoluciones comerciales de lote.'}
                    </p>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: DISTRIBUCIÓN GENERAL & TOP CLIENTES */}
              {activeTab === 'clientes' && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  {/* Desglose por Canales Comerciales (Información General del Mercado) */}
                  {data.channelDistribution && data.channelDistribution.length > 0 && (
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                          <LayersIcon className="w-4 h-4 text-red-500" />
                          <span>Distribución Comercial por Canales (Venta General Consolidada)</span>
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          Total Canales Activos: <strong className="text-white">{data.channelDistribution.length}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {data.channelDistribution.map((ch, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-zinc-950/80 border border-white/5 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-zinc-300 truncate" title={ch.channel}>
                                {ch.channel}
                              </span>
                              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-red-950/60 text-red-400 border border-red-900/40 font-mono">
                                {ch.pct}%
                              </span>
                            </div>
                            <div className="text-sm font-black font-mono text-white">
                              {formatUSD(ch.monto)}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-0.5">
                              <span>{ch.clientsCount} clientes</span>
                              <span>{Math.round(ch.volume).toLocaleString('es-VE')} {unit}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top Clientes Globales */}
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-zinc-950">
                      <div className="p-3 bg-zinc-900 border-b border-white/10 font-bold text-xs uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                        <span>Top 20 Clientes Compradores Globales ({isPesable ? 'Kg y $/Kg' : 'Cj y $/Cj'})</span>
                        <UsersIcon className="w-3.5 h-3.5 text-zinc-500" />
                      </div>
                      <div className="max-h-96 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                        {data.topClients.length === 0 ? (
                          <div className="p-8 text-center text-zinc-500 text-xs">
                            No hay clientes registrados para este producto.
                          </div>
                        ) : (
                          data.topClients.map((c, i) => (
                            <div key={i} className="p-3 hover:bg-white/[0.02] flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-white truncate" title={c.cliente}>
                                  {i + 1}. {c.cliente}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
                                  {c.canal && (
                                    <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-white/10 text-zinc-300">
                                      {c.canal}
                                    </span>
                                  )}
                                  <span className="text-zinc-300 font-bold">
                                    {isPesable 
                                      ? `${Math.round(c.kgs).toLocaleString('es-VE')} kg` 
                                      : `${Math.round(c.boxes).toLocaleString('es-VE')} cajas`}
                                  </span>
                                  <span>•</span>
                                  <span className="text-zinc-300">
                                    ${(c.avgPrice || 0).toFixed(2)} /{unit}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right font-mono font-bold text-white shrink-0">
                                {formatUSD(c.netMonto)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Top Vendedores */}
                    <div className="border border-white/10 rounded-xl overflow-hidden bg-zinc-950">
                      <div className="p-3 bg-zinc-900 border-b border-white/10 font-bold text-xs uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                        <span>Top Vendedores del Producto ({isPesable ? 'Kg y $/Kg' : 'Cj y $/Cj'})</span>
                        <PackageIcon className="w-3.5 h-3.5 text-zinc-500" />
                      </div>
                      <div className="max-h-96 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                        {data.topSellers.length === 0 ? (
                          <div className="p-8 text-center text-zinc-500 text-xs">
                            No hay vendedores registrados para este producto.
                          </div>
                        ) : (
                          data.topSellers.map((s, i) => (
                            <div key={i} className="p-3 hover:bg-white/[0.02] flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-white truncate">
                                  {i + 1}. {s.vendedor}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                                  <span className="text-zinc-300 font-bold">
                                    {isPesable 
                                      ? `${Math.round(s.kgs).toLocaleString('es-VE')} kg` 
                                      : `${Math.round(s.boxes).toLocaleString('es-VE')} cajas`}
                                  </span>
                                  <span>•</span>
                                  <span className="text-zinc-300">
                                    ${(s.avgPrice || 0).toFixed(2)} /{unit}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right font-mono font-bold text-white shrink-0">
                                {formatUSD(s.netMonto)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: AUDITORÍAS EN TIENDA */}
              {activeTab === 'tiendas' && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  {data.storeAudits && data.storeAudits.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.storeAudits.map((a) => (
                        <div
                          key={a.id}
                          className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2 text-xs shadow-md"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                            <span className="font-bold text-white truncate flex items-center gap-1.5">
                              <StoreIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span className="truncate">{a.store}</span>
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                              {a.date ? new Date(a.date).toLocaleDateString('es-VE') : ''}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <p className="text-[11px] text-zinc-300 font-medium truncate" title={a.product}>
                              {a.product}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Promotor: <strong className="text-zinc-300">{a.promoter}</strong>
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                            <div className="bg-zinc-950 p-2 rounded-lg">
                              <span className="text-[10px] text-zinc-500 block">Stock Inicial</span>
                              <span className="font-mono font-bold text-white text-sm">{a.initialQuantity}</span>
                            </div>
                            <div className="bg-zinc-950 p-2 rounded-lg">
                              <span className="text-[10px] text-zinc-500 block">Stock Final</span>
                              <span className="font-mono font-bold text-white text-sm">{a.finalQuantity}</span>
                            </div>
                          </div>

                          {a.comments && (
                            <p className="text-[10px] text-zinc-400 italic bg-zinc-950/40 p-1.5 rounded border border-white/5">
                              "{a.comments}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-zinc-900/30 border border-white/10 rounded-xl space-y-2">
                      <StoreIcon className="w-8 h-8 text-zinc-600 mx-auto" />
                      <p className="font-bold text-zinc-300 text-sm">
                        Sin auditorías de stock en piso de venta directo
                      </p>
                      <p className="text-xs text-zinc-500 max-w-md mx-auto">
                        Este producto se distribuye principalmente por canales de mayoreo y rutas de despacho, por lo que su trazabilidad operativa se concentra en las facturas y despachos de almacén.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 3. Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-zinc-900/80 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2Icon className="w-3.5 h-3.5 text-red-500" />
            <span>Datos 100% Reales extraídos del ERP y Supabase</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
