"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { When2MeetGrid } from "@/components/availability/when2meet-grid";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  FileCheck
} from "lucide-react";
import { getTimeSlotCount, cn } from "@/lib/utils";

interface Program {
  id: string;
  name: string;
  description: string | null;
}

interface OnboardingData {
  parentName: string;
  parentEmail: string;
  parentPassword: string;
  parentPhone: string;
  studentName: string;
  studentEmail: string;
  studentPassword: string;
  programId: string;
  studentMotivation: string;
  teachingPreference: string;
  availability: boolean[][];
  timezone: string;
  consentContact: boolean;
  consentRecording: boolean;
  consentTerms: boolean;
}

interface OnboardingFormProps {
  programs: Program[];
  onSubmit: (data: OnboardingData) => Promise<{ success: boolean; error?: string }>;
}

const STEPS = [
  { id: 1, title: "Parent Info", description: "Your contact details", icon: User },
  { id: 2, title: "Student Info", description: "Student details", icon: GraduationCap },
  { id: 3, title: "Program", description: "Select a program", icon: BookOpen },
  { id: 4, title: "Availability", description: "Weekly schedule", icon: Calendar },
  { id: 5, title: "Consent", description: "Terms and conditions", icon: FileCheck },
];

export function OnboardingForm({ programs, onSubmit }: OnboardingFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Form state
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");

  const [programId, setProgramId] = useState("");
  const [studentMotivation, setStudentMotivation] = useState("");
  const [teachingPreference, setTeachingPreference] = useState("");

  const slotCount = getTimeSlotCount();
  const [availability, setAvailability] = useState<boolean[][]>(
    Array(7).fill(null).map(() => Array(slotCount).fill(false))
  );

  const [consentContact, setConsentContact] = useState(false);
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

  // Auto-detect timezone
  const [timezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Australia/Melbourne";
    }
  });

  const validateStep = (step: number): boolean => {
    setError(null);

    switch (step) {
      case 1:
        if (!parentName.trim()) { setError("Parent name is required"); return false; }
        if (!parentEmail.trim()) { setError("Parent email is required"); return false; }
        if (!parentPassword || parentPassword.length < 6) { setError("Password must be at least 6 characters"); return false; }
        return true;

      case 2:
        if (!studentName.trim()) { setError("Student name is required"); return false; }
        if (!studentEmail.trim()) { setError("Student email is required"); return false; }
        if (!studentPassword || studentPassword.length < 6) { setError("Student password must be at least 6 characters"); return false; }
        return true;

      case 3:
        if (!programId) { setError("Please select a program"); return false; }
        return true;

      case 4:
        const hasAvailability = availability.some(day => day.some(slot => slot));
        if (!hasAvailability) { setError("Please select at least some availability"); return false; }
        return true;

      case 5:
        if (!consentTerms) { setError("You must accept the terms and conditions"); return false; }
        return true;

      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const goToStep = (stepId: number) => {
    // Can only go to steps that are completed or the next available step
    if (stepId <= currentStep || completedSteps.has(stepId - 1) || stepId === 1) {
      // Validate all steps up to the target step
      if (stepId < currentStep) {
        setError(null);
        setCurrentStep(stepId);
      } else if (stepId === currentStep + 1 && validateStep(currentStep)) {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setCurrentStep(stepId);
      }
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError(null);

    try {
      const result = await onSubmit({
        parentName,
        parentEmail,
        parentPassword,
        parentPhone,
        studentName,
        studentEmail,
        studentPassword,
        programId,
        studentMotivation,
        teachingPreference,
        availability,
        timezone,
        consentContact,
        consentRecording,
        consentTerms,
      });

      if (!result.success) {
        throw new Error(result.error || "Registration failed");
      }

      toast.success("Registration submitted! An administrator will review your application.");
      router.push("/onboarding/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const currentStepData = STEPS[currentStep - 1];

  return (
    <div className="space-y-8">
      {/* Progress Steps - Improved UI */}
      <div className="relative">
        {/* Progress Line Background */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-muted" />

        {/* Progress Line Fill */}
        <div
          className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {STEPS.map((step) => {
            const isCompleted = completedSteps.has(step.id) || currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = step.id <= currentStep || completedSteps.has(step.id - 1) || step.id === 1;
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step Circle */}
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  disabled={!isClickable || loading}
                  className={cn(
                    "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    isCompleted && "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg shadow-primary/30",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
                    isClickable && !loading && "cursor-pointer hover:scale-110",
                    !isClickable && "cursor-not-allowed opacity-60"
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}

                  {/* Pulse animation for current step */}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                  )}
                </button>

                {/* Step Label */}
                <div className="mt-3 text-center">
                  <p className={cn(
                    "text-xs font-medium transition-colors",
                    isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Step Header */}
      <div className="text-center space-y-2 py-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <currentStepData.icon className="h-4 w-4" />
          Step {currentStep} of {STEPS.length}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{currentStepData.title}</h2>
        <p className="text-muted-foreground">{currentStepData.description}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Parent Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parentName">Full Name</Label>
                <Input
                  id="parentName"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentEmail">Email</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentPassword">Password</Label>
                <Input
                  id="parentPassword"
                  type="password"
                  value={parentPassword}
                  onChange={(e) => setParentPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Phone (Optional)</Label>
                <Input
                  id="parentPhone"
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="04XX XXX XXX"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                Timezone detected: {timezone}
              </div>
            </div>
          )}

          {/* Step 2: Student Info */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student Full Name</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Student's full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentEmail">Student Email</Label>
                <Input
                  id="studentEmail"
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentPassword">Student Password</Label>
                <Input
                  id="studentPassword"
                  type="password"
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
            </div>
          )}

          {/* Step 3: Program Selection */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Program</Label>
                {programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No programs available. Please contact support.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {programs.map((program) => (
                      <button
                        key={program.id}
                        type="button"
                        onClick={() => setProgramId(program.id)}
                        className={`p-4 rounded-lg border text-left transition-colors ${programId === program.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                          }`}
                      >
                        <div className="font-medium">{program.name}</div>
                        {program.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {program.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivation">Why is your child interested in JMSS?</Label>
                <textarea
                  id="motivation"
                  value={studentMotivation}
                  onChange={(e) => setStudentMotivation(e.target.value)}
                  placeholder="Tell us about your child's goals..."
                  className="w-full min-h-[100px] px-3 py-2 rounded-md border bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teachingPreference">Teaching Style Preference</Label>
                <NativeSelect
                  id="teachingPreference"
                  value={teachingPreference}
                  onChange={(e) => setTeachingPreference(e.target.value)}
                  options={[
                    { value: "", label: "Select preference..." },
                    { value: "visual", label: "Visual learning" },
                    { value: "practice", label: "Practice-based" },
                    { value: "conceptual", label: "Conceptual explanations" },
                    { value: "mixed", label: "Mixed approach" },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Step 4: Availability */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the times your child is generally available for tutoring.
                This helps us match you with the best cohort.
              </p>
              <When2MeetGrid value={availability} onChange={setAvailability} />
            </div>
          )}

          {/* Step 5: Consent */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentContact}
                    onChange={(e) => setConsentContact(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Contact Permission</div>
                    <div className="text-sm text-muted-foreground">
                      I consent to JT Education contacting me via email and phone about my child&apos;s tutoring.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentRecording}
                    onChange={(e) => setConsentRecording(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Session Recording</div>
                    <div className="text-sm text-muted-foreground">
                      I consent to tutoring sessions being recorded for quality and review purposes.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentTerms}
                    onChange={(e) => setConsentTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">Terms and Conditions *</div>
                    <div className="text-sm text-muted-foreground">
                      I agree to the terms and conditions and privacy policy.
                    </div>
                  </div>
                </label>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Summary</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Parent:</span> {parentName} ({parentEmail})</p>
                  <p><span className="text-muted-foreground">Student:</span> {studentName} ({studentEmail})</p>
                  <p><span className="text-muted-foreground">Program:</span> {programs.find(p => p.id === programId)?.name}</p>
                  <p><span className="text-muted-foreground">Timezone:</span> {timezone}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1 || loading}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep < STEPS.length ? (
          <Button onClick={nextStep} disabled={loading}>
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Complete Registration"}
          </Button>
        )}
      </div>
    </div>
  );
}
