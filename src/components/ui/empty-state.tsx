import * as React from "react"
import { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
}

function EmptyState({
  className,
  icon: Icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center animate-in fade-in zoom-in duration-300",
        className
      )}
      {...props}
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground/60 shadow-inner">
        <Icon className="size-8" />
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {action && (
        <Button
          variant="outline"
          onClick={action.onClick}
          className="mt-8 gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all active:scale-95"
        >
          {action.icon && <action.icon className="size-4" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { EmptyState }
