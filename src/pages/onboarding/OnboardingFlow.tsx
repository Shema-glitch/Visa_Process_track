import React, { useState } from 'react';
import { Globe, FileText, CheckCircle2, ArrowRight, ArrowLeft, Plus, X, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../lib/utils';

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
    setSelectedRequirements(new Set());
    setCustomRequirements([]);
  };

  const toggleRequirement = (id: string) => {
    const newSelected = new Set(selectedRequirements);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRequirements(newSelected);
  };

  const addCustomRequirement = () => {
    setCustomRequirements([...customRequirements, '']);
  };

  const removeCustomRequirement = (index: number) => {
    setCustomRequirements(customRequirements.filter((_, i) => i !== index));
  };

  const updateCustomRequirement = (index: number, value: string) => {
    const newCustom = [...customRequirements];
    newCustom[index] = value;
    setCustomRequirements(newCustom);
  };

  const handleComplete = () => {
    const countryReqs = currentCountryData?.requirements.filter((r) =>
      selectedRequirements.has(r.id)
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
            <span className="text-sm font-medium">
              Step {step} of {totalSteps}
            </span>
            <Badge variant="secondary">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <Progress value={progress} />
        </div>

        {/* Step 1: Country Selection */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground">
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight mb-2">
                  Select Your Destination
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Choose the country where you're applying for a visa. We'll set up the right requirements for you.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {VISA_DATA.map((country) => (
                <Card
                  key={country.country}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-accent",
                    selectedCountry === country.country && "border-primary bg-accent"
                  )}
                  onClick={() => handleCountrySelect(country.country)}
                >
                  <CardContent className="p-6 sm:p-8 text-center">
                    <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{country.flag}</div>
                    <h3 className="text-lg font-semibold mb-2">
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

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedCountry}
                className="gap-2"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Requirements */}
        {step === 2 && currentCountryData && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl">{currentCountryData.flag}</span>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {currentCountryData.country} Requirements
                </h2>
              </div>
              <p className="text-muted-foreground">
                Select the documents you need to prepare. Mandatory items are pre-selected.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Required Documents</CardTitle>
                <CardDescription>
                  Check the documents you need to prepare for your visa application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentCountryData.requirements.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted"
                  >
                    <Checkbox
                      id={req.id}
                      checked={ req.mandatory || selectedRequirements.has(req.id)}
                      disabled={req.mandatory}
                      onCheckedChange={() => toggleRequirement(req.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={req.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {req.name}
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {req.category}
                        </Badge>
                        {req.mandatory && (
                          <Badge variant="secondary" className="text-xs">
                            Mandatory
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-between">
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
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight">
                Additional Requirements
              </h2>
              <p className="text-muted-foreground">
                Add any custom requirements not listed in the standard set
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Custom Documents</CardTitle>
                <CardDescription>
                  Add any additional documents you need to prepare
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {customRequirements.map((req, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={req}
                      onChange={(e) => updateCustomRequirement(idx, e.target.value)}
                      placeholder="Enter document name"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomRequirement(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={addCustomRequirement}
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Requirement
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-between">
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

        {/* Step 4: Review */}
        {step === 4 && currentCountryData && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Review Your Setup
              </h2>
              <p className="text-muted-foreground">
                You're ready to start tracking {selectedRequirements.size + customRequirements.filter(r => r.trim()).length} requirements
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>
                  Review your selected requirements before completing setup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Country</span>
                  <span className="text-sm text-muted-foreground">
                    {currentCountryData.flag} {selectedCountry}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Requirements</span>
                  <span className="text-sm text-muted-foreground">
                    {selectedRequirements.size + customRequirements.filter(r => r.trim()).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button onClick={handleComplete} className="gap-2">
                Complete Setup
                <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
