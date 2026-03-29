import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TutorResourcesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== 'TUTOR' && session.user.role !== 'ADMIN')) {
    redirect('/');
  }

  const resourceCategories = [
    {
      title: "Platform Basics",
      description: "Learn how to use PrepPass to find students and manage your business.",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>,
      links: [
        { label: "Getting Started Guide", href: "#" },
        { label: "How to Optimize Your Profile", href: "#" },
        { label: "Understanding Payments and Fees", href: "#" }
      ]
    },
    {
      title: "Teaching Excellence",
      description: "Tips and strategies for delivering high-quality online sessions.",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5"/></svg>,
      links: [
        { label: "Engaging Students Remotely", href: "#" },
        { label: "Effective Use of Digital Whiteboards", href: "#" },
        { label: "Handling Difficult Questions", href: "#" }
      ]
    },
    {
      title: "Tools & Equipment",
      description: "Recommended hardware and software for online tutoring.",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
      links: [
        { label: "Best Webcams for Education", href: "#" },
        { label: "Microphone Setup Guide", href: "#" },
        { label: "Lighting Tips for Video Calls", href: "#" }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">Tutor Resources</h1>
        <p className="text-navy-300 dark:text-cream-400/60 mt-1">Everything you need to succeed on PrepPass.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {resourceCategories.map((category, idx) => (
           <div key={idx} className="glass-card p-6 flex flex-col h-full hover:shadow-gold transition-shadow duration-300">
              <div className="w-12 h-12 bg-navy-50 dark:bg-navy-500 text-gold-500 rounded-xl flex items-center justify-center mb-6">
                 {category.icon}
              </div>
              <h3 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-3">{category.title}</h3>
              <p className="text-sm text-navy-300 dark:text-cream-400 mb-6 flex-grow">{category.description}</p>
              
              <ul className="space-y-3">
                 {category.links.map((link, lidx) => (
                    <li key={lidx}>
                       <a href={link.href} className="text-sm font-medium text-navy-500 dark:text-cream-300 hover:text-gold-500 dark:hover:text-gold-400 flex items-center gap-2 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          {link.label}
                       </a>
                    </li>
                 ))}
              </ul>
           </div>
        ))}
      </div>

      <div className="mt-12 glass-card p-8 bg-gradient-to-br from-gold-400 to-gold-600 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
           <svg width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2">Need direct assistance?</h3>
          <p className="text-gold-50 mb-6 max-w-lg">Our tutor support team is available 24/7 to help you resolve technical issues, handle disputes, or optimize your profile.</p>
          <button className="bg-white text-navy-600 hover:bg-cream-100 font-bold py-3 px-6 rounded-xl transition-colors shadow-lg">
             Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
