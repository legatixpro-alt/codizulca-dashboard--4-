import * as React from "react"
import { cn } from "../../lib/utils"
import { FolderSearch } from "lucide-react"

export interface EmptyStateProps extends React.ComponentProps<"div"> {
  className?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon = <FolderSearch className="h-10 w-10 text-gray-400" />,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center animate-in fade-in-50",
        className
      )}
      {...props}
    >
      <div className="mb-4 rounded-full bg-gray-100 p-3 shadow-sm">
        {icon}
      </div>
      <h3 className="mb-1 text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mb-4 text-sm text-gray-500 max-w-sm">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
