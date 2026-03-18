'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { getInitials } from '@/lib/utils';
import PasswordInput from '@/components/ui/PasswordInput';

const tabs = [
  { id: 'profile', label: 'Profile', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  )},
  { id: 'account', label: 'Account', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  )},
  { id: 'notifications', label: 'Notifications', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  )},
  { id: 'security', label: 'Security', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  )},
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: session?.user?.name || '',
    bio: '',
    location: '',
    hourlyRate: 0,
    languages: 'English',
  });

  useEffect(() => {
    const fetchTutorProfile = async () => {
      if (session?.user?.role === 'TUTOR') {
        try {
          const res = await fetch('/api/tutor/profile');
          if (res.ok) {
            const data = await res.json();
            setProfileData(prev => ({
              ...prev,
              bio: data.about || '',
              hourlyRate: data.hourlyRate || 0,
              languages: data.languages?.join(', ') || 'English',
            }));
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchTutorProfile();
  }, [session]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Update basic user info (placeholder logic)
      // For example, if you have an API endpoint to update user name and location
      // const userUpdateRes = await fetch('/api/user/profile', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     name: profileData.name,
      //     location: profileData.location,
      //   }),
      // });
      // if (!userUpdateRes.ok) throw new Error('Failed to update user profile');
      // await update({ name: profileData.name }); // Update session if name changed

      // Update tutor-specific info if applicable
      if (session?.user?.role === 'TUTOR') {
        const res = await fetch('/api/tutor/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            about: profileData.bio,
            hourlyRate: Number(profileData.hourlyRate),
            languages: profileData.languages.split(',').map(l => l.trim()),
          }),
        });
        
        if (!res.ok) throw new Error('Failed to update tutor profile');
      }

      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-200 dark:bg-navy-600 pt-24 md:pt-28 pb-16">
      <div className="page-container max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-navy-600 dark:text-cream-200">Settings</h1>
          <p className="text-navy-300 dark:text-cream-400/60 mt-1">Manage your account settings and preferences</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gold-400 text-navy-600 shadow-gold'
                    : 'text-navy-400 dark:text-cream-400 hover:bg-navy-50 dark:hover:bg-navy-500'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="glass-card p-8">
              {activeTab === 'profile' && (
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-6">Public Profile {session?.user?.role === 'TUTOR' && '(Tutor)'}</h2>
                    
                    {/* Avatar Upload */}
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-24 h-24 rounded-2xl bg-gold-400 flex items-center justify-center text-navy-600 text-3xl font-bold shadow-gold border-4 border-white dark:border-navy-500 overflow-hidden">
                        {session?.user?.image ? (
                          <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(session?.user?.name || '')
                        )}
                      </div>
                      <div className="space-y-2">
                        <button type="button" className="btn-primary py-2 px-4 text-xs">Change Photo</button>
                        <p className="text-[11px] text-navy-300 dark:text-cream-400/60">JPG, GIF or PNG. Max size of 2MB.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Display Name</label>
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none transition-all"
                        />
                      </div>
                      
                      {session?.user?.role === 'TUTOR' && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Hourly Rate ($)</label>
                              <input
                                type="number"
                                value={profileData.hourlyRate}
                                onChange={(e) => setProfileData({ ...profileData, hourlyRate: Number(e.target.value) })}
                                className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Languages (comma separated)</label>
                              <input
                                type="text"
                                value={profileData.languages}
                                onChange={(e) => setProfileData({ ...profileData, languages: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Bio / About Me</label>
                        <textarea
                          rows={4}
                          value={profileData.bio}
                          onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none transition-all resize-none"
                        />
                        <p className="text-xs text-navy-300 dark:text-cream-400/60">Professional summary shown on your public profile.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Location</label>
                        <input
                          type="text"
                          value={profileData.location}
                          onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl bg-cream-100 dark:bg-navy-500 border border-navy-100 dark:border-navy-400 text-navy-600 dark:text-cream-200 text-sm focus:ring-2 focus:ring-gold-400 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-navy-100 dark:border-navy-400/30 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-primary py-2.5 px-8 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'account' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-6">Account Settings</h2>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Email Address</label>
                        <div className="flex gap-3">
                          <input
                            type="email"
                            readOnly
                            value={session?.user?.email || ''}
                            className="flex-1 px-4 py-3 rounded-xl bg-navy-50 dark:bg-navy-600 border border-navy-100 dark:border-navy-400 text-navy-400 dark:text-cream-400/60 text-sm outline-none cursor-not-allowed"
                          />
                          <button type="button" className="btn-outline py-2 px-4 whitespace-nowrap text-xs">Verify Email</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-navy-600 dark:text-cream-200">Account Role</label>
                        <div className="p-4 rounded-xl border border-gold-400/30 bg-gold-50/10 dark:bg-gold-900/10">
                          <p className="text-sm font-bold text-navy-600 dark:text-cream-200 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gold-400" />
                            {session?.user?.role || 'STUDENT'}
                          </p>
                          <p className="text-xs text-navy-400 dark:text-cream-400/60 mt-1">You can change your role if you want to become a tutor.</p>
                          <button type="button" className="mt-3 text-xs font-bold text-gold-500 hover:text-gold-600">Upgrade to Tutor Account</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-red-100 dark:border-red-900/30">
                    <h3 className="text-sm font-bold text-red-500 mb-2">Danger Zone</h3>
                    <p className="text-xs text-navy-300 dark:text-cream-400/60 mb-4">Permanently delete your account and all your data. This action cannot be undone.</p>
                    <button type="button" className="btn-outline border-red-200 text-red-500 hover:bg-red-50 dark:border-red-500/30 hover:text-red-600">Delete Account</button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-6">Notification Preferences</h2>
                  <div className="space-y-6">
                    {[
                      { title: 'Session Updates', desc: 'Get notified about session bookings, rescheduling, and cancellations.' },
                      { title: 'Messages', desc: 'Receive emails when you get a new message from a tutor/student.' },
                      { title: 'Marketing', desc: 'News about feature updates and platform promotions.' },
                      { title: 'Payment Alerts', desc: 'Confirmations and receipts for your transactions.' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-4 border-b border-navy-100 dark:border-navy-400/20 last:border-0">
                        <div>
                          <p className="text-sm font-bold text-navy-600 dark:text-cream-200">{item.title}</p>
                          <p className="text-xs text-navy-300 dark:text-cream-400/60 mt-0.5">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-navy-200 peer-focus:outline-none dark:bg-navy-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gold-400"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-6">Security & Password</h2>
                  <form className="space-y-6 max-w-md">
                    <PasswordInput
                      label="Current Password"
                      placeholder="••••••••"
                    />
                    <PasswordInput
                      label="New Password"
                      placeholder="••••••••"
                    />
                    <PasswordInput
                      label="Confirm New Password"
                      placeholder="••••••••"
                    />
                    <button type="submit" className="btn-primary py-2.5 px-6">Update Password</button>
                  </form>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
