import React, { useState } from 'react';
import { Globe, FileText, CheckCircle2, ArrowRight, ArrowLeft, Plus, X, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';

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

const VISA_DATA: CountryRequirements[] = [
  {
    country: 'Turkey',
    flag: '🇹🇷',
    requirements: [
      { id: '1', name: 'Valid Passport', mandatory: true, category: 'Identity' },
      { id: '2', name: 'Visa Application Form', mandatory: true, category: 'Application' },
      { id: '3', name: 'Passport Photos', mandatory: true, category: 'Identity' },
      { id: '4', name: 'Birth Certificate', mandatory: false, category: 'Identity' },
      { id: '5', name: 'Criminal Record', mandatory: true, category: 'Background' },
      { id: '6', name: 'Bank Statements', mandatory: true, category: 'Financial' },
      { id: '7', name: 'Sponsorship Letter', mandatory: false, category: 'Financial' },
      { id: '8', name: 'Health Insurance', mandatory: true, category: 'Health' },
      { id: '9', name: 'University Acceptance Letter', mandatory: true, category: 'Education' },
      { id: '10', name: 'Accommodation Proof', mandatory: true, category: 'Logistics' },
    ],
  },
  {
    country: 'TRNC (Northern Cyprus)',
    flag: '🇨🇾',
    requirements: [
      { id: '1', name: 'Valid Passport', mandatory: true, category: 'Identity' },
      { id: '2', name: 'Visa Application Form', mandatory: true, category: 'Application' },
      { id: '3', name: 'MT103 Payment Receipt', mandatory: true, category: 'Financial' },
      { id: '4', name: 'Bank Statements', mandatory: true, category: 'Financial' },
      { id: '5', name: 'Notarized Sponsorship Letter', mandatory: false, category: 'Financial' },
      { id: '6', name: 'Official Acceptance Letter', mandatory: true, category: 'Education' },
      { id: '7', name: 'Medical Certificate', mandatory: true, category: 'Health' },
      { id: '8', name: 'Criminal Record Check', mandatory: true, category: 'Background' },
    ],
  },
  {
    country: 'United States',
    flag: '🇺🇸',
    requirements: [
      { id: '1', name: 'DS-160 Form', mandatory: true, category: 'Application' },
      { id: '2', name: 'Valid Passport', mandatory: true, category: 'Identity' },
      { id: '3', name: 'Visa Appointment Confirmation', mandatory: true, category: 'Logistics' },
      { id: '4', name: 'Financial Documents', mandatory: true, category: 'Financial' },
      { id: '5', name: 'I-20 Form (Students)', mandatory: true, category: 'Education' },
      { id: '6', name: 'SEVIS Fee Receipt', mandatory: true, category: 'Financial' },
      { id: '7', name: 'Transcripts', mandatory: true, category: 'Education' },
      { id: '8', name: 'Test Scores (TOEFL/IELTS)', mandatory: false, category: 'Education' },
    ],
  },
  {
    country: 'United Kingdom',
    flag: '🇬🇧',
    requirements: [
      { id: '1', name: 'Valid Passport', mandatory: true, category: 'Identity' },
      { id: '2', name: 'Visa Application Form', mandatory: true, category: 'Application' },
      { id: '3', name: 'CAS Number', mandatory: true, category: 'Education' },
      { id: '4', name: 'Tuberculosis Test Results', mandatory: true, category: 'Health' },
      { id: '5', name: 'Financial Evidence', mandatory: true, category: 'Financial' },
      { id: '6', name: 'Academic Qualifications', mandatory: true, category: 'Education' },
      { id: '7', name: 'English Language Test', mandatory: true, category: 'Education' },
    ],
  },
  {
    country: 'Germany',
    flag: '🇩🇪',
    requirements: [
      { id: '1', name: 'Valid Passport', mandatory: true, category: 'Identity' },
      { id: '2', name: 'Visa Application Form', mandatory: true, category: 'Application' },
      { id: '3', name: 'University Admission Letter', mandatory: true, category: 'Education' },
      { id: '4', name: 'Blocked Account Proof', mandatory: true, category: 'Financial' },
      { id: '5', name: 'Health Insurance', mandatory: true, category: 'Health' },
      { id: '6', name: 'Language Proficiency Certificate', mandatory: true, category: 'Education' },
      { id: '7', name: 'Motivation Letter', mandatory: false, category: 'Education' },
      { id: '8', name: 'CV/Resume', mandatory: true, category: 'Application' },
    ],
  },
];

interface OnboardingFlowProps {
  onComplete: (selectedRequirements: VisaRequirement[], country: string) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
  const [customRequirements, setCustomRequirements] = useState<string[]>([]);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const currentCountryData = VISA_DATA.find((c) => c.country === selectedCountry);

  const handleCountrySelect = (country: string) => {
    setSelectedCountry(country);
    const countryData = VISA_DATA.find((c) => c.country === country);
    if (countryData) {
      const mandatoryIds = countryData.requirements
        .filter((r) => r.mandatory)
        .map((r) => r.id);
      setSelectedRequirements(new Set(mandatoryIds));
    }
  };

  const toggleRequirement = (reqId: string) => {
    const newSelected = new Set(selectedRequirements);
    if (newSelected.has(reqId)) {
      const req = currentCountryData?.requirements.find((r) => r.id === reqId);
      if (req?.mandatory) return; // Don't allow deselecting mandatory items
      newSelected.delete(reqId);
    } else {
      newSelected.add(reqId);
    }
    setSelectedRequirements(newSelected);
  };

  const handleAddCustom = () => {
    setCustomRequirements([...customRequirements, '']);
  };

  const handleCustomChange = (index: number, value: string) => {
    const updated = [...customRequirements];
    updated[index] = value;
    setCustomRequirements(updated);
  };

  const handleRemoveCustom = (index: number) => {
    const updated = customRequirements.filter((_, i) => i !== index);
    setCustomRequirements(updated);
  };

  const handleComplete = () => {
    const finalRequirements: VisaRequirement[] = [];

    if (currentCountryData) {
      currentCountryData.requirements
        .filter((r) => selectedRequirements.has(r.id))
        .forEach((r) => finalRequirements.push(r));
    }

    customRequirements.forEach((name, index) => {
      if (name.trim()) {
        finalRequirements.push({
          id: `custom-${index}`,
          name: name.trim(),
          mandatory: false,
          category: 'Custom',
        });
      }
    });

    onComplete(finalRequirements, selectedCountry || 'Custom');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">
              Step {step} of {totalSteps}
            </span>
            <Badge variant="secondary" className="text-sm">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <Progress value={progress} className="h-2 sm:h-3" />
        </div>

        {/* Step 1: Country Selection */}
        {step === 1 && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl shadow-lg mb-4 sm:mb-6">
                <Globe className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">
                Select Your Destination
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
                Choose the country where you're applying for a visa. We'll set up the right requirements for you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {VISA_DATA.map((country) => (
                <Card
                  key={country.country}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedCountry === country.country
                      ? 'border-2 border-slate-900 shadow-xl scale-[1.02]'
                      : 'border-2 border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => handleCountrySelect(country.country)}
                >
                  <CardContent className="p-6 sm:p-8 text-center">
                    <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{country.flag}</div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                      {country.country}
                    </h3>
                    <Badge variant="secondary" className="gap-1.5">
                      <FileText className="w-3 h-3" />
                      {country.requirements.length} requirements
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedCountry}
                size="lg"
                className="gap-2 min-w-[150px]"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Requirements Review */}
        {step === 2 && currentCountryData && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl shadow-lg mb-4 sm:mb-6">
                <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">
                Review Requirements
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
                We've pre-selected mandatory items for {selectedCountry}. You can add or remove optional items.
              </p>
            </div>

            <Card className="border-2">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl sm:text-2xl">Required Documents</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="hidden sm:inline">Mandatory items cannot be unchecked</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(
                  currentCountryData.requirements.reduce((acc, req) => {
                    if (!acc[req.category]) acc[req.category] = [];
                    acc[req.category].push(req);
                    return acc;
                  }, {} as Record<string, VisaRequirement[]>)
                ).map(([category, reqs]) => (
                  <div key={category}>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                      {reqs.map((req) => {
                        const isSelected = selectedRequirements.has(req.id);
                        return (
                          <Card
                            key={req.id}
                            className={`cursor-pointer transition-all ${
                              isSelected
                                ? 'border-2 border-slate-900 bg-slate-50'
                                : 'border-2 border-slate-200 bg-white hover:border-slate-300'
                            } ${req.mandatory ? 'cursor-default' : ''}`}
                            onClick={() => !req.mandatory && toggleRequirement(req.id)}
                          >
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  disabled={req.mandatory}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-900 text-sm sm:text-base">
                                      {req.name}
                                    </p>
                                  </div>
                                  {req.mandatory && (
                                    <Badge variant="destructive" className="mt-1.5 text-xs">
                                      Required
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
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="gap-2">
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Custom Requirements */}
        {step === 3 && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl shadow-lg mb-4 sm:mb-6">
                <Plus className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">
                Add Custom Requirements
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
                Add any additional documents specific to your situation
              </p>
            </div>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Custom Documents</CardTitle>
                <CardDescription>
                  These will be added to your tracking list alongside the standard requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {customRequirements.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No custom requirements added yet</p>
                  </div>
                ) : (
                  customRequirements.map((req, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={req}
                        onChange={(e) => handleCustomChange(index, e.target.value)}
                        placeholder="Enter requirement name..."
                        className="flex-1"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveCustom(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}

                <Button
                  onClick={handleAddCustom}
                  variant="outline"
                  className="w-full gap-2 mt-4"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Requirement
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={() => setStep(4)} className="gap-2">
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && currentCountryData && (
          <div className="space-y-6 sm:space-y-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-600 to-green-500 rounded-2xl shadow-lg mb-4 sm:mb-6">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">
                Ready to Start!
              </h1>
              <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
                You've selected {selectedRequirements.size + customRequirements.filter(Boolean).length} requirements for your {selectedCountry} visa application
              </p>
            </div>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {currentCountryData.requirements
                  .filter((r) => selectedRequirements.has(r.id))
                  .map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-slate-900">{req.name}</span>
                      </div>
                      {req.mandatory && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  ))}
                {customRequirements.filter(Boolean).map((req, index) => (
                  <div
                    key={`custom-${index}`}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-slate-900">{req}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Custom
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleComplete}
                size="lg"
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                Start Tracking
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
