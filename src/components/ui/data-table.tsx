import * as React from "react"
import { cn } from "../../lib/utils"

export interface DataTableProps<T> extends React.ComponentProps<"div"> {
  className?: string;
  columns: {
    header: string
    accessorKey: keyof T | ((row: T) => React.ReactNode)
    className?: string
  }[]
  data: T[]
  isLoading?: boolean
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  className,
  ...props
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-gray-200 bg-white", className)} {...props}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={cn("px-6 py-3 font-medium text-gray-600", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-100"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                  No hay datos para mostrar.
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col, j) => (
                    <td key={j} className={cn("px-6 py-4", col.className)}>
                      {typeof col.accessorKey === 'function' 
                        ? col.accessorKey(row) 
                        : (row[col.accessorKey] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
