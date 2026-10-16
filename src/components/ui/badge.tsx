import * as React from "react"
import { cn } from "../../lib/utils"

const badgeVariants = {
  default: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  primary: "bg-primary-100 text-primary-800 hover:bg-primary-200",
  success: "bg-green-100 text-green-800 hover:bg-green-200",
  warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  danger: "bg-red-100 text-red-800 hover:bg-red-200",
  outline: "text-gray-950 border border-gray-200",
}

export interface BadgeProps extends React.ComponentProps<"div"> {
  className?: string;
  children?: React.ReactNode;
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
