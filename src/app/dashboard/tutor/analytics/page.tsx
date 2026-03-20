import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { format, subDays } from 'date-fns';

export default async function TutorAnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== 'TUTOR' && session.user.role !== 'ADMIN')) {
    redirect('/');
  }

  const tutorProfile = await prisma.tutorProfile.findUnique({
    where: { userId: session.user.id }
  });

  if (!tutorProfile) {
    return (
      <div className="p-8 text-center text-navy-400 dark:text-cream-400">
        Please complete your tutor profile setup first.
      </div>
    );
  }

  // Fetch completed bookings for revenue calculation
  const completedBookings = await prisma.booking.findMany({
    where: {
      tutorProfileId: tutorProfile.id,
      status: 'COMPLETED'
    },
    include: {
      payment: true
    }
  });

  const totalRevenue = completedBookings.reduce((sum, booking) => sum + (booking.payment?.amount || 0), 0);
  const totalSessions = completedBookings.length;

  // Recent Reviews
  const recentReviews = await prisma.review.findMany({
    where: {
      tutorProfileId: tutorProfile.id
    },
    include: {
      student: {
        select: { name: true, avatarUrl: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 4
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">Performance Analytics</h1>
          <p className="text-navy-300 dark:text-cream-400/60 mt-1">Track your earnings, session history, and student feedback.</p>
        </div>
        <Link
          href="/dashboard/tutor?tab=overview"
          className="inline-flex items-center justify-center rounded-2xl border border-navy-200/70 dark:border-navy-500/30 bg-white dark:bg-navy-700/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-navy-600 dark:text-cream-200 transition-colors hover:border-gold-400 hover:text-gold-600"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gold-400/20 text-gold-500 rounded-xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-navy-400 dark:text-cream-300">Total Earnings</p>
              <h3 className="text-2xl font-bold text-navy-600 dark:text-cream-200">${totalRevenue.toFixed(2)}</h3>
            </div>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-sage-500/20 text-sage-500 rounded-xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-navy-400 dark:text-cream-300">Completed Sessions</p>
              <h3 className="text-2xl font-bold text-navy-600 dark:text-cream-200">{totalSessions}</h3>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-navy-400 dark:text-cream-300">Average Rating</p>
              <h3 className="text-2xl font-bold text-navy-600 dark:text-cream-200">
                {tutorProfile.totalReviews > 0 ? tutorProfile.rating.toFixed(1) : 'N/A'}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Placeholder Area */}
      <div className="glass-card p-8 min-h-[400px] flex items-center justify-center border-dashed border-2 border-navy-200 dark:border-navy-500">
          <div className="text-center">
              <div className="w-16 h-16 bg-navy-50 dark:bg-navy-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-navy-300"><path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
              </div>
              <p className="text-navy-400 dark:text-cream-400 font-bold mb-1">Visual Charts Coming Soon</p>
              <p className="text-sm text-navy-300 max-w-sm mx-auto">Historical session analytics and revenue trend graphs will be available once you accumulate enough session data.</p>
          </div>
      </div>

      {/* Recent Reviews Section */}
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200 mb-6">Recent Feedback</h2>
        {recentReviews.length === 0 ? (
          <p className="text-navy-300">No reviews received yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recentReviews.map(review => (
              <div key={review.id} className="glass-card p-6 border-l-4 border-gold-400">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-navy-100 dark:bg-navy-500 flex items-center justify-center font-bold text-navy-500 overflow-hidden">
                      {review.student.avatarUrl ? (
                         <img src={review.student.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        review.student.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-navy-600 dark:text-cream-200">{review.student.name}</p>
                      <p className="text-xs text-navy-300">{format(new Date(review.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 text-gold-400">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < review.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-navy-400 dark:text-cream-300 italic">&quot;{review.comment || 'No comment provided'}&quot;</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
