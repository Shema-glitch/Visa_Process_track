import { cn } from "@/lib/utils"

interface FlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  animate?: boolean
}

/** 21st.dev login-signup card shell with glass border and fade-up entrance. */
export function FlowCard({ children, className, animate = true, ...props }: FlowCardProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-950/75 shadow-2xl shadow-black/40 backdrop-blur-xl",
        animate && "card-animate",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
