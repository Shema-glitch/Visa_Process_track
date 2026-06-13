import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { cn } from "@/lib/utils"

/** 21st.dev animated-otp inspired OTP field with elevated slot styling. */
const AuthOtpInput = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput> & { shake?: boolean }
>(({ className, containerClassName, shake, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      shake && "animate-[shake_0.5s_ease-in-out]",
      containerClassName
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
))
AuthOtpInput.displayName = "AuthOtpInput"

function AuthOtpGroup({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn("flex items-center gap-1.5", className)} {...props} />
}

function AuthOtpSlot({
  index,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { index: number }) {
  const { slots } = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = slots[index]

  return (
    <div
      className={cn(
        "relative flex size-11 items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-base font-semibold text-zinc-50 shadow-inner shadow-black/20 transition-all duration-200",
        isActive && "border-zinc-400 ring-2 ring-zinc-400/30 ring-offset-2 ring-offset-zinc-950",
        char && "border-emerald-500/40 bg-emerald-500/5",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-zinc-100 duration-1000" />
        </div>
      )}
    </div>
  )
}

export { AuthOtpInput, AuthOtpGroup, AuthOtpSlot }
