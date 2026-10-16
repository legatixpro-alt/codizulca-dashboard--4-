import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Package,
  Box,
  Tag,
  ChevronRight,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Scale,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
  Eye,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InventoryProduct } from '../components/inventario/types';
import { Product360Modal } from '../components/inventario/Product360Modal';

export const Productos: React.FC = () => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'TODAS',
    'AVÍCOLA',
    'CHARCUTERÍA',
    'LÁCTEOS',
    'CÁRNICOS',
    'VÍVERES',
    'GENERAL'
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedRotation, setSelectedRotation] = useState<string>('TODAS');
  const [selectedModalidad, setSelectedModalidad] = useState<string>('TODAS');
  const [sortBy, setSortBy] = useState<'monto' | 'volumen' | 'name' | 'sku'>('monto');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState<number>(1);
  const pageSize = viewMode === 'grid' ? 24 : 20;

  // Modal Dashboard 360°
  const [selectedProductFor360, setSelectedProductFor360] = useState<InventoryProduct | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchProducts = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (selectedCategory && selectedCategory !== 'TODAS') params.append('category', selectedCategory);
    if (selectedModalidad && selectedModalidad !== 'TODAS') params.append('unitType', selectedModalidad);

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
        console.error('Error al cargar productos del catálogo:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedModalidad]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Client-side filtering & sorting
  const filteredAndSortedProducts = useMemo(() => {
    let list = products.filter((p) => {
      if (selectedRotation !== 'TODAS' && p.rotation !== selectedRotation) {
        return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'monto') return b.totalMonto - a.totalMonto;
      if (sortBy === 'volumen') return b.primaryVolume - a.primaryVolume;
      if (sortBy === 'name') return a.articulo.localeCompare(b.articulo);
      if (sortBy === 'sku') return a.id_articulo - b.id_articulo;
      return 0;
    });

    return list;
  }, [products, selectedRotation, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSortedProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedProducts.slice(start, start + pageSize);
  }, [filteredAndSortedProducts, page, pageSize]);

  // Reset page when switching views or filters
  useEffect(() => {
    setPage(1);
  }, [viewMode, selectedCategory, selectedModalidad, selectedRotation, sortBy]);

  // Real KPI calculations from the complete database
  const totalSKUs = products.length;
  const totalMontoGlobal = products.reduce((acc, p) => acc + p.totalMonto, 0);
  const pesablesCount = products.filter((p) => p.isPesable).length;
  const pesablesKgs = products.filter((p) => p.isPesable).reduce((acc, p) => acc + p.totalKgs, 0);
  const empacadosCount = products.filter((p) => !p.isPesable).length;
  const empacadosCajas = products.filter((p) => !p.isPesable).reduce((acc, p) => acc + p.totalCajas, 0);
  const highRotationCount = products.filter((p) => p.rotation === 'ALTA').length;

  const formatUSD = (val: number) => {
    return '$' + Math.round(val).toLocaleString('es-VE');
  };

  const formatPrice = (val: number) => {
    return '$' + val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'AVÍCOLA':
      case 'CÁRNICOS':
        return 'bg-red-950/70 text-red-300 border-red-800/60';
      default:
        return 'bg-zinc-900 text-zinc-300 border-white/10';
    }
  };

  const getRotationBadge = (rotation: string) => {
    switch (rotation) {
      case 'ALTA':
        return 'bg-red-600 text-white border-red-500 font-bold shadow-sm';
      case 'MEDIA':
        return 'bg-zinc-800 text-zinc-200 border-white/10 font-medium';
      case 'BAJA':
      default:
        return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  // Export to Excel with clear separation of KG and CAJAS
  const handleExportToExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      const summaryRows = [
        { Concepto: 'Módulo', Valor: 'Catálogo Maestro de Productos — Codizulca' },
        { Concepto: 'Total SKUs en Base de Datos', Valor: totalSKUs },
        { Concepto: 'Facturación Acumulada 2026 ($ USD)', Valor: totalMontoGlobal },
        { Concepto: 'Productos Pesables por Kilo (Kg)', Valor: `${pesablesCount} SKUs (${Math.round(pesablesKgs).toLocaleString('es-VE')} kg)` },
        { Concepto: 'Productos Empacados por Caja (Cj)', Valor: `${empacadosCount} SKUs (${Math.round(empacadosCajas).toLocaleString('es-VE')} cj)` },
        { Concepto: 'SKUs Alta Rotación', Valor: highRotationCount },
        { Concepto: 'Filtro Modalidad Aplicado', Valor: selectedModalidad },
        { Concepto: 'Filtro Categoría Aplicado', Valor: selectedCategory },
        { Concepto: 'Fecha de Emisión', Valor: new Date().toLocaleString('es-VE') }
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Catálogo');

      const productRows = filteredAndSortedProducts.map((p) => ({
        Código_Articulo: p.id_articulo,
        Código_SKU: p.codigo,
        Descripción_Producto: p.articulo,
        Categoría: p.category,
        Modalidad_Medicion: p.isPesable ? 'PESABLE (VENTA POR KG)' : 'EMPACADO (VENTA POR CAJAS)',
        Unidad_Medida: p.isPesable ? 'Kilogramos (kg)' : 'Cajas Físicas (cj)',
        Ventas_Netas_USD: p.totalMonto,
        Facturado_Bruto_FA_USD: p.totalFA,
        Devoluciones_DV_USD: p.totalDV,
        Volumen_Kilos_Kg: p.isPesable ? p.totalKgs : 0,
        Volumen_Cajas_Cj: p.isPesable ? 'No Aplica (Pesable)' : p.totalCajas,
        Precio_Promedio_USD: p.avgPricePerUnit,
        Precio_Unitario_Referencia: p.isPesable ? `$${p.avgPricePerUnit.toFixed(2)} /kg` : `$${p.avgPricePerUnit.toFixed(2)} /caja`,
        Mes_Pico: p.peakMonth,
        Nivel_Rotación: p.rotation,
        Tasa_Devolución_Pct: `${p.returnRate.toFixed(2)}%`
      }));
      const wsProds = XLSX.utils.json_to_sheet(productRows);
      XLSX.utils.book_append_sheet(wb, wsProds, 'Maestro de Productos');

      XLSX.writeFile(wb, `Catalogo_Productos_Codizulca_KG_y_Cajas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error al exportar catálogo:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500 font-sans text-zinc-100 max-w-[1600px] mx-auto pb-12">
      {/* 1. Header Oficial del Catálogo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
              BASE DE DATOS OFICIAL
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              {totalSKUs > 0 ? `${totalSKUs} Productos Registrados` : 'Sincronizando...'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-widest text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] mt-1 flex items-center gap-2.5">
            <Box className="w-7 h-7 text-red-500" />
            CATÁLOGO DE PRODUCTOS
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Diferenciación exacta entre artículos medidos por <strong>Kilos (Kg)</strong> y <strong>Cajas (Cj)</strong> con análisis 360° en lo que va de año.
          </p>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />
            <span>Datos 2026 Auditados</span>
          </div>

          <button
            type="button"
            onClick={fetchProducts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
            title="Recargar catálogo desde la base de datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-500' : 'text-zinc-400'}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportToExcel}
            disabled={isExporting || products.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-[#e00613] border border-white/10 hover:border-red-500/50 text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-md"
            title="Exportar catálogo maestro completo a Excel con separación de unidades"
          >
            <Download className="w-3.5 h-3.5 text-red-400" />
            <span>{isExporting ? 'Exportando...' : 'Exportar Excel'}</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas KPI de Resumen y Auditoría de Modalidad */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Catálogo */}
        <div className="p-4 rounded-2xl bg-zinc-950/90 border border-white/10 shadow-lg space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-red-500" /> Total Artículos
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {totalSKUs} <span className="text-xs font-normal text-zinc-500">SKUs</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            Registrados en Base de Datos
          </div>
        </div>

        {/* Facturación Total Acumulada */}
        <div className="p-4 rounded-2xl bg-zinc-950/90 border border-white/10 shadow-lg space-y-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" /> Venta Acumulada
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {formatUSD(totalMontoGlobal)}
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            Movimiento comercial 2026
          </div>
        </div>

        {/* Métrica Destacada: PRODUCTOS POR KILO (KG) */}
        <div 
          onClick={() => setSelectedModalidad('PESABLES')}
          className={`p-4 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border transition-all cursor-pointer shadow-lg space-y-1 ${
            selectedModalidad === 'PESABLES' ? 'border-red-500 ring-2 ring-red-500/30 shadow-[0_0_20px_rgba(224,6,19,0.25)]' : 'border-white/10 hover:border-red-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-red-500" /> Venta por Kilos (Kg)
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 font-bold border border-red-700/60 font-mono">
              PESABLE
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {pesablesCount} <span className="text-xs font-normal text-zinc-400">SKUs</span>
          </div>
          <div className="text-[10px] text-red-400 font-mono font-bold truncate">
            {Math.round(pesablesKgs).toLocaleString('es-VE')} kg colocados
          </div>
        </div>

        {/* Métrica Destacada: PRODUCTOS POR CAJAS (CJ) */}
        <div 
          onClick={() => setSelectedModalidad('EMPACADOS')}
          className={`p-4 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 border transition-all cursor-pointer shadow-lg space-y-1 ${
            selectedModalidad === 'EMPACADOS' ? 'border-white ring-2 ring-white/20 shadow-lg' : 'border-white/10 hover:border-white/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-zinc-300" /> Venta por Cajas (Cj)
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-200 font-bold border border-white/15 font-mono">
              EMPACADO
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {empacadosCount} <span className="text-xs font-normal text-zinc-400">SKUs</span>
          </div>
          <div className="text-[10px] text-zinc-300 font-mono font-bold truncate">
            {Math.round(empacadosCajas).toLocaleString('es-VE')} cajas físicas
          </div>
        </div>

        {/* Artículos de Alta Rotación */}
        <div className="p-4 rounded-2xl bg-zinc-950/90 border border-white/10 shadow-lg space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-red-500" /> Alta Rotación
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-white truncate">
            {highRotationCount} <span className="text-xs font-normal text-zinc-500">artículos</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono">
            Ventas &gt; $50.000 USD
          </div>
        </div>
      </div>

      {/* 3. SELECTOR PRINCIPAL SEGMENTADO: KILOGRAMOS (KG) vs CAJAS (CJ) */}
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-2 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Opción 1: Todos los Productos */}
          <button
            type="button"
            onClick={() => setSelectedModalidad('TODAS')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedModalidad === 'TODAS'
                ? 'bg-zinc-800 text-white shadow-lg border border-white/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60 border border-transparent'
            }`}
          >
            <Layers className="w-4 h-4 text-zinc-400 shrink-0" />
            <div className="text-left sm:text-center">
              <div>TODOS LOS PRODUCTOS</div>
              <div className="text-[10px] text-zinc-400 font-mono font-normal">
                {totalSKUs} SKUs registrados
              </div>
            </div>
          </button>

          {/* Opción 2: Solo Productos por Kilos (Kg) */}
          <button
            type="button"
            onClick={() => setSelectedModalidad('PESABLES')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedModalidad === 'PESABLES'
                ? 'bg-[#e00613] text-white shadow-[0_0_25px_rgba(224,6,19,0.4)] border border-red-400 font-black scale-[1.01]'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-900 border border-white/10'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0 text-white" />
            <div className="text-left sm:text-center">
              <div>⚖️ SOLO PRODUCTOS POR KILOS (KG)</div>
              <div className={`text-[10px] font-mono font-normal ${selectedModalidad === 'PESABLES' ? 'text-zinc-100' : 'text-zinc-400'}`}>
                {pesablesCount} SKUs • {Math.round(pesablesKgs).toLocaleString('es-VE')} kg colocados
              </div>
            </div>
          </button>

          {/* Opción 3: Solo Productos por Cajas (Cj) */}
          <button
            type="button"
            onClick={() => setSelectedModalidad('EMPACADOS')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedModalidad === 'EMPACADOS'
                ? 'bg-white text-zinc-950 shadow-lg border border-white font-black scale-[1.01]'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-900 border border-white/10'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <div className="text-left sm:text-center">
              <div>📦 SOLO PRODUCTOS POR CAJAS (CJ)</div>
              <div className={`text-[10px] font-mono font-normal ${selectedModalidad === 'EMPACADOS' ? 'text-zinc-800' : 'text-zinc-400'}`}>
                {empacadosCount} SKUs • {Math.round(empacadosCajas).toLocaleString('es-VE')} cajas físicas
              </div>
            </div>
          </button>
        </div>

        {/* Leyenda aclaratoria sobre el criterio de medición exacta */}
        <div className="mt-2.5 px-3 py-2 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between text-[11px] gap-2">
          <div className="flex items-center gap-2 text-zinc-300">
            <Info className="w-4 h-4 text-red-500 shrink-0" />
            <span>
              <strong>Guía de Medición:</strong> Los productos <span className="text-red-400 font-bold">Pesables (Kg)</span> como pollo beneficiado, muslos, pechuga y carnes se auditan 100% por peso en balanza/romana (0 cajas). Los productos <span className="text-white font-bold">Empacados (Cajas)</span> como huevos y víveres se miden en cajas estándar de fábrica.
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-red-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
              Rojo = Kilos (Kg)
            </span>
            <span className="flex items-center gap-1 text-white font-bold">
              <span className="w-2 h-2 rounded-full bg-white inline-block"></span>
              Blanco = Cajas (Cj)
            </span>
          </div>
        </div>
      </div>

      {/* 4. Barra de Búsqueda, Filtros y Selector de Vista */}
      <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por código (ej. 629, SKU-8, SKU-21) o nombre del producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {/* Filtros Rápidos */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Categoría */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs">
              <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-zinc-900 text-white">
                    {c === 'TODAS' ? 'Todas las Categorías' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Rotación */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={selectedRotation}
                onChange={(e) => {
                  setSelectedRotation(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="TODAS" className="bg-zinc-900 text-white">Toda Rotación</option>
                <option value="ALTA" className="bg-zinc-900 text-white">Alta (&gt;$50k)</option>
                <option value="MEDIA" className="bg-zinc-900 text-white">Media ($10k-$50k)</option>
                <option value="BAJA" className="bg-zinc-900 text-white">Baja (&lt;$10k)</option>
              </select>
            </div>

            {/* Ordenamiento */}
            <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="monto" className="bg-zinc-900 text-white">Mayor Venta ($ USD)</option>
                <option value="volumen" className="bg-zinc-900 text-white">Mayor Volumen (Kg / Cj)</option>
                <option value="name" className="bg-zinc-900 text-white">Nombre (A-Z)</option>
                <option value="sku" className="bg-zinc-900 text-white">Código SKU</option>
              </select>
            </div>

            {/* Toggle Vista Fichas vs Tabla */}
            <div className="flex items-center bg-black/60 border border-white/10 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Vista de Fichas de Catálogo"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Fichas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Vista de Tabla Maestra"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tabla</span>
              </button>
            </div>
          </div>
        </div>

        {/* Indicador de Filtros Activos y Conteo */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-zinc-400 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-zinc-300">
              Mostrando {filteredAndSortedProducts.length} de {totalSKUs} productos registrados:
            </span>
            {selectedModalidad !== 'TODAS' && (
              <span className={`px-2 py-0.5 rounded font-black border ${
                selectedModalidad === 'PESABLES' 
                  ? 'bg-red-950/80 text-white border-red-600/60' 
                  : 'bg-zinc-900 text-white border-white/20'
              }`}>
                {selectedModalidad === 'PESABLES' ? '⚖️ Modalidad: Venta por Kilos (Kg)' : '📦 Modalidad: Venta por Cajas (Cj)'}
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
          </div>

          {(selectedCategory !== 'TODAS' || selectedModalidad !== 'TODAS' || selectedRotation !== 'TODAS' || searchTerm.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('TODAS');
                setSelectedModalidad('TODAS');
                setSelectedRotation('TODAS');
                setSearchTerm('');
              }}
              className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>
      </div>

      {/* 5. Contenido Principal: Fichas Visuales o Tabla Maestra */}
      {isLoading ? (
        <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-16 text-center space-y-4">
          <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h4 className="text-base font-bold text-white">Cargando Catálogo de Productos...</h4>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Sincronizando los 285 códigos de artículos, diferenciando unidades de peso (Kg) y cajas físicas desde la base de datos comercial.
          </p>
        </div>
      ) : filteredAndSortedProducts.length === 0 ? (
        <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-16 text-center space-y-3">
          <Box className="w-12 h-12 text-zinc-600 mx-auto" />
          <h4 className="text-base font-bold text-white">No se encontraron productos</h4>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            No hay artículos que coincidan con los criterios de búsqueda o filtros seleccionados.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('TODAS');
              setSelectedModalidad('TODAS');
              setSelectedRotation('TODAS');
              setSearchTerm('');
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISTA DE CUADRÍCULA / FICHAS DE PRODUCTO CON DIFERENCIACIÓN VISUAL CLARA */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4.5">
            {paginatedProducts.map((p) => {
              const isPesable = p.isPesable;

              return (
                <div
                  key={p.id_articulo}
                  onClick={() => setSelectedProductFor360(p)}
                  className={`rounded-2xl p-4.5 flex flex-col justify-between transition-all duration-200 cursor-pointer group hover:scale-[1.015] border bg-gradient-to-b from-zinc-900/60 via-zinc-950 to-black ${
                    isPesable
                      ? 'border-white/10 hover:border-red-600/70 hover:shadow-[0_8px_30px_rgba(224,6,19,0.18)]'
                      : 'border-white/10 hover:border-white/40 hover:shadow-[0_8px_30px_rgba(255,255,255,0.06)]'
                  }`}
                >
                  <div>
                    {/* BANNER DISTINTIVO SUPERIOR DE MODALIDAD */}
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      {isPesable ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/70 border border-red-600/50 text-white font-bold text-[11px] tracking-wide shadow-sm">
                          <Scale className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>MEDICIÓN: POR KILO (KG)</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/20 text-white font-bold text-[11px] tracking-wide shadow-sm">
                          <Package className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                          <span>MEDICIÓN: POR CAJAS (CJ)</span>
                        </div>
                      )}

                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${getCategoryColor(p.category)}`}>
                        {p.category}
                      </span>
                    </div>

                    {/* Fila de Códigos: SKU e ID Oficial */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-red-950/80 border border-red-700/60 text-white">
                          {p.codigo}
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400 font-bold bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">
                          ID #{p.id_articulo}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider ${getRotationBadge(p.rotation)}`}>
                        Rotación {p.rotation}
                      </span>
                    </div>

                    {/* Nombre Oficial del Producto */}
                    <h3 className="font-bold text-white text-sm leading-snug group-hover:text-red-400 transition-colors line-clamp-2 mb-3 min-h-[2.5rem]">
                      {p.articulo}
                    </h3>

                    {/* Métricas Principales con Estilo Corporativo Blanco, Rojo y Negro */}
                    <div className="py-2.5 space-y-2 text-xs border-t border-b border-white/5">
                      {/* Facturación Total en USD */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                          Ventas 2026:
                        </span>
                        <span className="font-mono font-black text-white text-sm">
                          {formatUSD(p.totalMonto)}
                        </span>
                      </div>

                      {/* Volumen Exacto (KG netos vs CAJAS físicas) */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
                          {isPesable ? (
                            <>
                              <Scale className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span>Kilos Facturados:</span>
                            </>
                          ) : (
                            <>
                              <Package className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>Cajas Físicas:</span>
                            </>
                          )}
                        </span>
                        <span className="font-mono font-black text-sm text-white">
                          {Math.round(p.primaryVolume).toLocaleString('es-VE')}{' '}
                          <span className="text-xs font-bold text-red-400">{isPesable ? 'kg' : 'cj'}</span>
                        </span>
                      </div>

                      {/* Precio Promedio Exacto */}
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">
                          {isPesable ? 'Precio por Kilo:' : 'Precio por Caja:'}
                        </span>
                        <span className="font-mono font-bold text-zinc-200">
                          {formatPrice(p.avgPricePerUnit)}{' '}
                          <span className="text-[10px] text-zinc-400 font-semibold">{isPesable ? '/kg' : '/cj'}</span>
                        </span>
                      </div>

                      {/* Mes Pico */}
                      {p.peakMonth && (
                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className="text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-zinc-500" />
                            Mes Pico:
                          </span>
                          <span className="font-bold text-white uppercase">
                            {p.peakMonth}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Micro-banner de certeza operativa en blanco, rojo y negro */}
                    <div className="mt-2.5 py-1 px-2 rounded-lg text-[10px] flex items-center justify-between font-mono font-bold bg-zinc-900 border border-white/10 text-zinc-300">
                      {isPesable ? (
                        <div className="w-full flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-white font-medium font-sans">
                            <Scale className="w-3 h-3 text-red-500" />
                            Balanza / Romana
                          </span>
                          <span className="text-red-400 font-mono font-bold">0 cajas • 100% Kilos</span>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-white font-medium font-sans">
                            <Package className="w-3 h-3 text-zinc-400" />
                            Bulto de Fábrica
                          </span>
                          <span className="text-zinc-400 font-mono font-bold">Caja cerrada estándar</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón de Acción para Ver Dashboard 360° */}
                  <div className="pt-3 border-t border-white/5 mt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductFor360(p);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-[#e00613] text-zinc-300 hover:text-white border border-white/10 hover:border-red-500 font-bold text-xs transition-all duration-200 group-hover:bg-[#e00613] group-hover:text-white group-hover:border-red-500 cursor-pointer shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Dashboard 360°</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VISTA DE TABLA MAESTRA DETALLADA CON DISTINCIÓN VISUAL DE MODALIDAD */
        <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px] text-xs">
              <thead>
                <tr className="bg-zinc-900/90 text-zinc-400 font-bold uppercase tracking-wider border-b border-white/10 text-[11px] select-none">
                  <th className="p-3.5 border-r border-white/10 min-w-[110px]">Código SKU</th>
                  <th className="p-3.5 border-r border-white/10 min-w-[260px]">
                    Producto (Haga clic para Dashboard 360°)
                  </th>
                  <th className="p-3.5 border-r border-white/10 min-w-[140px]">Medición Oficial</th>
                  <th className="p-3.5 border-r border-white/10 min-w-[120px]">Categoría</th>
                  <th className="p-3.5 text-right border-r border-white/10 min-w-[120px]">Venta Total ($)</th>
                  <th className="p-3.5 text-right border-r border-white/10 min-w-[140px]">Volumen Real</th>
                  <th className="p-3.5 text-right border-r border-white/10 min-w-[130px]">Precio Unitario</th>
                  <th className="p-3.5 text-center border-r border-white/10 min-w-[100px]">Mes Pico</th>
                  <th className="p-3.5 text-center border-r border-white/10 min-w-[90px]">Rotación</th>
                  <th className="p-3.5 text-center min-w-[130px]">Dashboard 360°</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedProducts.map((row) => {
                  const isPesable = row.isPesable;

                  return (
                    <tr
                      key={row.id_articulo}
                      onClick={() => setSelectedProductFor360(row)}
                      className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                        isPesable ? 'border-l-4 border-l-red-600' : 'border-l-4 border-l-zinc-700'
                      }`}
                    >
                      {/* Código SKU */}
                      <td className="p-3.5 border-r border-white/10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-black text-xs bg-red-950/80 text-white border border-red-700/60 group-hover:border-red-500 transition-colors">
                          {row.codigo}
                        </span>
                      </td>

                      {/* Producto */}
                      <td className="p-3.5 border-r border-white/10">
                        <span className="font-bold text-white group-hover:text-red-400 transition-colors block leading-snug">
                          {row.articulo}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          ID Base de Datos: #{row.id_articulo}
                        </span>
                      </td>

                      {/* Medición Oficial (KG vs CJ) */}
                      <td className="p-3.5 border-r border-white/10 font-bold">
                        {isPesable ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/70 text-white border border-red-600/50 text-[10px] uppercase font-bold">
                            <Scale className="w-3.5 h-3.5 text-red-500" />
                            <span>PESABLE (KG)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 text-white border border-white/15 text-[10px] uppercase font-bold">
                            <Package className="w-3.5 h-3.5 text-zinc-300" />
                            <span>EMPACADO (CJ)</span>
                          </span>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="p-3.5 border-r border-white/10">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${getCategoryColor(row.category)}`}>
                          {row.category}
                        </span>
                      </td>

                      {/* Venta Total */}
                      <td className="p-3.5 text-right border-r border-white/10 font-mono font-black text-white text-sm">
                        {formatUSD(row.totalMonto)}
                      </td>

                      {/* Volumen Real */}
                      <td className="p-3.5 text-right border-r border-white/10 font-mono font-black text-white">
                        {isPesable ? (
                          <span className="inline-flex items-center justify-end gap-1">
                            <Scale className="w-3 h-3 text-red-500" />
                            <span>{Math.round(row.primaryVolume).toLocaleString('es-VE')}</span>
                            <span className="text-red-400 font-bold text-xs">kg</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-end gap-1">
                            <Package className="w-3 h-3 text-zinc-400" />
                            <span>{Math.round(row.primaryVolume).toLocaleString('es-VE')}</span>
                            <span className="text-zinc-400 font-bold text-xs">cj</span>
                          </span>
                        )}
                      </td>

                      {/* Precio Unitario */}
                      <td className="p-3.5 text-right border-r border-white/10 font-mono">
                        <span className="text-zinc-200 font-bold">
                          {formatPrice(row.avgPricePerUnit)}{' '}
                          <span className="text-[10px] text-zinc-400">{isPesable ? '/kg' : '/cj'}</span>
                        </span>
                      </td>

                      {/* Mes Pico */}
                      <td className="p-3.5 text-center border-r border-white/10 uppercase font-mono font-bold text-zinc-300">
                        {row.peakMonth || '—'}
                      </td>

                      {/* Rotación */}
                      <td className="p-3.5 text-center border-r border-white/10">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${getRotationBadge(row.rotation)}`}>
                          {row.rotation}
                        </span>
                      </td>

                      {/* Acción 360° */}
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductFor360(row);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 hover:bg-[#e00613] text-zinc-300 hover:text-white border border-white/10 hover:border-red-500 text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver 360°</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Controles de Paginación */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs text-zinc-400">
          <div>
            Página <span className="font-bold text-white">{page}</span> de <span className="font-bold text-white">{totalPages}</span>{' '}
            <span className="text-zinc-500">({filteredAndSortedProducts.length} productos)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 cursor-pointer"
              title="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-zinc-200 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {/* Números de Página */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let pageNumber = page;
                if (totalPages <= 5) {
                  pageNumber = idx + 1;
                } else if (page <= 3) {
                  pageNumber = idx + 1;
                } else if (page >= totalPages - 2) {
                  pageNumber = totalPages - 4 + idx;
                } else {
                  pageNumber = page - 2 + idx;
                }

                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      page === pageNumber
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-zinc-200 cursor-pointer flex items-center gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 cursor-pointer"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 7. Modal Dashboard 360° de Detalle del Producto (Exacto al módulo de inventario) */}
      <Product360Modal
        isOpen={!!selectedProductFor360}
        onClose={() => setSelectedProductFor360(null)}
        idArticulo={selectedProductFor360?.id_articulo || null}
        productName={selectedProductFor360?.articulo}
      />
    </div>
  );
};
