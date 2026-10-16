import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Users,
  Search,
  Filter,
  Download,
  X,
  RefreshCw,
  TrendingUp,
  Award,
  Layers,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ParetoRowItem, ParetoMetric, MONTH_LABELS } from './paretoTypes';

export interface ProductBuyerItem {
  ranking: number;
  id_cliente: string;
  cliente: string;
  vendedor: string;
  supervisor: string;
  canal: string;
  zona: string;
  monto: number;
  cajas: number;
  kgs: number;
  facturasCount: number;
  pctCompras: number;
  pctAcumulado: number;
  clasificacion: 'A' | 'B' | 'C';
}

interface ProductBuyersDetailSectionProps {
  product: ParetoRowItem;
  selectedMonth: string;
  metric: ParetoMetric;
  onClose: () => void;
}

export const ProductBuyersDetailSection: React.FC<ProductBuyersDetailSectionProps> = ({
  product,
  selectedMonth,
  metric,
  onClose
}) => {
  const [data, setData] = useState<{
    product: any;
    stats: any;
    buyers: ProductBuyerItem[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtro de Límite de Clientes: Top 50, Top 20, Top 100, Todos (por defecto Top 50 según diseño)
  const [clientLimit, setClientLimit] = useState<'50' | '20' | '100' | 'ALL'>('50');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCanal, setSelectedCanal] = useState<string>('ALL');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('ALL');

  // Paginación interna
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  const fetchProductBuyers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/pareto/product-buyers?id_articulo=${product.id}&mes=${selectedMonth}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}: Error al obtener compradores del producto`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Error fetching product buyers:', err);
      setError(err?.message || 'Error al conectar con la base de datos de compradores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductBuyers();
  }, [product.id, selectedMonth]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [clientLimit, searchTerm, selectedCanal, selectedSupervisor]);

  // Canales disponibles para este producto
  const availableCanales = useMemo(() => {
    if (!data?.buyers) return [];
    const set = new Set<string>();
    data.buyers.forEach((b) => {
      if (b.canal) set.add(b.canal.trim());
    });
    return Array.from(set).sort();
  }, [data]);

  // Supervisores disponibles para este producto
  const availableSupervisors = useMemo(() => {
    return ['JOHNATAN SOTO', 'NELSON FINOL'];
  }, []);

  // Filtrado y Límite de Clientes
  const filteredBuyers = useMemo(() => {
    if (!data?.buyers) return [];

    let list = data.buyers;

    // 1. Filtro contextual de búsqueda
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.cliente.toLowerCase().includes(q) ||
          b.id_cliente.toLowerCase().includes(q) ||
          b.vendedor.toLowerCase().includes(q) ||
          b.canal.toLowerCase().includes(q)
      );
    }

    // 2. Filtro de Canal
    if (selectedCanal !== 'ALL') {
      list = list.filter((b) => b.canal === selectedCanal);
    }

    // 3. Filtro de Supervisor
    if (selectedSupervisor !== 'ALL') {
      list = list.filter((b) => b.supervisor === selectedSupervisor);
    }

    // 4. LÍMITE DE CLIENTES (Top 20, Top 50, Top 100, Todos)
    if (clientLimit !== 'ALL') {
      const maxCount = Number(clientLimit);
      list = list.slice(0, maxCount);
    }

    return list;
  }, [data, searchTerm, selectedCanal, selectedSupervisor, clientLimit]);

  // Paginación
  const totalPages = Math.ceil(filteredBuyers.length / itemsPerPage) || 1;
  const paginatedBuyers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBuyers.slice(start, start + itemsPerPage);
  }, [filteredBuyers, currentPage, itemsPerPage]);

  // Exportar compradores a Excel (.xlsx)
  const handleExportExcel = () => {
    if (!data?.buyers || data.buyers.length === 0) return;

    const exportRows = filteredBuyers.map((b) => ({
      Ranking: b.ranking,
      'Código Cliente': b.id_cliente,
      'Cliente / Razón Social': b.cliente,
      Canal: b.canal,
      Vendedor: b.vendedor,
      Supervisor: b.supervisor,
      Zona: b.zona,
      'Monto Comprado ($)': b.monto,
      'Cajas Compradas': b.cajas,
      'Kilos Comprados': b.kgs,
      'Facturas / Frecuencia': b.facturasCount,
      '% Compras del Producto': `${b.pctCompras}%`,
      '% Acumulado Producto': `${b.pctAcumulado}%`,
      'Clasificación en Producto': `Clase ${b.clasificacion}`
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    const sheetName = `Compradores SKU-${product.id}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const safeName = product.nombre.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 30);
    XLSX.writeFile(
      wb,
      `Compradores_Producto_${product.id}_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const monthLabel = MONTH_LABELS[selectedMonth] || selectedMonth;

  return (
    <div className="bg-zinc-950 border-2 border-red-600/70 rounded-2xl p-5 shadow-2xl space-y-5 animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
      {/* Top red glow accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-700" />

      {/* 1. Header con Producto Seleccionado y Acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-red-600/20 border border-red-500/40 text-red-500 shrink-0 mt-0.5">
            <Package className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-950 border border-red-600 text-red-300 font-mono">
                SKU #{product.id}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-900 border border-white/10 text-white">
                {data?.product?.category || 'CATEGORÍA COMERCIAL'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 border border-emerald-600/60 text-emerald-300">
                PRODUCTO SELECCIONADO
              </span>
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-black text-white tracking-wide mt-1">
              {product.nombre}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Auditoría y desglose de clientes compradores • Período:{' '}
              <strong className="text-white">{monthLabel}</strong> • Ranking General:{' '}
              <strong className="text-red-400">#{product.ranking}</strong>
            </p>
          </div>
        </div>

        {/* Acciones: Descargar Excel y Deseleccionar */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={!data?.buyers || data.buyers.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
            title="Exportar listado de compradores a Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Descargar Compradores Excel ({filteredBuyers.length})</span>
          </button>

          <button
            type="button"
            onClick={fetchProductBuyers}
            disabled={isLoading}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Actualizar datos del producto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-500' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-red-950 text-zinc-300 hover:text-white border border-white/10 hover:border-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            title="Deseleccionar y cerrar vista de compradores"
          >
            <X className="w-4 h-4 text-red-500" />
            <span>Deseleccionar</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas KPI de Métricas del Producto */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Monto Total */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-3 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Ventas Totales
            </span>
            <p className="text-lg font-black text-white mt-1">
              ${Math.round(data.product.totalMonto).toLocaleString('es-VE')}
            </p>
            <span className="text-[10px] text-zinc-500">Monto neto facturado</span>
          </div>

          {/* Cajas / Kilos */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-3 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Volumen ({data.product.unitLabel || 'Unidades'})
            </span>
            <p className="text-lg font-black text-white mt-1">
              {data.product.isPesable
                ? `${Math.round(data.product.totalKgs).toLocaleString('es-VE')} Kg`
                : `${Math.round(data.product.totalCajas).toLocaleString('es-VE')} Cj`}
            </p>
            <span className="text-[10px] text-zinc-500">
              {data.product.isPesable ? 'Pesable por Kg' : 'Empacado en Cajas'}
            </span>
          </div>

          {/* Total Compradores */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-3 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Clientes Compradores
            </span>
            <p className="text-lg font-black text-white mt-1">
              {data.stats.totalBuyers.toLocaleString('es-VE')}
            </p>
            <span className="text-[10px] text-zinc-500">Comercios activos</span>
          </div>

          {/* Precio Promedio */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-3 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Precio Promedio
            </span>
            <p className="text-lg font-black text-red-400 mt-1">
              ${(data.product.avgPricePerUnit || 0).toFixed(2)}
            </p>
            <span className="text-[10px] text-zinc-500">
              Por {data.product.isPesable ? 'Kg' : 'Caja'}
            </span>
          </div>

          {/* Concentración Top 1 */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-3 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Top 1 Comprador
            </span>
            <p className="text-lg font-black text-white mt-1">{data.stats.top1Pct}%</p>
            <span className="text-[10px] text-red-400 font-semibold truncate block">
              {data.buyers[0]?.cliente || 'N/A'}
            </span>
          </div>

          {/* Concentración Top 5 */}
          <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-3 shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Top 5 Compradores
            </span>
            <p className="text-lg font-black text-white mt-1">{data.stats.top5Pct}%</p>
            <span className="text-[10px] font-bold text-amber-400">
              Concentración {data.stats.concentrationLevel}
            </span>
          </div>
        </div>
      )}

      {/* 3. Barra de Filtros de Clientes Compradores (con el LÍMITE DE CLIENTES del prompt) */}
      <div className="bg-zinc-900/90 border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4">
        {/* COMPONENTE: LÍMITE DE CLIENTES (TOP 50, TOP 20, TOP 100, TODOS) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            LÍMITE DE CLIENTES
          </span>
          <div className="flex items-center bg-black/70 border border-white/10 rounded-xl p-1 gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => setClientLimit('50')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                clientLimit === '50'
                  ? 'bg-[#e00613] text-white shadow-md shadow-red-900/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Top 50
            </button>
            <button
              type="button"
              onClick={() => setClientLimit('20')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                clientLimit === '20'
                  ? 'bg-[#e00613] text-white shadow-md shadow-red-900/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Top 20
            </button>
            <button
              type="button"
              onClick={() => setClientLimit('100')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                clientLimit === '100'
                  ? 'bg-[#e00613] text-white shadow-md shadow-red-900/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Top 100
            </button>
            <button
              type="button"
              onClick={() => setClientLimit('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                clientLimit === 'ALL'
                  ? 'bg-[#e00613] text-white shadow-md shadow-red-900/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos
            </button>
          </div>
        </div>

        {/* Buscador y selectores de Canal y Supervisor */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Canal */}
          <select
            value={selectedCanal}
            onChange={(e) => setSelectedCanal(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Todos los Canales ({availableCanales.length})</option>
            {availableCanales.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Supervisor */}
          <select
            value={selectedSupervisor}
            onChange={(e) => setSelectedSupervisor(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-red-500"
          >
            <option value="ALL">Todos los Supervisores</option>
            {availableSupervisors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Buscador de clientes */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente comprador, RIF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 w-52 sm:w-64"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Tabla Detallada de Clientes Compradores */}
      <div className="border border-white/10 rounded-xl overflow-hidden shadow-xl bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/90 text-zinc-300 uppercase font-bold text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-3 text-center w-12">#</th>
                <th className="py-3 px-3">Cliente Comprador</th>
                <th className="py-3 px-3">Canal Comercial</th>
                <th className="py-3 px-3">Vendedor Asignado</th>
                <th className="py-3 px-3">Supervisor</th>
                <th className="py-3 px-3 text-right">Monto Comprado ($)</th>
                <th className="py-3 px-3 text-right">
                  {data?.product?.isPesable ? 'Kilos (Kg)' : 'Cajas (Cj)'}
                </th>
                <th className="py-3 px-3 text-center">Facturas</th>
                <th className="py-3 px-4 text-left w-52">
                  <div className="flex items-center justify-between">
                    <span>% de Compras</span>
                    <span className="text-[9px] text-red-400">del Producto</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-right">% Acum.</th>
                <th className="py-3 px-3 text-center">Clase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-500 mb-2" />
                    Cargando listado de clientes compradores del producto...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-red-400">
                    <p className="font-bold">{error}</p>
                    <button
                      type="button"
                      onClick={fetchProductBuyers}
                      className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs"
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              ) : paginatedBuyers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-zinc-500">
                    No se encontraron clientes compradores con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedBuyers.map((b) => {
                  const pctNum = b.pctCompras;
                  const isTop3 = b.ranking <= 3;
                  return (
                    <tr
                      key={`${b.id_cliente}-${b.ranking}`}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isTop3 ? 'bg-red-950/15' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-400">
                        {isTop3 ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black shadow-sm">
                            {b.ranking}
                          </span>
                        ) : (
                          b.ranking
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white max-w-sm truncate" title={b.cliente}>
                            {b.cliente}
                          </span>
                          {b.id_cliente && (
                            <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-zinc-900 border border-white/10 text-zinc-400">
                              #{b.id_cliente}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 border border-white/5">
                          {b.canal || 'GENERAL'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300 max-w-[140px] truncate" title={b.vendedor}>
                        {b.vendedor || 'SIN ASIGNAR'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 max-w-[130px] truncate">
                        {b.supervisor || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        ${Math.round(b.monto).toLocaleString('es-VE')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                        {data?.product?.isPesable
                          ? `${Math.round(b.kgs).toLocaleString('es-VE')} kg`
                          : `${Math.round(b.cajas).toLocaleString('es-VE')} cj`}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-400">
                        {b.facturasCount}
                      </td>

                      {/* PORCENTAJE DE COMPRAS (Barra visual y número exacto) */}
                      <td className="py-2.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-black text-red-400">{pctNum.toFixed(2)}%</span>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-red-600 to-red-400 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(3, pctNum * 2.5))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* % Acumulado */}
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-400">
                        {b.pctAcumulado.toFixed(1)}%
                      </td>

                      {/* Clasificación ABC en el producto */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            b.clasificacion === 'A'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : b.clasificacion === 'B'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          {b.clasificacion}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación de la tabla de compradores */}
        <div className="p-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 bg-zinc-900/40">
          <div>
            Mostrando{' '}
            <span className="text-white font-bold">
              {filteredBuyers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span>{' '}
            a{' '}
            <span className="text-white font-bold">
              {Math.min(currentPage * itemsPerPage, filteredBuyers.length)}
            </span>{' '}
            de <span className="text-white font-bold">{filteredBuyers.length}</span> compradores{' '}
            {clientLimit !== 'ALL' && (
              <span className="text-red-400 font-bold">
                (Filtro Límite: Top {clientLimit})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg border border-white/10 bg-black/40 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Anterior
            </button>
            <span className="px-3 py-1 font-bold text-white bg-zinc-900 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 rounded-lg border border-white/10 bg-black/40 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
