'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter, type ReadonlyURLSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { SUBJECT_LABELS, type Subject } from '@/types';
import TutorFilterBar from '@/components/tutors/TutorFilterBar';
import HorizontalTutorCard from '@/components/tutors/HorizontalTutorCard';
import BookingModal from '@/components/student/BookingModal';
import { dispatchFavoritesUpdated } from '@/lib/favorite-events';
import { toast } from 'react-hot-toast';

type TutorFilters = {
  subject: string;
  minPrice: number | '';
  maxPrice: number | '';
  language: string;
  country: string;
  availability: string;
  specialty: string;
  nativeSpeaker: boolean;
  category: string;
  sortBy: string;
  search: string;
};

function getFiltersFromSearchParams(searchParams: Pick<ReadonlyURLSearchParams | URLSearchParams, 'get'>): TutorFilters {
  return {
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
  };
}

function areFiltersEqual(current: TutorFilters, next: TutorFilters) {
  return JSON.stringify(current) === JSON.stringify(next);
}

function TutorsPageSkeleton() {
  return (
    <div className="min-h-screen bg-cream-50/50 dark:bg-navy-900 pt-32 pb-16 transition-colors duration-500">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 rounded-2xl bg-white dark:bg-navy-800 animate-pulse border border-navy-100/50 dark:border-navy-500/10" />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 w-28 rounded-xl bg-white dark:bg-navy-800 animate-pulse border border-navy-100/50 dark:border-navy-500/10" />
            ))}
          </div>
          <div className="h-8 w-56 rounded-xl bg-white dark:bg-navy-800 animate-pulse border border-navy-100/50 dark:border-navy-500/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start mt-8">
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="glass-card h-64 animate-pulse rounded-[32px] bg-white dark:bg-navy-800" />
            ))}
          </div>
          <aside className="hidden lg:block">
            <div className="glass-card h-[420px] animate-pulse rounded-[32px] bg-white dark:bg-navy-800" />
          </aside>
        </div>
      </div>
    </div>
  );
}

function TutorListLoadingCards() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="glass-card h-64 animate-pulse rounded-[32px] bg-white dark:bg-navy-800" />
      ))}
    </>
  );
}

function TutorsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const searchParamsKey = searchParams.toString();
  
  const [filters, setFilters] = useState<TutorFilters>(() => getFiltersFromSearchParams(searchParams));

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  const [bookingTutor, setBookingTutor] = useState<any>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    const nextFilters = getFiltersFromSearchParams(new URLSearchParams(searchParamsKey));

    setFilters((current) => (areFiltersEqual(current, nextFilters) ? current : nextFilters));
    setSelectedTutorId(null);
  }, [searchParamsKey]);

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
    if (!session?.user) {
      signIn(undefined, { callbackUrl: window.location.pathname + window.location.search });
      return;
    }

    router.push(`/dashboard/student?tab=messages&tutorId=${tutorId}`);
  };

  const handleToggleFavorite = async (tutorId: string) => {
    if (!session?.user) {
      signIn(undefined, { callbackUrl: window.location.pathname + window.location.search });
      return;
    }

    if (session.user.role !== 'STUDENT') {
      toast.error('Only students can save favorite tutors.');
      return;
    }

    const isFavorite = favoriteIds.includes(tutorId);

    try {
      const response = await fetch('/api/student/favorites', {
        method: isFavorite ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorProfileId: tutorId }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to update favorites');
      }

      setFavoriteIds((prev) =>
        isFavorite ? prev.filter((id) => id !== tutorId) : [...prev, tutorId]
      );
      dispatchFavoritesUpdated();
      toast.success(isFavorite ? 'Removed from favorites' : 'Saved to favorites');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update favorites');
    }
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
        setSelectedTutorId((current) => {
          if (data.length === 0) {
            return null;
          }

          if (!current || !data.some((tutor: any) => tutor.id === current)) {
            return data[0].id;
          }

          return current;
        });
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

  useEffect(() => {
    const controller = new AbortController();

    async function loadFavorites() {
      if (!session?.user || session.user.role !== 'STUDENT') {
        setFavoriteIds([]);
        return;
      }

      try {
        const response = await fetch('/api/student/favorites', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || 'Failed to load favorites');
        }

        setFavoriteIds((json.data || []).map((tutor: any) => tutor.id));
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          console.error('Failed to load favorites:', error);
        }
      }
    }

    void loadFavorites();
    return () => controller.abort();
  }, [session]);

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
              <TutorListLoadingCards />
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
                        isFavorite={favoriteIds.includes(tutor.id)}
                        onToggleFavorite={handleToggleFavorite}
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
    <Suspense fallback={<TutorsPageSkeleton />}>
      <TutorsContent />
    </Suspense>
  );
}
