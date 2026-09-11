import { useEffect, useRef } from "react"
import { Shield } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuthShellProps {
  children: React.ReactNode
  className?: string
  brand?: string
  tagline?: string
}

/**
 * 21st.dev-inspired auth shell (lyanchouss/login-signup aesthetic).
 * Animated accent lines, particle field, and vignette backdrop.
 */
export function AuthShell({
  children,
  className,
  brand = "Visa Vault",
  tagline = "Document readiness, secured.",
}: AuthShellProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const setSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setSize()

    type Particle = { x: number; y: number; v: number; o: number }
    let particles: Particle[] = []
    let raf = 0

    const make = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      v: Math.random() * 0.25 + 0.05,
      o: Math.random() * 0.35 + 0.15,
    })

    const init = () => {
      particles = []
      const count = Math.floor((canvas.width * canvas.height) / 9000)
      for (let i = 0; i < count; i++) particles.push(make())
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.y -= p.v
        if (p.y < 0) {
          p.x = Math.random() * canvas.width
          p.y = canvas.height + Math.random() * 40
          p.v = Math.random() * 0.25 + 0.05
          p.o = Math.random() * 0.35 + 0.15
        }
        ctx.fillStyle = `rgba(250,250,250,${p.o})`
        ctx.fillRect(p.x, p.y, 0.7, 2.2)
      })
      raf = requestAnimationFrame(draw)
    }

    const onResize = () => {
      setSize()
      init()
    }

    window.addEventListener("resize", onResize)
    init()
    raf = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener("resize", onResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className={cn("relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-50", className)}>
      <style>{`
        .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.2}
        .hline,.vline{position:absolute;background:#27272a;will-change:transform,opacity}
        .hline{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:drawX 1.2s cubic-bezier(.22,.61,.36,1) forwards}
        .vline{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:drawY 1.4s cubic-bezier(.22,.61,.36,1) forwards}
        .hline:nth-child(1){top:18%;animation-delay:.2s}
        .hline:nth-child(2){top:50%;animation-delay:.35s}
        .hline:nth-child(3){top:82%;animation-delay:.5s}
        .vline:nth-child(4){left:22%;animation-delay:.6s}
        .vline:nth-child(5){left:50%;animation-delay:.75s}
        .vline:nth-child(6){left:78%;animation-delay:.9s}
        .hline::after,.vline::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(250,250,250,.08),transparent);opacity:0;animation:shimmer 1.2s ease-out forwards}
        .hline:nth-child(1)::after{animation-delay:.2s}
        .hline:nth-child(2)::after{animation-delay:.35s}
        .hline:nth-child(3)::after{animation-delay:.5s}
        .vline:nth-child(4)::after{animation-delay:.6s}
        .vline:nth-child(5)::after{animation-delay:.75s}
        .vline:nth-child(6)::after{animation-delay:.9s}
        @keyframes drawX{0%{transform:scaleX(0);opacity:0}60%{opacity:.5}100%{transform:scaleX(1);opacity:.3}}
        @keyframes drawY{0%{transform:scaleY(0);opacity:0}60%{opacity:.5}100%{transform:scaleY(1);opacity:.3}}
        @keyframes shimmer{0%{opacity:0}35%{opacity:.1}100%{opacity:0}}
        .card-animate{opacity:0;transform:translateY(20px);animation:fadeUp .8s cubic-bezier(.22,.61,.36,1) .4s forwards}
        @keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />

      <div className="accent-lines" aria-hidden="true">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 opacity-15" aria-hidden="true" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80">
            <Shield className="size-4 text-zinc-100" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">{brand}</span>
            <span className="text-[11px] text-zinc-500">{tagline}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-4 sm:px-8">
        {children}
      </main>
    </div>
  )
}
