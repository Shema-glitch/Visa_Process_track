import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        pending: "bg-muted text-muted-foreground border border-border",
        in_progress: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
        completed: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
        locked: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  locked: AlertCircle,
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: "pending" | "in_progress" | "completed" | "locked"
  showIcon?: boolean
}

function StatusBadge({
  className,
  status,
  showIcon = true,
  ...props
}: StatusBadgeProps) {
  const Icon = statusIcons[status]

  return (
    <div className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {showIcon && <Icon className="size-3" />}
      <span className="capitalize">{status.replace("_", " ")}</span>
    </div>
  )
}

export { StatusBadge, statusBadgeVariants }
