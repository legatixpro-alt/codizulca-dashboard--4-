import React, { useState, useMemo } from 'react';
import { Download, Copy, Check, ChevronLeft, ChevronRight, Table as TableIcon, Layers, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface SqlResultsTableProps {
  columns: string[];
  rows: Record<string, any>[];
  totalCount: number;
  executionTimeMs?: number;
  sqlQuery?: string;
  onOpenInConsole?: (query: string) => void;
}

export const SqlResultsTable: React.FC<SqlResultsTableProps> = ({
  columns,
  rows,
  totalCount,
  executionTimeMs,
  sqlQuery,
  onOpenInConsole,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [copied, setCopied] = useState(false);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  // Format cell values smartly
  const formatCellValue = (colName: string, val: any): React.ReactNode => {
    if (val === null || val === undefined) {
      return <span className="text-zinc-600 italic">null</span>;
    }

    const colLower = colName.toLowerCase();

    // Numbers & Currencies
    if (typeof val === 'number') {
      if (colLower.includes('usd') || colLower.includes('monto') || colLower.includes('precio') || colLower.includes('venta') || colLower.includes('fa') || colLower.includes('dv') || colLower.includes('neto')) {
        const isNegative = val < 0;
        return (
          <span className={`font-mono font-bold ${isNegative ? 'text-red-400' : 'text-white'}`}>
            {isNegative ? '-$' : '$'}{Math.abs(val).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      }
      if (colLower.includes('pct') || colLower.includes('tasa') || colLower.includes('porcentaje')) {
        return <span className="font-mono text-zinc-300 font-medium">{val.toFixed(1)}%</span>;
      }
      if (colLower.includes('kg') || colLower.includes('kilo')) {
        return <span className="font-mono text-zinc-200">{val.toLocaleString('es-ES')} <span className="text-[10px] text-zinc-500">Kg</span></span>;
      }
      if (colLower.includes('caja')) {
        return <span className="font-mono text-zinc-200">{val.toLocaleString('es-ES')} <span className="text-[10px] text-zinc-500">Cj</span></span>;
      }
      return <span className="font-mono text-zinc-300">{val.toLocaleString('es-ES')}</span>;
    }

    // Pareto Badge
    if (colLower === 'pareto' && typeof val === 'string') {
      const p = val.toUpperCase();
      const color = p === 'A' ? 'bg-zinc-800 text-white border-white/20' : p === 'B' ? 'bg-red-950/60 text-red-300 border-red-600/30' : 'bg-black text-zinc-400 border-zinc-800';
      return <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${color}`}>Clase {p}</span>;
    }

    // Alert Level Badge
    if (colLower === 'nivel_alerta' || colLower === 'alerta') {
      const a = String(val).toUpperCase();
      const color = a === 'STOCK_BAJO' ? 'bg-red-950/80 text-red-400 border-red-600/40' : a === 'SOBRESTOCK' ? 'bg-zinc-800 text-zinc-200 border-white/20' : 'bg-black text-white border-white/10';
      return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${color}`}>{val}</span>;
    }

    // Modalidad Badge
    if (colLower === 'modalidad') {
      const m = String(val).toUpperCase();
      return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${m === 'PESABLE' ? 'bg-red-950/80 text-white border-red-600/60' : 'bg-zinc-900 text-zinc-300 border-white/10'}`}>
          {m}
        </span>
      );
    }

    // Client Code (#ID)
    if (colLower === 'codigo' && typeof val === 'string') {
      return <span className="font-mono text-zinc-200 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-white/10">{val}</span>;
    }

    return <span className="text-zinc-300 truncate max-w-[200px] block" title={String(val)}>{String(val)}</span>;
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Consulta_SQL');
      XLSX.writeFile(workbook, `codibot_sql_export_${Date.now()}.xlsx`);
    } catch (e) {
      console.error('Error exporting SQL result to Excel:', e);
    }
  };

  // Copy CSV to clipboard
  const handleCopyCsv = () => {
    try {
      const headerLine = columns.join('\t');
      const bodyLines = rows.map(r => columns.map(c => String(r[c] ?? '')).join('\t')).join('\n');
      navigator.clipboard.writeText(`${headerLine}\n${bodyLines}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Error copying CSV:', e);
    }
  };

  if (!columns || columns.length === 0 || rows.length === 0) {
    return (
      <div className="p-3 rounded-lg border border-white/5 bg-zinc-950/40 text-xs text-zinc-400 flex items-center gap-2">
        <TableIcon className="h-4 w-4 text-zinc-500" />
        <span>No se encontraron registros para la consulta ejecutada.</span>
      </div>
    );
  }

  return (
    <div className="my-2.5 rounded-xl border border-white/10 bg-zinc-950/80 shadow-lg overflow-hidden flex flex-col">
      {/* Header bar of SQL Results Table */}
      <div className="px-3 py-2 bg-zinc-900/90 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <TableIcon className="h-3 w-3 text-red-400" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">Resultados SQL</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5">
            {rows.length} {rows.length === 1 ? 'fila' : 'filas'} {totalCount > rows.length && `(de ${totalCount})`}
          </span>
          {executionTimeMs !== undefined && (
            <span className="text-[10px] text-zinc-500 font-mono">
              ⚡ {executionTimeMs} ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {sqlQuery && onOpenInConsole && (
            <button
              onClick={() => onOpenInConsole(sqlQuery)}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-medium text-zinc-300 border border-white/5 transition-colors cursor-pointer flex items-center gap-1"
              title="Abrir consulta en la consola SQL interactiva"
            >
              <Layers className="h-3 w-3 text-red-400" />
              <span>Consola SQL</span>
            </button>
          )}

          <button
            onClick={handleCopyCsv}
            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 transition-colors cursor-pointer"
            title="Copiar datos al portapapeles (TSV)"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-red-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={handleExportExcel}
            className="px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-[10px] font-semibold text-white shadow-sm transition-colors cursor-pointer flex items-center gap-1"
            title="Exportar a archivo Excel (.xlsx)"
          >
            <FileSpreadsheet className="h-3 w-3" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Table content */}
      <div className="overflow-x-auto max-h-[300px] scrollbar-thin scrollbar-thumb-zinc-700">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead className="sticky top-0 bg-zinc-900 border-b border-white/10 z-10">
            <tr>
              <th className="px-2.5 py-1.5 font-mono text-[10px] text-zinc-500 w-8 text-center border-r border-white/5">#</th>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-3 py-1.5 font-bold text-[11px] text-zinc-300 uppercase tracking-wider whitespace-nowrap bg-zinc-900/95"
                >
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedRows.map((row, rIdx) => {
              const rowNumber = (currentPage - 1) * pageSize + rIdx + 1;
              return (
                <tr
                  key={rIdx}
                  className="hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-2.5 py-1.5 font-mono text-[10px] text-zinc-500 text-center border-r border-white/5 bg-black/20">
                    {rowNumber}
                  </td>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 whitespace-nowrap text-xs">
                      {formatCellValue(col, row[col])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-3 py-1.5 bg-zinc-900/80 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-1">
            <span>Página <strong>{currentPage}</strong> de {totalPages}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-500">Total {rows.length} filas</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors text-zinc-300"
              title="Página anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[10px] text-zinc-400">{currentPage}/{totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors text-zinc-300"
              title="Página siguiente"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
