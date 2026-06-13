import React, { useState, useEffect } from "react"
import {
  Globe,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Check,
  ShieldCheck,
  Lock,
  Cloud,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AuthShell } from "@/components/ui/auth-shell"
import { FlowCard } from "@/components/ui/flow-card"
import { FlowStepIndicator } from "@/components/ui/flow-step-indicator"
import { cn } from "@/lib/utils"

interface VisaRequirement {
  id: string
  name: string
  mandatory: boolean
  category: string
}

interface CountryRequirements {
  country: string
  flag: string
  requirements: VisaRequirement[]
}

const STANDARD_REQUIREMENTS = [
  { id: "1", name: "Valid Passport", mandatory: true, category: "Identity" },
  { id: "2", name: "Passport Photos", mandatory: true, category: "Identity" },
  { id: "3", name: "Personal Motivation Letter", mandatory: true, category: "Application" },
  { id: "4", name: "Birth Certificate", mandatory: true, category: "Identity" },
  { id: "5", name: "Criminal Record", mandatory: true, category: "Background" },
  { id: "6", name: "Certificate of Being Alive", mandatory: true, category: "Identity" },
  { id: "7", name: "General Checkup", mandatory: true, category: "Health" },
  { id: "8", name: "Bank Statements", mandatory: true, category: "Financial" },
  { id: "9", name: "Guardian's Sponsorship Letter", mandatory: true, category: "Financial" },
  { id: "10", name: "Payment Receipt", mandatory: true, category: "Financial" },
  { id: "11", name: "University Acceptance Letter", mandatory: true, category: "Education" },
  { id: "12", name: "Travel Insurance", mandatory: true, category: "Travel" },
  { id: "13", name: "Health Insurance", mandatory: true, category: "Health" },
  { id: "14", name: "Accommodation Proof", mandatory: true, category: "Logistics" },
  { id: "15", name: "Visa Application Form", mandatory: true, category: "Application" },
]

const VISA_DATA: CountryRequirements[] = [
  { country: "Turkey", flag: "🇹🇷", requirements: STANDARD_REQUIREMENTS },
  { country: "TRNC (Northern Cyprus)", flag: "🇨🇾", requirements: STANDARD_REQUIREMENTS },
  { country: "United States", flag: "🇺🇸", requirements: STANDARD_REQUIREMENTS },
  { country: "United Kingdom", flag: "🇬🇧", requirements: STANDARD_REQUIREMENTS },
  { country: "Germany", flag: "🇩🇪", requirements: STANDARD_REQUIREMENTS },
]

const ONBOARDING_STEPS = [
  { key: "intro", label: "Welcome" },
  { key: "country", label: "Destination" },
  { key: "docs", label: "Documents" },
  { key: "review", label: "Review" },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  Identity: { bg: "bg-blue-500/10", text: "text-blue-400", ring: "ring-blue-500/20" },
  Application: { bg: "bg-violet-500/10", text: "text-violet-400", ring: "ring-violet-500/20" },
  Background: { bg: "bg-red-500/10", text: "text-red-400", ring: "ring-red-500/20" },
  Health: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  Financial: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/20" },
  Education: { bg: "bg-cyan-500/10", text: "text-cyan-400", ring: "ring-cyan-500/20" },
  Travel: { bg: "bg-sky-500/10", text: "text-sky-400", ring: "ring-sky-500/20" },
  Logistics: { bg: "bg-orange-500/10", text: "text-orange-400", ring: "ring-orange-500/20" },
}

interface OnboardingFlowProps {
  onComplete: (selectedRequirements: VisaRequirement[], country: string) => void
}

function AnimatedProgress({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const duration = 900
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setDisplay(Math.round(progress * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    const timeout = setTimeout(tick, 200)
    return () => clearTimeout(timeout)
  }, [value])

  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
      <motion.span
        key={display}
        initial={{ scale: 0.9, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-lg font-black tabular-nums text-zinc-100"
      >
        {display}%
      </motion.span>
    </div>
  )
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set())
  const [customRequirements, setCustomRequirements] = useState<string[]>([])

  const TOTAL_STEPS = 4
  const progress = ((step + 1) / TOTAL_STEPS) * 100

  const progressLabels = ["Let's begin", "Selecting destination", "Choosing documents", "Almost done!"]

  const currentCountryData = VISA_DATA.find((c) => c.country === selectedCountry)

  const requirementsByCategory = React.useMemo(() => {
    if (!currentCountryData) return {}
    return currentCountryData.requirements.reduce(
      (acc, req) => {
        if (!acc[req.category]) acc[req.category] = []
        acc[req.category].push(req)
        return acc
      },
      {} as Record<string, VisaRequirement[]>
    )
  }, [currentCountryData])

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country)
    const countryData = VISA_DATA.find((c) => c.country === country)
    if (countryData) {
      const mandatory = new Set(countryData.requirements.filter((r) => r.mandatory).map((r) => r.id))
      setSelectedRequirements(mandatory)
    }
  }

  const toggleRequirement = (id: string) => {
    setSelectedRequirements((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addCustomRequirement = () => setCustomRequirements((prev) => [...prev, ""])
  const updateCustomRequirement = (idx: number, value: string) =>
    setCustomRequirements((prev) => prev.map((r, i) => (i === idx ? value : r)))
  const removeCustomRequirement = (idx: number) =>
    setCustomRequirements((prev) => prev.filter((_, i) => i !== idx))

  const totalSelected = selectedRequirements.size + customRequirements.filter((r) => r.trim()).length

  const handleComplete = () => {
    const countryReqs =
      currentCountryData?.requirements.filter((r) => r.mandatory || selectedRequirements.has(r.id)) || []
    const customReqs = customRequirements
      .filter((r) => r.trim())
      .map((name, idx) => ({
        id: `custom-${idx}`,
        name,
        mandatory: false,
        category: "Custom",
      }))
    onComplete([...countryReqs, ...customReqs], selectedCountry || "Custom")
  }

  return (
    <AuthShell tagline="Set up your visa roadmap">
      <div className="flex w-full max-w-5xl flex-col gap-6 px-2 sm:px-0">
        <FlowStepIndicator steps={ONBOARDING_STEPS} currentIndex={step} className="max-w-2xl self-center" />
        <AnimatedProgress value={Math.round(progress)} label={progressLabels[step] ?? "Progress"} />

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-10"
            >
              <div className="flex flex-col items-center gap-6 text-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.1 }}
                  className="flex size-20 items-center justify-center rounded-3xl border border-amber-800/40 bg-amber-950/30 text-amber-400 shadow-lg shadow-amber-900/20"
                >
                  <ShieldCheck className="size-10" />
                </motion.div>
                <div className="flex flex-col gap-2">
                  <h1 className="text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
                    Your visa vault, <span className="text-zinc-300">secured.</span>
                  </h1>
                  <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-400">
                    Organize, track, and secure every document required for your visa application.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  { icon: Cloud, title: "Google Drive sync", desc: "Upload directly to your Drive. We never store your files.", color: "blue" },
                  { icon: Lock, title: "Privacy first", desc: "We only track status — never read or modify your uploads.", color: "emerald" },
                  { icon: CheckCircle2, title: "Phase-locked tracking", desc: "Follow the 4-phase plan so nothing is missed.", color: "amber" },
                ].map((item, i) => (
                  <FlowCard key={item.title} animate className="max-w-none" style={{ animationDelay: `${i * 0.1}s` } as React.CSSProperties}>
                    <CardContent className="flex flex-col gap-4 p-6">
                      <div
                        className={cn(
                          "flex size-12 items-center justify-center rounded-xl",
                          item.color === "blue" && "bg-blue-500/10 text-blue-400",
                          item.color === "emerald" && "bg-emerald-500/10 text-emerald-400",
                          item.color === "amber" && "bg-amber-500/10 text-amber-400"
                        )}
                      >
                        <item.icon className="size-6" />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-100">{item.title}</h3>
                      <p className="text-sm leading-relaxed text-zinc-400">{item.desc}</p>
                    </CardContent>
                  </FlowCard>
                ))}
              </div>

              <FlowCard className="max-w-none" animate>
                <CardContent className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
                  {[
                    { step: "01", label: "Select destination", desc: "Pick your country & visa type" },
                    { step: "02", label: "Customize list", desc: "Select specific requirements" },
                    { step: "03", label: "Start tracking", desc: "Upload safely to your drive" },
                  ].map((item) => (
                    <div key={item.step} className="flex flex-col gap-2">
                      <span className="text-xs font-black tracking-tighter text-zinc-600">{item.step}</span>
                      <h4 className="text-sm font-bold text-zinc-200">{item.label}</h4>
                      <p className="text-xs leading-relaxed text-zinc-500">{item.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </FlowCard>

              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => setStep(1)}
                  className="h-14 gap-3 rounded-2xl border border-zinc-700 bg-zinc-100 px-8 text-lg font-bold text-zinc-950 shadow-xl shadow-black/30 hover:bg-white"
                >
                  Let's get started
                  <ArrowRight className="size-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="country"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col gap-8"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900/80 text-zinc-200">
                  <Globe className="size-8" />
                </div>
                <div>
                  <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-50">Select Your Destination</h1>
                  <p className="font-medium text-zinc-400">Choose the country where you're applying for a visa.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {VISA_DATA.map((country) => {
                  const isSelected = selectedCountry === country.country
                  return (
                    <button
                      key={country.country}
                      type="button"
                      className="w-full text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-2xl active:scale-[0.98]"
                      onClick={() => handleCountrySelect(country.country)}
                    >
                      <FlowCard
                        animate={false}
                        className={cn(
                          "max-w-none transition-all duration-300",
                          isSelected
                            ? "border-zinc-400/60 bg-zinc-900/90 shadow-lg shadow-zinc-900/40"
                            : "hover:border-zinc-600"
                        )}
                      >
                        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-8">
                          {isSelected && (
                            <div className="absolute right-3 top-3">
                              <div className="rounded-full bg-emerald-500 p-1 shadow-lg">
                                <Check className="size-3 font-bold text-white" />
                              </div>
                            </div>
                          )}
                          <div className="text-5xl transition-transform duration-500">{country.flag}</div>
                          <h3 className="text-lg font-bold tracking-tight text-zinc-100">{country.country}</h3>
                          <Badge variant="secondary" className="gap-1.5 border-zinc-700 bg-zinc-800 font-bold text-zinc-300">
                            <FileText className="size-3" />
                            {country.requirements.length} items
                          </Badge>
                        </CardContent>
                      </FlowCard>
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="h-12 gap-2 rounded-xl border-zinc-700 bg-transparent font-bold text-zinc-300 hover:bg-zinc-900"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedCountry}
                  className="h-12 gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-6 font-bold text-zinc-950 hover:bg-white disabled:opacity-40"
                >
                  Continue
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && currentCountryData && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col gap-8"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{currentCountryData.flag}</span>
                  <h2 className="text-3xl font-bold tracking-tight text-zinc-50">{currentCountryData.country} Roadmap</h2>
                </div>
                <p className="font-medium text-zinc-400">Customize your checklist. Mandatory items are locked.</p>
              </div>

              <div className="flex flex-col gap-6">
                {Object.entries(requirementsByCategory).map(([category, reqs]) => (
                  <div key={category} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-zinc-500">{category}</h3>
                      <Separator className="flex-1 bg-zinc-800" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {reqs.map((req) => {
                        const isChecked = req.mandatory || selectedRequirements.has(req.id)
                        const colors = CATEGORY_COLORS[req.category] ?? CATEGORY_COLORS.Identity
                        return (
                          <FlowCard
                            key={req.id}
                            animate={false}
                            className={cn(
                              "max-w-none cursor-pointer transition-all duration-200",
                              isChecked ? "border-zinc-600 bg-zinc-900/80" : "hover:border-zinc-600"
                            )}
                            onClick={() => !req.mandatory && toggleRequirement(req.id)}
                          >
                            <CardContent className="flex items-start gap-3 p-4">
                              <Checkbox
                                id={req.id}
                                checked={isChecked}
                                disabled={req.mandatory}
                                onCheckedChange={() => toggleRequirement(req.id)}
                                className="mt-0.5 pointer-events-none border-zinc-600"
                              />
                              <div className="min-w-0 flex-1">
                                <Label
                                  htmlFor={req.id}
                                  className={cn(
                                    "cursor-pointer text-sm font-semibold transition-colors",
                                    isChecked ? "text-zinc-100" : "text-zinc-500"
                                  )}
                                >
                                  {req.name}
                                </Label>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1",
                                      colors.bg,
                                      colors.text,
                                      colors.ring
                                    )}
                                  >
                                    {req.category}
                                  </span>
                                  {req.mandatory && (
                                    <Badge className="h-4 border-none bg-amber-500/10 px-1.5 text-xs font-bold text-amber-400">
                                      Mandatory
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </FlowCard>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <FlowCard className="max-w-none border-dashed" animate={false}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-lg font-bold text-zinc-100">Extra Documents</CardTitle>
                      <CardDescription className="font-medium text-zinc-500">
                        Add anything unique to your situation
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCustomRequirement}
                      className="gap-2 rounded-lg border-zinc-700 font-bold text-zinc-300 hover:bg-zinc-800"
                    >
                      <Plus className="size-4" />
                      Add Extra
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {customRequirements.map((req, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={req}
                        onChange={(e) => updateCustomRequirement(idx, e.target.value)}
                        placeholder="e.g. Translation of Marriage Certificate"
                        className="h-11 flex-1 border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600"
                        autoFocus={req === ""}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomRequirement(idx)}
                        className="text-red-400 hover:bg-red-950/30"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {customRequirements.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 py-6 opacity-50">
                      <Plus className="size-5 text-zinc-600" />
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                        Optional — skip if not needed
                      </p>
                    </div>
                  )}
                </CardContent>
              </FlowCard>

              <div className="sticky bottom-4 z-10">
                <FlowCard animate={false} className="max-w-none">
                  <CardContent className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-bold text-zinc-500">
                      <span className="text-lg font-black text-zinc-100">{totalSelected}</span> documents selected
                    </span>
                    <Button
                      onClick={() => setStep(3)}
                      className="h-10 gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-5 font-bold text-zinc-950 hover:bg-white"
                    >
                      Review Roadmap
                      <ArrowRight className="size-4" />
                    </Button>
                  </CardContent>
                </FlowCard>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-12 gap-2 rounded-xl border-zinc-700 bg-transparent font-bold text-zinc-300 hover:bg-zinc-900"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="h-12 gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-6 font-bold text-zinc-950 hover:bg-white"
                >
                  Review Roadmap
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && currentCountryData && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col gap-8"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-20 items-center justify-center rounded-full border border-emerald-800/50 bg-emerald-950/30 text-emerald-400">
                  <CheckCircle2 className="size-10" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-zinc-50">Ready to Start!</h2>
                <p className="font-medium text-zinc-400">We've prepared your dashboard for {selectedCountry}.</p>
              </div>

              <FlowCard className="max-w-none overflow-hidden border-zinc-700" animate={false}>
                <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{currentCountryData.flag}</span>
                      <h3 className="text-lg font-bold text-zinc-100">{selectedCountry} Visa</h3>
                    </div>
                    <Badge variant="secondary" className="border-zinc-700 bg-zinc-800 font-bold text-emerald-400">
                      Checklist Ready
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-2 divide-x divide-y border-b border-zinc-800 sm:grid-cols-4 sm:divide-y-0">
                    {Object.entries(requirementsByCategory).map(([cat, reqs]) => {
                      const selectedInCat = reqs.filter((r) => r.mandatory || selectedRequirements.has(r.id)).length
                      if (selectedInCat === 0) return null
                      return (
                        <div key={cat} className="flex flex-col items-center gap-1 p-4 text-center">
                          <p className="text-xs font-semibold text-zinc-500">{cat}</p>
                          <p className="text-2xl font-black text-zinc-100">{selectedInCat}</p>
                        </div>
                      )
                    })}
                    {customRequirements.filter((r) => r.trim()).length > 0 && (
                      <div className="flex flex-col items-center gap-1 p-4 text-center">
                        <p className="text-sm font-semibold text-zinc-500">Extra</p>
                        <p className="text-2xl font-black text-zinc-100">
                          {customRequirements.filter((r) => r.trim()).length}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-zinc-900/40 p-6">
                    <span className="text-sm font-semibold text-zinc-500">Grand total</span>
                    <span className="text-2xl font-black text-zinc-100">
                      {currentCountryData.requirements.filter((r) => r.mandatory || selectedRequirements.has(r.id))
                        .length + customRequirements.filter((r) => r.trim()).length}
                    </span>
                  </div>
                </CardContent>
              </FlowCard>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="h-12 gap-2 rounded-xl border-zinc-700 bg-transparent font-bold text-zinc-300 hover:bg-zinc-900"
                >
                  <ArrowLeft className="size-4" />
                  Review Selections
                </Button>
                <Button
                  onClick={handleComplete}
                  className="h-12 gap-2 rounded-xl border border-zinc-700 bg-zinc-100 px-8 text-lg font-bold text-zinc-950 hover:bg-white"
                >
                  Go to your dashboard
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuthShell>
  )
}
