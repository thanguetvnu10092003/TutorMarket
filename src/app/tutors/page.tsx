'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SUBJECT_LABELS, type Subject } from '@/types';
import TutorFilterBar from '@/components/tutors/TutorFilterBar';
import HorizontalTutorCard from '@/components/tutors/HorizontalTutorCard';
import BookingModal from '@/components/student/BookingModal';
import { toast } from 'react-hot-toast';

function TutorsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    subject: searchParams.get('subject') || '',
    minPrice: '' as number | '',
    maxPrice: '' as number | '',
    language: '',
    country: '',
    availability: '',
    specialty: '',
    nativeSpeaker: false,
    category: '',
    sortBy: 'default',
    search: '',
  });

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  const [bookingTutor, setBookingTutor] = useState<any>(null);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      subject: '',
      minPrice: '',
      maxPrice: '',
      language: '',
      country: '',
      availability: '',
      specialty: '',
      nativeSpeaker: false,
      category: '',
      sortBy: 'default',
      search: '',
    });
    setSelectedTutorId(null);
  };

  const handleSendMessage = (tutorId: string) => {
    router.push(`/dashboard/student?tab=messages&tutorId=${tutorId}`);
  };

  const navigateToProfile = (tutorId: string) => {
    router.push(`/tutors/${tutorId}`);
  };

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.subject) params.set('subject', filters.subject);
      if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
      if (filters.language) params.set('language', filters.language);
      if (filters.sortBy !== 'default') params.set('sortBy', filters.sortBy);
      if (filters.search) params.set('search', filters.search);
      if (filters.country) params.set('country', filters.country);

      try {
        const response = await fetch(`/api/tutors?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const json = await response.json();
        const data = json.data || [];
        setResults(data);
        if (data.length > 0 && !selectedTutorId) {
            setSelectedTutorId(data[0].id);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [filters]);

  const selectedTutor = results.find(t => t.id === selectedTutorId) || results[0];

  return (
    <div className="min-h-screen bg-cream-50/50 dark:bg-navy-900 pt-32 pb-16 transition-colors duration-500">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        
        <TutorFilterBar 
            filters={filters} 
            onFilterChange={handleFilterChange} 
            onResetFilters={handleResetFilters}
            totalResults={results.length} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start mt-8">
          {/* Main Listing */}
          <div className="space-y-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card h-64 animate-pulse rounded-[32px] bg-white dark:bg-navy-800" />
              ))
            ) : results.length > 0 ? (
              results.map((tutor) => (
                <div 
                    key={tutor.id} 
                    onClick={() => setSelectedTutorId(tutor.id)}
                    className={`cursor-pointer transition-all ${selectedTutorId === tutor.id ? 'ring-4 ring-gold-400 rounded-[32px]' : ''}`}
                >
                    <HorizontalTutorCard 
                        tutor={tutor} 
                        onBookTrial={() => setBookingTutor(tutor)}
                        onSendMessage={() => handleSendMessage(tutor.id)}
                    />
                </div>
              ))
            ) : (
              <div className="glass-card p-20 text-center rounded-[32px]">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-display font-black text-navy-600 dark:text-cream-200 uppercase tracking-tight">No tutors found</h3>
                <p className="text-xs font-bold text-navy-300 dark:text-cream-400/40 uppercase tracking-widest mt-2">Try adjusting your filters to find more tutors.</p>
              </div>
            )}
          </div>

          {/* Sticky Detail Sidebar */}
          <aside className="hidden lg:block sticky top-32 space-y-6">
            {selectedTutor && (
              <div className="glass-card bg-white dark:bg-navy-800 rounded-[32px] overflow-hidden border border-navy-100/50 dark:border-navy-500/10 shadow-2xl">
                <div className="aspect-video relative bg-navy-900 flex items-center justify-center overflow-hidden">
                    {/* Mock Video Placeholder */}
                    <img src={selectedTutor.user?.avatarUrl} alt="" className="w-full h-full object-cover opacity-60 blur-sm" />
                    <button 
                        onClick={() => navigateToProfile(selectedTutor.id)}
                        className="absolute inset-0 flex items-center justify-center group/play"
                    >
                        <div className="w-16 h-16 bg-gold-400 text-navy-900 rounded-full flex items-center justify-center shadow-2xl group-hover/play:scale-110 transition-transform">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </button>
                </div>
                <div className="p-8 space-y-4">
                    <button 
                        onClick={() => navigateToProfile(selectedTutor.id)}
                        className="w-full py-4 border-2 border-navy-100 dark:border-navy-700 rounded-2xl text-xs font-black uppercase tracking-widest text-navy-600 dark:text-cream-200 hover:bg-navy-50 dark:hover:bg-navy-700 transition-all font-display"
                    >
                        View full schedule
                    </button>
                    <button 
                        onClick={() => navigateToProfile(selectedTutor.id)}
                        className="w-full py-4 border-2 border-navy-100 dark:border-navy-700 rounded-2xl text-xs font-black uppercase tracking-widest text-navy-600 dark:text-cream-200 hover:bg-navy-50 dark:hover:bg-navy-700 transition-all font-display"
                    >
                        See {selectedTutor.user?.name.split(' ')[0]}'s profile
                    </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {bookingTutor && (
        <BookingModal 
            tutor={bookingTutor} 
            isOpen={!!bookingTutor} 
            onClose={() => setBookingTutor(null)} 
        />
      )}
    </div>
  );
}

export default function TutorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-200 dark:bg-navy-600" />}>
      <TutorsContent />
    </Suspense>
  );
}
