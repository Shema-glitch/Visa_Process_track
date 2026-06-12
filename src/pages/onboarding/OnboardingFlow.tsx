import React, { useState } from 'react';
import { Globe, FileText, CheckCircle2, ArrowRight, ArrowLeft, Plus, X, Check, ShieldCheck, Lock, Cloud, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface VisaRequirement {
  id: string;
  name: string;
  mandatory: boolean;
  category: string;
}

interface CountryRequirements {
  country: string;
  flag: string;
  requirements: VisaRequirement[];
}

const STANDARD_REQUIREMENTS = [
  // Phase 1
  { id: '1', name: 'Valid Passport', mandatory: true, category: 'Identity' },
  { id: '2', name: 'Passport Photos', mandatory: true, category: 'Identity' },
  { id: '3', name: 'Personal Motivation Letter', mandatory: true, category: 'Application' },
  
  // Phase 2
  { id: '4', name: 'Birth Certificate', mandatory: true, category: 'Identity' },
  { id: '5', name: 'Criminal Record', mandatory: true, category: 'Background' },
  { id: '6', name: 'Certificate of Being Alive', mandatory: true, category: 'Identity' },
  { id: '7', name: 'General Checkup', mandatory: true, category: 'Health' },
  
  // Phase 3
  { id: '8', name: 'Bank Statements', mandatory: true, category: 'Financial' },
  { id: '9', name: "Guardian's Sponsorship Letter", mandatory: true, category: 'Financial' },
  { id: '10', name: 'Payment Receipt', mandatory: true, category: 'Financial' },
  { id: '11', name: 'University Acceptance Letter', mandatory: true, category: 'Education' },
  
  // Phase 4
  { id: '12', name: 'Travel Insurance', mandatory: true, category: 'Travel' },
  { id: '13', name: 'Health Insurance', mandatory: true, category: 'Health' },
  { id: '14', name: 'Accommodation Proof', mandatory: true, category: 'Logistics' },
  { id: '15', name: 'Visa Application Form', mandatory: true, category: 'Application' },
];

const VISA_DATA: CountryRequirements[] = [
  { country: 'Turkey', flag: '🇹🇷', requirements: STANDARD_REQUIREMENTS },
  { country: 'TRNC (Northern Cyprus)', flag: '🇨🇾', requirements: STANDARD_REQUIREMENTS },
  { country: 'United States', flag: '🇺🇸', requirements: STANDARD_REQUIREMENTS },
  { country: 'United Kingdom', flag: '🇬🇧', requirements: STANDARD_REQUIREMENTS },
  { country: 'Germany', flag: '🇩🇪', requirements: STANDARD_REQUIREMENTS },
];

interface OnboardingFlowProps {
  onComplete: (selectedRequirements: VisaRequirement[], country: string) => void;
}

// Category → accent colour mapping
const CATEGORY_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  Identity:    { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-400',   ring: 'ring-blue-500/20' },
  Application: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500/20' },
  Background:  { bg: 'bg-red-500/10',    text: 'text-red-600 dark:text-red-400',    ring: 'ring-red-500/20' },
  Health:      { bg: 'bg-emerald-500/10',text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20' },
  Financial:   { bg: 'bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400',  ring: 'ring-amber-500/20' },
  Education:   { bg: 'bg-cyan-500/10',   text: 'text-cyan-600 dark:text-cyan-400',   ring: 'ring-cyan-500/20' },
  Travel:      { bg: 'bg-sky-500/10',    text: 'text-sky-600 dark:text-sky-400',    ring: 'ring-sky-500/20' },
  Logistics:   { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500/20' },
};

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const [customRequirements, setCustomRequirements] = useState<string[]>([]);

  const TOTAL_STEPS = 5; // display label (1-indexed, matches what user sees)
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const getProgressLabel = () => {
    const labels = ["Let's begin", 'Selecting destination', 'Choosing documents', 'Extra documents', 'Almost done!'];
    return labels[step] ?? `${Math.round(progress)}% Complete`;
  };

  const currentCountryData = VISA_DATA.find((c) => c.country === selectedCountry);

  const requirementsByCategory = React.useMemo(() => {
    if (!currentCountryData) return {};
    return currentCountryData.requirements.reduce((acc, req) => {
      if (!acc[req.category]) acc[req.category] = [];
      acc[req.category].push(req);
      return acc;
    }, {} as Record<string, VisaRequirement[]>);
  }, [currentCountryData]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    // Pre-select all mandatory requirements for the chosen country
    const countryData = VISA_DATA.find((c) => c.country === country);
    if (countryData) {
      const mandatory = new Set(countryData.requirements.filter((r) => r.mandatory).map((r) => r.id));
      setSelectedRequirements(mandatory);
    }
  };

  const toggleRequirement = (id: string) => {
    setSelectedRequirements((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustomRequirement = () => {
    setCustomRequirements((prev) => [...prev, '']);
  };

  const updateCustomRequirement = (idx: number, value: string) => {
    setCustomRequirements((prev) => prev.map((r, i) => (i === idx ? value : r)));
  };

  const removeCustomRequirement = (idx: number) => {
    setCustomRequirements((prev) => prev.filter((_, i) => i !== idx));
  };
  // ──────────────────────────────────────────────────────────────────────────

  const totalSelected = selectedRequirements.size + customRequirements.filter((r) => r.trim()).length;

  const handleComplete = () => {
    const countryReqs = currentCountryData?.requirements.filter((r) =>
      r.mandatory || selectedRequirements.has(r.id)
    ) || [];

    const customReqs = customRequirements
      .filter((r) => r.trim())
      .map((name, idx) => ({
        id: `custom-${idx}`,
        name,
        mandatory: false,
        category: 'Custom',
      }));

    const finalRequirements = [...countryReqs, ...customReqs];
    onComplete(finalRequirements, selectedCountry || 'Custom');
  };

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12">
      <div className="container max-w-5xl px-4">
        {/* Progress */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold tracking-tight text-primary">
              {getProgressLabel()}
            </span>
            <Badge variant="secondary" className="font-bold">
              Step {step + 1} of {TOTAL_STEPS}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          {/* Step dots */}
          <div className="flex justify-between mt-2 px-px">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-500',
                  i < step + 1 ? 'bg-primary scale-125' : 'bg-muted-foreground/20'
                )}
              />
            ))}
          </div>
        </div>

        {/* Step 0: Intro / Welcome */}
        {step === 0 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 animate-pulse shadow-lg shadow-amber-500/5">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  Your visa vault, <span className="text-primary">secured.</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  The ultimate tool to help you organize, track, and secure every document required for your visa application.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
                <CardContent className="pt-8 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg">Google Drive sync</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Upload your documents directly to your own Google Drive. We never store your files.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
                <CardContent className="pt-8 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg">Privacy first</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We only track document status. We cannot see, read, or modify the contents of your uploads.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
                <CardContent className="pt-8 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg">Phase-locked tracking</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Stay organized with a structured roadmap. Follow the 4-phase plan to ensure nothing is missed.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-6 py-8 bg-muted/30 rounded-3xl border border-border/50">
              {[
                { step: "01", label: "Select destination", desc: "Pick your country & visa type" },
                { step: "02", label: "Customize list", desc: "Select specific requirements" },
                { step: "03", label: "Start tracking", desc: "Upload safely to your drive" },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <span className="text-xs font-black text-primary/40 tracking-tighter">{item.step}</span>
                  <h4 className="font-bold text-sm">{item.label}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={() => setStep(1)}
                className="h-14 px-8 text-lg font-bold gap-3 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-1"
              >
                Let's get started
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Country Selection */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">
                  Select Your Destination
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto font-medium">
                  Choose the country where you're applying for a visa.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {VISA_DATA.map((country) => {
                const isSelected = selectedCountry === country.country;
                return (
                  <button
                    key={country.country}
                    type="button"
                    className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl transition-all active:scale-95"
                    onClick={() => handleCountrySelect(country.country)}
                  >
                    <Card
                      className={cn(
                        "transition-all duration-300 relative overflow-hidden group border-2 h-full pointer-events-none",
                        isSelected 
                          ? "border-primary bg-primary/[0.03] shadow-lg shadow-primary/5" 
                          : "hover:border-primary/30 hover:bg-accent/50"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 animate-in zoom-in duration-300">
                          <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-lg shadow-primary/20">
                            <Check className="w-3 h-3 font-bold" />
                          </div>
                        </div>
                      )}
                      <CardContent className="p-6 sm:p-8 text-center space-y-4">
                        <div className="text-5xl group-hover:scale-110 transition-transform duration-500">{country.flag}</div>
                        <h3 className="text-lg font-bold tracking-tight">
                          {country.country}
                        </h3>
                        <Badge variant="secondary" className="gap-1.5 font-bold">
                          <FileText className="w-3 h-3" />
                          {country.requirements.length} items
                        </Badge>
                      </CardContent>
                    </Card>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)} className="gap-2 font-bold rounded-xl h-12">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedCountry}
                className="gap-2 font-bold rounded-xl h-12 px-6 shadow-lg shadow-primary/20"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Requirements (Merged with Custom) */}
        {step === 2 && currentCountryData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl">{currentCountryData.flag}</span>
                <h2 className="text-3xl font-bold tracking-tight">
                  {currentCountryData.country} Roadmap
                </h2>
              </div>
              <p className="text-muted-foreground font-medium">
                Customize your document checklist. Mandatory items are locked.
              </p>
            </div>

            <div className="space-y-6">
              {Object.entries(requirementsByCategory).map(([category, reqs]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-muted-foreground">{category}</h3>
                    <Separator className="flex-1 opacity-50" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reqs.map((req) => {
                      const isChecked = req.mandatory || selectedRequirements.has(req.id);
                      const colors = CATEGORY_COLORS[req.category] ?? CATEGORY_COLORS['Identity'];
                      return (
                        <Card
                          key={req.id}
                          className={cn(
                            'transition-all duration-200 border cursor-pointer group',
                            isChecked
                              ? 'border-primary/30 bg-primary/[0.02] shadow-sm shadow-primary/5'
                              : 'border-border/50 hover:border-primary/30 hover:bg-accent/30'
                          )}
                          onClick={() => !req.mandatory && toggleRequirement(req.id)}
                        >
                          <CardContent className="p-4 flex items-start space-x-3">
                            <Checkbox
                              id={req.id}
                              checked={isChecked}
                              disabled={req.mandatory}
                              onCheckedChange={() => toggleRequirement(req.id)}
                              className="mt-0.5 pointer-events-none"
                            />
                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={req.id}
                                className={cn(
                                  'text-sm font-semibold cursor-pointer transition-colors',
                                  isChecked ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                                )}
                              >
                                {req.name}
                              </Label>
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {/* Colour-coded category pill */}
                                <span className={cn(
                                  'inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ring-1',
                                  colors.bg, colors.text, colors.ring
                                )}>
                                  {req.category}
                                </span>
                                {req.mandatory && (
                                  <Badge className="text-xs font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none px-1.5 h-4">
                                    Mandatory
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Requirements Section */}
            <Card className="border-dashed border-2 bg-muted/20">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold">Extra Documents</CardTitle>
                    <CardDescription className="font-medium">Add anything unique to your situation</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCustomRequirement}
                    className="gap-2 font-bold rounded-lg border-primary/20 hover:bg-primary/5 hover:text-primary"
                  >
                    <Plus className="w-4 h-4" />
                    Add Extra
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {customRequirements.map((req, idx) => (
                  <div key={idx} className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                    <Input
                      value={req}
                      onChange={(e) => updateCustomRequirement(idx, e.target.value)}
                      placeholder="e.g. Translation of Marriage Certificate"
                      className="flex-1 h-11 focus-visible:ring-primary/50"
                      autoFocus={req === ''}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomRequirement(idx)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {customRequirements.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 opacity-50">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Optional — skip if not needed
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sticky selected count */}
            <div className="sticky bottom-4 z-10">
              <div className="flex items-center justify-between bg-card/95 backdrop-blur border border-border/60 rounded-2xl px-5 py-3 shadow-lg shadow-black/5">
                <span className="text-sm font-bold text-muted-foreground">
                  <span className="text-foreground text-lg font-black">{totalSelected}</span>
                  {' '}documents selected
                </span>
                <Button onClick={() => setStep(3)} className="gap-2 font-bold rounded-xl h-10 px-5 shadow-md shadow-primary/20">
                  Review Roadmap
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2 font-bold rounded-xl h-12">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="gap-2 font-bold rounded-xl h-12 px-6 shadow-lg shadow-primary/20">
                Review Roadmap
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review / Summary */}
        {step === 3 && currentCountryData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                Ready to Start!
              </h2>
              <p className="text-muted-foreground font-medium">
                We've prepared your dashboard for {selectedCountry}.
              </p>
            </div>

            <Card className="overflow-hidden border-2 border-primary/10">
              <CardHeader className="bg-primary/[0.02] border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{currentCountryData.flag}</span>
                    <h3 className="font-bold text-lg">{selectedCountry} Visa</h3>
                  </div>
                  <Badge variant="secondary" className="font-bold text-primary">Checklist Ready</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border/50 border-b border-border/50">
                  {Object.entries(requirementsByCategory).map(([cat, reqs]) => {
                    const selectedInCat = reqs.filter(r => r.mandatory || selectedRequirements.has(r.id)).length;
                    if (selectedInCat === 0) return null;
                    return (
                      <div key={cat} className="p-4 text-center space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">{cat}</p>
                        <p className="text-2xl font-black">{selectedInCat}</p>
                      </div>
                    );
                  })}
                  {customRequirements.filter(r => r.trim()).length > 0 && (
                    <div className="p-4 text-center space-y-1">
                      <p className="text-sm font-semibold text-muted-foreground">Extra</p>
                      <p className="text-2xl font-black">{customRequirements.filter(r => r.trim()).length}</p>
                    </div>
                  )}
                </div>
                <div className="p-6 bg-muted/10 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Grand total</span>
                  <span className="text-2xl font-black text-primary">
                    {currentCountryData.requirements.filter(r => r.mandatory || selectedRequirements.has(r.id)).length + customRequirements.filter(r => r.trim()).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2 font-bold rounded-xl h-12">
                <ArrowLeft className="w-4 h-4" />
                Review Selections
              </Button>
              <Button onClick={handleComplete} className="gap-2 font-bold rounded-xl h-12 px-8 bg-primary shadow-lg shadow-primary/20 text-lg">
                Go to your dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
