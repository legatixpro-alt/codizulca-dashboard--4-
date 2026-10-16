import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Package,
  AlertTriangle,
  Box,
  ArrowRight,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  BarChart3,
  Scale
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InventoryProduct } from '../components/inventario/types';
import { Product360Modal } from '../components/inventario/Product360Modal';

export const Inventario: React.FC = () => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<string[]>(['TODAS', 'AVÍCOLA', 'CHARCUTERÍA', 'LÁCTEOS', 'CÁRNICOS', 'VÍVERES', 'GENERAL']);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedRotation, setSelectedRotation] = useState<string>('TODAS');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('TODAS');
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // Modal 360°
  const [selectedProductFor360, setSelectedProductFor360] = useState<InventoryProduct | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchProducts = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (selectedCategory && selectedCategory !== 'TODAS') params.append('category', selectedCategory);
    if (selectedUnitType && selectedUnitType !== 'TODAS') params.append('unitType', selectedUnitType);

    fetch(`/api/inventory/products?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.products) {
          setProducts(json.products);
          if (json.summary?.categories) {
            setCategories(json.summary.categories);
          }
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching inventory products:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedUnitType]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchProducts();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filtrado por rotación en cliente
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedRotation !== 'TODAS' && p.rotation !== selectedRotation) {
        return false;
      }
      return true;
    });
  }, [products, selectedRotation]);

  // Paginación
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  // KPIs Generales del Inventario con segregación fidedigna de Kilos vs Cajas
  const totalSKUs = products.length;
  const totalMontoGral = products.reduce((acc, p) => acc + p.totalMonto, 0);
  const totalPesablesKgs = products.filter((p) => p.isPesable).reduce((acc, p) => acc + p.totalKgs, 0);
  const totalEmpacadosCajas = products.filter((p) => !p.isPesable).reduce((acc, p) => acc + p.totalCajas, 0);
  const highRotationCount = products.filter((p) => p.rotation === 'ALTA').length;

  const formatUSD = (val: number) => {
    return '$' + Math.round(val).toLocaleString('es-VE');
  };

  // Exportar catálogo completo a Excel con datos exactos y sin mentiras
  const handleExportToExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Hoja de Resumen
      const summaryRows = [
        { Concepto: 'Módulo', Valor: 'Inventario & Stock — Catálogo Maestro de Productos' },
        { Concepto: 'Fuente de Datos', Valor: 'Supabase Oficial (history_sales & inventory)' },
        { Concepto: 'Total SKUs Registrados', Valor: totalSKUs },
        { Concepto: 'Facturación Total Acumulada ($)', Valor: totalMontoGral },
        { Concepto: 'Volumen Pesable (Kilos Netos - Muslos/Pollos/Carnes)', Valor: totalPesablesKgs },
        { Concepto: 'Volumen Empacado (Cajas Físicas - Víveres/Lácteos)', Valor: totalEmpacadosCajas },
        { Concepto: 'Filtro Modalidad', Valor: selectedUnitType },
        { Concepto: 'Filtro Categoría', Valor: selectedCategory },
        { Concepto: 'Filtro Rotación', Valor: selectedRotation },
        { Concepto: 'Fecha de Descarga', Valor: new Date().toLocaleString('es-VE') }
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Inventario');

      // Hoja de Productos
      const productRows = filteredProducts.map((p) => ({
        Código_Articulo: p.id_articulo,
        Código_SKU: p.codigo,
        Descripción: p.articulo,
        Categoría: p.category,
        Modalidad_Venta: p.modalidad || (p.isPesable ? 'PESABLE' : 'EMPACADO'),
        Unidad_Medida: p.unitLabel,
        Ventas_USD: p.totalMonto,
        Volumen_Kilos: p.isPesable ? p.totalKgs : p.totalKgs,
        Volumen_Cajas: p.isPesable ? 'No Aplica (Pesable)' : p.totalCajas,
        Precio_Promedio_USD: p.avgPricePerUnit,
        Mes_Pico: p.peakMonth,
        Nivel_Rotación: p.rotation
      }));
      const wsProds = XLSX.utils.json_to_sheet(productRows);
      XLSX.utils.book_append_sheet(wb, wsProds, 'Catálogo Maestro de SKUs');

      XLSX.writeFile(wb, `Inventario_Stock_Codizulca_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error exporting inventory to Excel:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500 font-sans text-zinc-100 max-w-[1600px] mx-auto pb-10">
      {/* 1. Header Oficial de Inventario y Stock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
              SUPABASE OFICIAL
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              285 Códigos de Productos Sincronizados
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] mt-1">
            INVENTARIO & STOCK
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Maestro oficial de códigos de productos, volumen de stock, rotación y evolución temporal 360°.
          </p>
        </div>

        {/* Status y Botón Actualizar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />
            <span>ERP + Supabase en Vivo</span>
          </div>

          <button
            type="button"
            onClick={fetchProducts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 transition-colors"
            title="Recargar datos de inventario"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-500' : 'text-zinc-400'}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas KPI de Resumen General */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total SKUs */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 shadow-lg space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-red-500" /> Total SKUs / Códigos
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {totalSKUs} <span className="text-xs font-normal text-zinc-500">artículos</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            Códigos id_articulo Supabase
          </div>
        </div>

        {/* Facturación Anual Acumulada */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 shadow-lg space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" /> Venta Acumulada
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {formatUSD(totalMontoGral)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            Movimiento en divisas 2026
          </div>
        </div>

        {/* Volumen Pesable (Kilos Netos) */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-red-500/30 shadow-lg space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-red-500" /> Volumen Pesable
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {Math.round(totalPesablesKgs).toLocaleString('es-VE')} <span className="text-xs font-normal text-red-400">kg</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono truncate">
            Muslo, pollo, res y carnes
          </div>
        </div>

        {/* Volumen Empacado (Cajas Físicas) */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 shadow-lg space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-300 uppercase tracking-wider block flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-zinc-400" /> Volumen Empacado
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {Math.round(totalEmpacadosCajas).toLocaleString('es-VE')} <span className="text-xs font-normal text-zinc-400">cj</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono truncate">
            Víveres, lácteos y enlatados
          </div>
        </div>

        {/* SKUs Alta Rotación */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-white/10 shadow-lg space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-red-500" /> Alta Rotación
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {highRotationCount} <span className="text-xs font-normal text-zinc-500">SKUs clave</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            Ventas &gt; $50,000 en 2026
          </div>
        </div>
      </div>

      {/* 3. Barra de Búsqueda y Filtros */}
      <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por código (ej. 629, SKU-1549) o nombre de producto (ej. muslo)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {/* Filtros Rápidos */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro Modalidad (Pesable vs Empacado) */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-white/10 rounded-lg text-xs">
              <Scale className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={selectedUnitType}
                onChange={(e) => {
                  setSelectedUnitType(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer py-1"
              >
                <option value="TODAS" className="bg-zinc-900">Todas las Modalidades</option>
                <option value="PESABLES" className="bg-zinc-900">⚖️ Pesables (Venta por Kg)</option>
                <option value="EMPACADOS" className="bg-zinc-900">📦 Empacados (Venta por Cajas)</option>
              </select>
            </div>

            {/* Filtro Categoría */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-white/10 rounded-lg text-xs">
              <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer py-1"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-zinc-900">
                    {c === 'TODAS' ? 'Todas las Categorías' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Rotación */}
            <div className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 border border-white/10 rounded-lg text-xs">
              <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={selectedRotation}
                onChange={(e) => {
                  setSelectedRotation(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer py-1"
              >
                <option value="TODAS" className="bg-zinc-900">Toda Rotación</option>
                <option value="ALTA" className="bg-zinc-900">Alta Rotación (&gt;$50k)</option>
                <option value="MEDIA" className="bg-zinc-900">Media Rotación ($10k-$50k)</option>
                <option value="BAJA" className="bg-zinc-900">Baja Rotación (&lt;$10k)</option>
              </select>
            </div>

            {/* Botón Exportar Catálogo */}
            <button
              type="button"
              onClick={handleExportToExcel}
              disabled={isExporting || products.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 transition-colors disabled:opacity-50"
              title="Descargar catálogo maestro a Excel"
            >
              <Download className="h-3.5 w-3.5 text-red-500" />
              <span>{isExporting ? 'Exportando...' : 'Exportar a Excel'}</span>
            </button>
          </div>
        </div>

        {/* Indicador de Filtros Activos */}
        {(selectedUnitType !== 'TODAS' || selectedCategory !== 'TODAS' || selectedRotation !== 'TODAS' || searchTerm.trim()) && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-[11px] text-zinc-400 flex-wrap">
            <span>Filtros activos:</span>
            {selectedUnitType !== 'TODAS' && (
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-red-600/40 text-white font-bold">
                Modalidad: {selectedUnitType === 'PESABLES' ? 'Pesables (Kg)' : 'Empacados (Cajas)'}
              </span>
            )}
            {selectedCategory !== 'TODAS' && (
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300 font-bold">
                Categoría: {selectedCategory}
              </span>
            )}
            {selectedRotation !== 'TODAS' && (
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300 font-bold">
                Rotación: {selectedRotation}
              </span>
            )}
            {searchTerm.trim() && (
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300 font-bold">
                Búsqueda: "{searchTerm}"
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedUnitType('TODAS');
                setSelectedCategory('TODAS');
                setSelectedRotation('TODAS');
                setSearchTerm('');
              }}
              className="text-red-400 hover:underline text-[10px] font-bold ml-auto"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* 4. Tabla Maestra de Productos / SKUs */}
      <div className="bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1150px] text-xs">
            <thead>
              <tr className="bg-zinc-900/90 text-zinc-400 font-bold uppercase tracking-wider border-b border-white/10 text-[11px] select-none">
                <th className="p-3.5 border-r border-white/10 min-w-[110px]">Código SKU</th>
                <th className="p-3.5 border-r border-white/10 min-w-[260px]">
                  Producto (Haga clic para Dashboard 360°)
                </th>
                <th className="p-3.5 border-r border-white/10 min-w-[120px]">Categoría</th>
                <th className="p-3.5 border-r border-white/10 min-w-[130px]">Modalidad</th>
                <th className="p-3.5 text-right border-r border-white/10 min-w-[120px]">Venta Total ($)</th>
                <th className="p-3.5 text-right border-r border-white/10 min-w-[120px]">Volumen (Kg / Cj)</th>
                <th className="p-3.5 text-right border-r border-white/10 min-w-[120px]">Precio Promedio</th>
                <th className="p-3.5 text-center border-r border-white/10 min-w-[100px]">Mes Pico</th>
                <th className="p-3.5 text-center border-r border-white/10 min-w-[90px]">Rotación</th>
                <th className="p-3.5 text-center min-w-[110px]">Acción 360°</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-16 text-center text-zinc-400 space-y-3">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="font-bold">Cargando códigos de productos desde Supabase...</p>
                  </td>
                </tr>
              ) : paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-16 text-center text-zinc-500">
                    No se encontraron productos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((row) => {
                  return (
                    <tr
                      key={row.id_articulo}
                      onClick={() => setSelectedProductFor360(row)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      {/* Código SKU (id_articulo de Supabase) */}
                      <td className="p-3.5 border-r border-white/10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-black text-xs bg-red-600/20 text-red-400 border border-red-500/30 group-hover:border-red-500 transition-colors">
                          {row.codigo}
                        </span>
                      </td>

                      {/* Producto / Nombre */}
                      <td className="p-3.5 border-r border-white/10">
                        <span className="font-bold text-white group-hover:text-red-400 transition-colors block leading-snug">
                          {row.articulo}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ID Supabase: #{row.id_articulo}
                        </span>
                      </td>

                      {/* Categoría */}
                      <td className="p-3.5 border-r border-white/10">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          row.category === 'AVÍCOLA' || row.category === 'CÁRNICOS'
                            ? 'bg-red-950/80 text-red-200 border border-red-700/60'
                            : 'bg-zinc-900 text-zinc-300 border border-white/10'
                        }`}>
                          {row.category}
                        </span>
                      </td>

                      {/* Modalidad: PESABLE vs EMPACADO */}
                      <td className="p-3.5 border-r border-white/10">
                        {row.isPesable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-950/80 text-white border border-red-600/60">
                            <Scale className="w-3 h-3 text-red-500" />
                            <span>PESABLE (Kg)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-zinc-900 text-white border border-white/20">
                            <Package className="w-3 h-3 text-zinc-300" />
                            <span>EMPACADO (Cj)</span>
                          </span>
                        )}
                      </td>

                      {/* Venta Total ($ USD) */}
                      <td className="p-3.5 text-right font-mono font-bold text-white border-r border-white/10">
                        {formatUSD(row.totalMonto)}
                      </td>

                      {/* Volumen Real (Kg o Cajas) */}
                      <td className="p-3.5 text-right font-mono font-medium border-r border-white/10">
                        {row.isPesable ? (
                          <span className="text-white font-bold">
                            {Math.round(row.totalKgs).toLocaleString('es-VE')} <span className="text-[10px] text-red-400 font-bold">kg</span>
                          </span>
                        ) : (
                          <span className="text-white font-medium">
                            {Math.round(row.totalCajas).toLocaleString('es-VE')} <span className="text-[10px] text-zinc-400 font-normal">cj</span>
                          </span>
                        )}
                      </td>

                      {/* Precio Promedio Ponderado */}
                      <td className="p-3.5 text-right font-mono border-r border-white/10">
                        {row.isPesable ? (
                          <span className="text-zinc-200 font-bold">
                            ${row.avgPricePerUnit.toFixed(2)} <span className="text-[10px] text-zinc-400 font-normal">/kg</span>
                          </span>
                        ) : (
                          <span className="text-zinc-300">
                            ${row.avgPricePerUnit.toFixed(2)} <span className="text-[10px] text-zinc-500 font-normal">/cj</span>
                          </span>
                        )}
                      </td>

                      {/* Mes Pico */}
                      <td className="p-3.5 text-center font-mono text-xs text-zinc-400 border-r border-white/10">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/5 font-bold text-white">
                          {row.peakMonth}
                        </span>
                      </td>

                      {/* Rotación */}
                      <td className="p-3.5 text-center border-r border-white/10">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          row.rotation === 'ALTA'
                            ? 'bg-red-950/80 text-white border border-red-700/60'
                            : row.rotation === 'MEDIA'
                            ? 'bg-zinc-900 text-zinc-200 border border-white/20'
                            : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                        }`}>
                          {row.rotation}
                        </span>
                      </td>

                      {/* Botón Ver 360° */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductFor360(row);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold transition-all shadow-sm"
                          title="Abrir Dashboard 360° con la evolución completa del producto"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Ver 360°</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="p-4 border-t border-white/10 bg-zinc-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-zinc-500 font-mono">
            Página <strong className="text-white">{page}</strong> de <strong className="text-white">{totalPages}</strong> • Mostrando {paginatedProducts.length} de {filteredProducts.length} productos
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 font-bold text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 font-bold text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* 5. Modal / Dashboard 360° del Producto */}
      <Product360Modal
        isOpen={Boolean(selectedProductFor360)}
        onClose={() => setSelectedProductFor360(null)}
        idArticulo={selectedProductFor360?.id_articulo || null}
        productName={selectedProductFor360?.articulo}
      />
    </div>
  );
};
