"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { When2MeetGrid } from "@/components/availability/when2meet-grid";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTimeSlotCount } from "@/lib/utils";

interface Program {
  id: string;
  name: string;
  description: string | null;
}

interface OnboardingFormProps {
  programs: Program[];
}

const STEPS = [
  { id: 1, title: "Parent Info", description: "Your contact details" },
  { id: 2, title: "Student Info", description: "Student details" },
  { id: 3, title: "Program", description: "Select a program" },
  { id: 4, title: "Availability", description: "Weekly schedule" },
  { id: 5, title: "Consent", description: "Terms and conditions" },
];

export function OnboardingForm({ programs }: OnboardingFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    setError(null);

    try {
      // Create parent account
      const { data: parentAuth, error: parentError } = await supabase.auth.signUp({
        email: parentEmail,
        password: parentPassword,
        options: {
          data: {
            full_name: parentName,
            role: "parent",
            timezone,
            phone: parentPhone,
          },
        },
      });

      if (parentError) throw new Error(`Parent registration failed: ${parentError.message}`);
      if (!parentAuth.user) throw new Error("Parent account creation failed");

      // Create student account (separate signup)
      const { data: studentAuth, error: studentError } = await supabase.auth.signUp({
        email: studentEmail,
        password: studentPassword,
        options: {
          data: {
            full_name: studentName,
            role: "student",
            timezone,
          },
        },
      });

      if (studentError) throw new Error(`Student registration failed: ${studentError.message}`);
      if (!studentAuth.user) throw new Error("Student account creation failed");

      // Wait a moment for triggers to create profiles
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Link parent to student (need to use service role for this, so we'll do it via API)
      // For now, we'll store the link request and let admin approve
      // The parent_student_links table will be populated by the database trigger or admin

      // Store student's availability and program preference
      // This will be done when the student confirms their email and logs in

      toast.success("Registration submitted! Check your email to confirm your accounts.");
      router.push("/onboarding/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex justify-between items-center">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep > step.id
                  ? "bg-primary text-primary-foreground"
                  : currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-12 h-1 mx-1 ${
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Title */}
      <div className="text-center">
        <h2 className="text-xl font-semibold">{STEPS[currentStep - 1].title}</h2>
        <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1].description}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
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
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          programId === program.id
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
