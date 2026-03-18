import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Image from 'next/image';
import { getInitials } from '@/lib/utils';
import { format } from 'date-fns';

export default async function TutorStudentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Ensure only TUTOR and ADMIN can access
  if (session.user.role !== 'TUTOR' && session.user.role !== 'ADMIN') {
    redirect('/');
  }

  // Fetch the tutor profile
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

  // Fetch bookings where this user is the tutor
  const studentBookings = await prisma.booking.findMany({
    where: {
      tutorProfileId: tutorProfile.id,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        }
      },
      payment: true,
    },
    orderBy: {
      scheduledAt: 'desc'
    }
  });

  // Group unique students
  const uniqueStudentsMap = new Map();
  studentBookings.forEach(booking => {
    const bookingRevenue = booking.payment?.amount || 0;
    
    if (!uniqueStudentsMap.has(booking.student.id)) {
      uniqueStudentsMap.set(booking.student.id, {
        ...booking.student,
        totalSessions: 1,
        latestSession: booking.scheduledAt,
        totalSpent: bookingRevenue,
      });
    } else {
      const studentData = uniqueStudentsMap.get(booking.student.id);
      studentData.totalSessions += 1;
      studentData.totalSpent += bookingRevenue;
      if (booking.scheduledAt > studentData.latestSession) {
        studentData.latestSession = booking.scheduledAt;
      }
    }
  });

  const uniqueStudents = Array.from(uniqueStudentsMap.values());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">My Students</h1>
        <p className="text-navy-300 dark:text-cream-400/60 mt-1">Manage your active students and session history.</p>
      </div>

      {uniqueStudents.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 bg-navy-50 dark:bg-navy-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-navy-300">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-2">No Students Yet</h3>
          <p className="text-navy-300 dark:text-cream-400">Your registered students will appear here once they book a session.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy-50/50 dark:bg-navy-600/50 border-b border-navy-100 dark:border-navy-400">
                  <th className="px-6 py-4 text-xs font-bold text-navy-400 dark:text-cream-300 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-400 dark:text-cream-300 uppercase tracking-wider">Total Sessions</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-400 dark:text-cream-300 uppercase tracking-wider">Latest Session</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-400 dark:text-cream-300 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-4 text-xs font-bold text-navy-400 dark:text-cream-300 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 dark:divide-navy-400/50">
                {uniqueStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-navy-50/30 dark:hover:bg-navy-500/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          {student.avatarUrl ? (
                            <Image 
                              src={student.avatarUrl} 
                              alt={student.name} 
                              fill 
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gold-400 flex items-center justify-center text-navy-600 font-bold text-sm">
                              {getInitials(student.name)}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-navy-600 dark:text-cream-200">{student.name}</div>
                          <div className="text-sm text-navy-300 dark:text-cream-400">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-navy-600 dark:text-cream-200 font-medium">{student.totalSessions} sessions</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-navy-600 dark:text-cream-200">
                        {format(new Date(student.latestSession), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gold-500">
                        ${student.totalSpent.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gold-500 hover:text-gold-600 transition-colors">
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Booking History Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200 mb-6">Recent Sessions</h2>
        {studentBookings.length === 0 ? (
          <p className="text-navy-300">No session history available.</p>
        ) : (
          <div className="grid gap-4">
            {studentBookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="glass-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-xl bg-navy-50 dark:bg-navy-500 flex flex-col items-center justify-center border border-navy-100 dark:border-navy-400">
                      <span className="text-xs font-bold text-gold-500">{format(new Date(booking.scheduledAt), 'MMM')}</span>
                      <span className="text-lg font-bold text-navy-600 dark:text-cream-200 leading-none">{format(new Date(booking.scheduledAt), 'd')}</span>
                   </div>
                   <div>
                     <p className="font-bold text-navy-600 dark:text-cream-200">Session with {booking.student.name}</p>
                     <p className="text-sm text-navy-300">
                       {format(new Date(booking.scheduledAt), 'h:mm a')} - {format(new Date(booking.scheduledAt.getTime() + booking.durationMinutes * 60000), 'h:mm a')}
                     </p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    booking.status === 'COMPLETED' ? 'bg-sage-100 text-sage-600 dark:bg-sage-500/20 dark:text-sage-400' :
                    booking.status === 'PENDING' ? 'bg-gold-100 text-gold-600 dark:bg-gold-500/20 dark:text-gold-400' :
                    'bg-navy-100 text-navy-500 dark:bg-navy-500/30 dark:text-navy-300'
                  }`}>
                    {booking.status}
                  </span>
                  <span className="font-bold text-navy-600 dark:text-cream-200">${(booking.payment?.amount || 0).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
