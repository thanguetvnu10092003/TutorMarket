'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Step1About from './steps/Step1About';
import Step2Photo from './steps/Step2Photo';
import Step3Certification from './steps/Step3Certification';
import Step4Education from './steps/Step4Education';
import Step5Description from './steps/Step5Description';
import Step6Video from './steps/Step6Video';
import Step7Availability from './steps/Step7Availability';
import Step8Pricing from './steps/Step8Pricing';

const STEPS = [
  { num: 1, label: 'About' },
  { num: 2, label: 'Photo' },
  { num: 3, label: 'Certification' },
  { num: 4, label: 'Education' },
  { num: 5, label: 'Description' },
  { num: 6, label: 'Video' },
  { num: 7, label: 'Availability' },
  { num: 8, label: 'Pricing' },
];

export default function TutorOnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/onboarding/step/1');
        if (res.ok) {
          const data = await res.json();
          if (data.onboardingCompleted) {
            router.push('/dashboard/tutor');
            return;
          }
          const resumeStep = Math.min((data.currentStep || 0) + 1, 8);
          setCurrentStep(resumeStep);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    if (session) fetchStatus();
  }, [session, router]);

  const handleNext = useCallback(async (step: number) => {
    if (step === 8) {
      // Final step — update session token and redirect
      await update({ onboardingCompleted: true });
      router.push('/dashboard/tutor');
    } else {
      setCurrentStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [router, update]);

  const handleBack = useCallback((step: number) => {
    if (step > 1) setCurrentStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="space-y-8">
      {/* Progress Bar */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => (
            <div key={step.num} className="flex items-center flex-1">
              <button
                onClick={() => currentStep > step.num && setCurrentStep(step.num)}
                className={`flex flex-col items-center gap-1.5 group ${currentStep > step.num ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                  currentStep === step.num
                    ? 'bg-gold-400 text-white shadow-gold scale-110'
                    : currentStep > step.num
                    ? 'bg-sage-500 text-white'
                    : 'bg-navy-100 dark:bg-navy-500 text-navy-400 dark:text-cream-400/40'
                }`}>
                  {currentStep > step.num ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : step.num}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider hidden md:block transition-colors ${
                  currentStep === step.num ? 'text-gold-400' : currentStep > step.num ? 'text-sage-600 dark:text-sage-400' : 'text-navy-300 dark:text-cream-400/40'
                }`}>
                  {step.label}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-navy-100 dark:bg-navy-500 relative overflow-hidden rounded-full">
                  <div className={`absolute inset-0 bg-sage-500 transition-all duration-500 ${currentStep > step.num ? 'w-full' : 'w-0'}`} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-navy-300 dark:text-cream-400/50">
          <span>Step {currentStep} of {STEPS.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" key={currentStep}>
        {currentStep === 1 && <Step1About onNext={() => handleNext(1)} />}
        {currentStep === 2 && <Step2Photo onNext={() => handleNext(2)} onBack={() => handleBack(2)} />}
        {currentStep === 3 && <Step3Certification onNext={() => handleNext(3)} onBack={() => handleBack(3)} />}
        {currentStep === 4 && <Step4Education onNext={() => handleNext(4)} onBack={() => handleBack(4)} />}
        {currentStep === 5 && <Step5Description onNext={() => handleNext(5)} onBack={() => handleBack(5)} />}
        {currentStep === 6 && <Step6Video onNext={() => handleNext(6)} onBack={() => handleBack(6)} />}
        {currentStep === 7 && <Step7Availability onNext={() => handleNext(7)} onBack={() => handleBack(7)} />}
        {currentStep === 8 && <Step8Pricing onNext={() => handleNext(8)} onBack={() => handleBack(8)} />}
      </div>
    </div>
  );
}
