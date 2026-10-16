import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  Database, 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  AlertCircle, 
  FileCode,
  Layers,
  TrendingUp,
  Package,
  Users,
  AlertTriangle
} from 'lucide-react';
import { SqlResultsTable } from './SqlResultsTable';

interface TableSchema {
  tableName: string;
  description: string;
  columns: {
    name: string;
    type: string;
    description: string;
    sample?: string;
  }[];
}

interface SqlConsolePanelProps {
  initialQuery?: string;
  onSendToChat?: (text: string) => void;
  selectedModel: string;
}

const SQL_TEMPLATES = [
  {
    title: 'Top 10 Clientes VIP ($ USD)',
    category: 'Clientes',
    icon: Users,
    sql: `SELECT codigo, nombre, sector, vendedor, supervisor, ROUND(monto_usd, 2) as venta_acumulada_usd, pareto FROM clientes WHERE pareto = 'A' ORDER BY monto_usd DESC LIMIT 10;`
  },
  {
    title: 'Ventas 2026 por Mes (FA vs DV)',
    category: 'Ventas',
    icon: TrendingUp,
    sql: `SELECT mes, ROUND(SUM(monto_fa_usd), 2) as facturado_fa, ROUND(ABS(SUM(monto_dv_usd)), 2) as devoluciones_dv, ROUND(SUM(monto_neto_usd), 2) as venta_neta_usd, ROUND(ABS(SUM(monto_dv_usd)) * 100.0 / NULLIF(SUM(monto_fa_usd), 0), 2) as tasa_devolucion_pct FROM ventas GROUP BY mes ORDER BY venta_neta_usd DESC;`
  },
  {
    title: 'Pesables (Kg) vs Cajas (Cj)',
    category: 'Inventario',
    icon: Package,
    sql: `SELECT modalidad, unidad_medida, COUNT(*) as total_skus, ROUND(SUM(ventas_totales_usd), 2) as venta_total_usd, ROUND(SUM(kilos_vendidos), 0) as total_kilos, ROUND(SUM(cajas_vendidas), 0) as total_cajas FROM inventario GROUP BY modalidad, unidad_medida;`
  },
  {
    title: 'Ventas por Categoría de Producto',
    category: 'Ventas',
    icon: Layers,
    sql: `SELECT categoria, COUNT(DISTINCT sku) as total_skus, ROUND(SUM(monto_neto_usd), 2) as venta_neta_usd, ROUND(SUM(cajas), 0) as cajas, ROUND(SUM(kilos), 0) as kilos FROM ventas WHERE categoria != 'GENERAL' GROUP BY categoria ORDER BY venta_neta_usd DESC;`
  },
  {
    title: 'Inventario Crítico (Stock Bajo)',
    category: 'Inventario',
    icon: AlertTriangle,
    sql: `SELECT sku, nombre, categoria, modalidad, unidad_medida, stock_actual, punto_reorden, rotacion, nivel_alerta FROM inventario WHERE nivel_alerta = 'STOCK_BAJO' OR rotacion = 'CRÍTICO' ORDER BY stock_actual ASC LIMIT 10;`
  },
  {
    title: 'Top Vendedores y Supervisores',
    category: 'Ventas',
    icon: Users,
    sql: `SELECT vendedor, supervisor, ROUND(SUM(monto_fa_usd), 2) as venta_bruta, ROUND(SUM(monto_neto_usd), 2) as venta_neta_usd, ROUND(SUM(cajas), 0) as cajas, ROUND(SUM(kilos), 0) as kilos FROM ventas WHERE vendedor != 'DISTRIBUCION CODIZULCA' GROUP BY vendedor, supervisor ORDER BY venta_neta_usd DESC LIMIT 10;`
  },
  {
    title: 'Concentración por Sector Comercial',
    category: 'Clientes',
    icon: Users,
    sql: `SELECT sector, COUNT(*) as cantidad_clientes, ROUND(SUM(monto_usd), 2) as venta_total_usd, ROUND(AVG(monto_usd), 2) as promedio_por_cliente FROM clientes GROUP BY sector ORDER BY venta_total_usd DESC LIMIT 8;`
  }
];

export const SqlConsolePanel: React.FC<SqlConsolePanelProps> = ({
  initialQuery,
  onSendToChat,
  selectedModel
}) => {
  const [query, setQuery] = useState(
    initialQuery || `SELECT codigo, nombre, sector, vendedor, ROUND(monto_usd, 2) as venta_usd, pareto FROM clientes WHERE pareto = 'A' ORDER BY monto_usd DESC LIMIT 10;`
  );
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [results, setResults] = useState<{
    columns: string[];
    rows: Record<string, any>[];
    totalCount: number;
    executionTimeMs: number;
  } | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedQuery, setCopiedQuery] = useState(false);

  // Sync initialQuery when changed from parent
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Load schemas from backend
  useEffect(() => {
    fetch('/api/codibot/schemas')
      .then(res => res.json())
      .then(data => {
        if (data.schemas) {
          setSchemas(data.schemas);
        }
      })
      .catch(err => console.warn('Could not load SQL schemas:', err));
  }, []);

  // Execute query
  const handleRunQuery = async (shouldGenerateAiSummary = false) => {
    if (!query.trim() || loading || analyzingAi) return;

    if (shouldGenerateAiSummary) {
      setAnalyzingAi(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch('/api/codibot/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          maxRows: 100,
          generateSummary: shouldGenerateAiSummary,
          model: selectedModel
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al ejecutar la consulta SQL.');
      }

      setResults({
        columns: data.columns || [],
        rows: data.rows || [],
        totalCount: data.totalCount || 0,
        executionTimeMs: data.executionTimeMs || 0
      });

      if (data.summary) {
        setExecutiveSummary(data.summary);
      } else if (!shouldGenerateAiSummary) {
        setExecutiveSummary(null);
      }
    } catch (err: any) {
      setError(err.message || 'Error de sintaxis o conexión.');
      setResults(null);
      setExecutiveSummary(null);
    } finally {
      setLoading(false);
      setAnalyzingAi(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(query);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-zinc-950/70 p-3 space-y-3 font-sans scrollbar-thin scrollbar-thumb-zinc-800">
      {/* Top Banner & Quick Templates */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center">
              <Terminal className="h-3.5 w-3.5 text-red-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Consola SQL Comercial</h3>
              <p className="text-[10px] text-zinc-400">Consulta directa sobre las tablas clientes, ventas e inventario</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-white/10 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
            SQLite Engine Activo
          </span>
        </div>

        {/* Quick query chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
          {SQL_TEMPLATES.map((tpl, idx) => {
            const Icon = tpl.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setQuery(tpl.sql);
                  setError(null);
                }}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-white/5 hover:border-red-500/30 text-[11px] text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm group"
                title={tpl.sql}
              >
                <Icon className="h-3 w-3 text-red-400 group-hover:scale-110 transition-transform" />
                <span>{tpl.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Database Schema Explorer (Collapsible) */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/80 overflow-hidden shadow-md">
        <div className="px-3 py-2 bg-zinc-900 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-300">Explorador de Tablas & Esquemas</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">clientes • ventas • inventario</span>
        </div>

        <div className="p-2 space-y-1.5 text-xs">
          {schemas.map(sch => {
            const isExp = expandedTable === sch.tableName;
            return (
              <div key={sch.tableName} className="rounded-lg border border-white/5 bg-zinc-950/40 overflow-hidden">
                <button
                  onClick={() => setExpandedTable(isExp ? null : sch.tableName)}
                  className="w-full px-2.5 py-1.5 flex items-center justify-between hover:bg-white/[0.02] text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isExp ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />}
                    <span className="font-mono font-bold text-red-400 text-xs">{sch.tableName}</span>
                    <span className="text-[10px] text-zinc-400 truncate max-w-[280px]">{sch.description}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{sch.columns.length} columnas</span>
                </button>

                {isExp && (
                  <div className="p-2 border-t border-white/5 bg-black/40 text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {sch.columns.map((c, cIdx) => (
                      <div key={cIdx} className="p-1 rounded bg-zinc-900/60 border border-white/5 flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-zinc-200 font-semibold">{c.name}</span>
                          <span className="font-mono text-[9px] text-red-300 bg-red-950/60 px-1 rounded">{c.type}</span>
                        </div>
                        <span className="text-[10px] text-zinc-400">{c.description}</span>
                        {c.sample && <span className="text-[9px] text-zinc-500 font-mono mt-0.5">ej: {c.sample}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SQL Editor Box */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/90 overflow-hidden shadow-lg flex flex-col">
        <div className="px-3 py-2 bg-zinc-900 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileCode className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-semibold text-zinc-200">Editor SQL</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] border border-white/5 transition-colors cursor-pointer flex items-center gap-1"
              title="Copiar consulta"
            >
              {copiedQuery ? <Check className="h-3 w-3 text-red-500" /> : <Copy className="h-3 w-3" />}
              <span>{copiedQuery ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={() => setQuery('')}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] border border-white/5 transition-colors cursor-pointer"
              title="Limpiar editor"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="p-2.5">
          <textarea
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            placeholder="Escribe tu consulta SELECT sobre clientes, ventas o inventario..."
            rows={4}
            className="w-full bg-black/60 text-xs font-mono text-zinc-100 p-2.5 rounded-lg border border-white/10 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-y leading-relaxed"
          />
        </div>

        {/* Action buttons */}
        <div className="px-3 py-2 bg-zinc-950/70 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] text-zinc-500">
            Solo consultas de lectura (SELECT / WITH). Máximo 100 filas.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunQuery(false)}
              disabled={loading || analyzingAi || !query.trim()}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5 border border-white/10 shadow-sm"
              title="Ejecutar consulta directamente"
            >
              <Play className="h-3.5 w-3.5 text-zinc-300" />
              <span>{loading ? 'Ejecutando...' : 'Ejecutar SQL'}</span>
            </button>

            <button
              onClick={() => handleRunQuery(true)}
              disabled={loading || analyzingAi || !query.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-950/40"
              title="Ejecutar consulta y generar resumen ejecutivo con Gemini"
            >
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span>{analyzingAi ? 'Analizando con Gemini...' : 'Ejecutar & Resumen IA'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl border border-red-500/30 bg-red-950/30 text-xs text-red-300 flex items-start gap-2 shadow-sm">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="block font-semibold">Error al ejecutar la consulta:</strong>
            <p className="mt-0.5 font-mono text-[11px]">{error}</p>
          </div>
        </div>
      )}

      {/* Executive Summary from Gemini (if generated) */}
      {executiveSummary && (
        <div className="rounded-xl border border-red-500/20 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-3.5 shadow-xl space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-red-600/30 border border-red-500/40 flex items-center justify-center">
                <Sparkles className="h-3 w-3 text-red-400" />
              </div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Resumen Ejecutivo Comercial (IA)</h4>
            </div>
            {onSendToChat && (
              <button
                onClick={() => onSendToChat(`Analicemos la consulta SQL: \`${query}\``)}
                className="text-[10px] text-red-400 hover:text-red-300 underline font-medium cursor-pointer"
              >
                Discutir en Chat
              </button>
            )}
          </div>

          <div className="prose prose-invert max-w-none text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
            {executiveSummary}
          </div>
        </div>
      )}

      {/* Query Results Table */}
      {results && (
        <div>
          <SqlResultsTable
            columns={results.columns}
            rows={results.rows}
            totalCount={results.totalCount}
            executionTimeMs={results.executionTimeMs}
            sqlQuery={query}
          />
        </div>
      )}
    </div>
  );
};
