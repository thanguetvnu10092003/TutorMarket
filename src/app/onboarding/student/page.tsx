import { Metadata } from 'next';
import StudentOnboardingSurvey from '@/components/student/OnboardingSurvey';

export const metadata: Metadata = {
  title: 'Complete Your Profile | PrepPass',
  description: 'Help us personalize your experience',
};

export default function StudentOnboardingPage() {
  return (
    <div className="min-h-screen bg-cream-100 dark:bg-navy-600 pt-24 pb-16">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-navy-600 dark:text-cream-200">
            Welcome to <span className="text-gold-500">PrepPass</span>
          </h1>
          <p className="text-navy-300 dark:text-cream-400/60 mt-4 max-w-lg mx-auto">
            We&apos;re excited to have you! Let&apos;s get to know your goals so we can find your perfect match.
          </p>
        </div>
        
        <StudentOnboardingSurvey />
      </div>
    </div>
  );
}
