import { ReactNode } from 'react';

export default function TutorDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-24 md:pt-28 pb-16">
      <div className="page-container">
        {children}
      </div>
    </div>
  );
}
