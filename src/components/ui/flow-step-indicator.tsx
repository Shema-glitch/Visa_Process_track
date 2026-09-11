import { Check } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

export interface FlowStep {
  key: string
  label: string
}

interface FlowStepIndicatorProps {
  steps: FlowStep[]
  currentIndex: number
  className?: string
}

/** 21st.dev-inspired horizontal step indicator with spring transitions. */
export function FlowStepIndicator({ steps, currentIndex, className }: FlowStepIndicatorProps) {
  return (
    <div className={cn("flex w-full max-w-md items-center justify-center gap-0", className)}>
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <motion.div
              layout
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i < currentIndex && "bg-emerald-500 text-white",
                i === currentIndex && "bg-zinc-100 text-zinc-950 ring-4 ring-zinc-100/20",
                i > currentIndex && "border border-zinc-700 bg-zinc-900 text-zinc-500"
              )}
              initial={false}
              animate={{ scale: i === currentIndex ? 1.1 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            >
              {i < currentIndex ? <Check className="size-3.5" /> : i + 1}
            </motion.div>
            <span
              className={cn(
                "text-[10px] sm:text-[11px] font-semibold tracking-wide whitespace-nowrap",
                i === currentIndex ? "text-zinc-100" : i < currentIndex ? "text-emerald-400" : "text-zinc-600"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-2 mb-5 h-px w-8 transition-colors duration-500",
                i < currentIndex ? "bg-emerald-500" : "bg-zinc-800"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
