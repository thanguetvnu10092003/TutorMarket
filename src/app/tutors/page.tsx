'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter, type ReadonlyURLSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { SUBJECT_LABELS, type Subject } from '@/types';
import TutorFilterBar from '@/components/tutors/TutorFilterBar';
import HorizontalTutorCard from '@/components/tutors/HorizontalTutorCard';
import BookingModal from '@/components/student/BookingModal';
import { dispatchFavoritesUpdated } from '@/lib/favorite-events';
import { toast } from 'react-hot-toast';
import VideoPlayer from '@/components/shared/VideoPlayer';
import { SearchX } from '@/components/ui/icons';

type TutorFilters = {
  subject: string;
  minPrice: number | '';
  maxPrice: number | '';
  language: string;
  country: string;
  availability: string;
  nativeSpeaker: boolean;
  category: string;
  sortBy: string;
  search: string;
};

const DEFAULT_FILTERS: TutorFilters = {
  subject: '',
  minPrice: '',
  maxPrice: '',
  language: '',
  country: '',
  availability: '',
  nativeSpeaker: false,
  category: '',
  sortBy: 'default',
  search: '',
};

function getFiltersFromSearchParams(searchParams: Pick<ReadonlyURLSearchParams | URLSearchParams, 'get'>): TutorFilters {
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');

  return {
    subject: searchParams.get('subject') || '',
    minPrice: minPrice ? Number(minPrice) : '',
    maxPrice: maxPrice ? Number(maxPrice) : '',
    language: searchParams.get('language') || '',
    country: searchParams.get('country') || '',
    availability: searchParams.get('availability') || '',
    nativeSpeaker: searchParams.get('nativeSpeaker') === 'true',
    category: searchParams.get('category') || '',
    sortBy: searchParams.get('sortBy') || 'default',
    search: searchParams.get('search') || '',
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
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="relative overflow-hidden glass-card h-64 rounded-[32px] bg-white dark:bg-navy-800">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease_infinite] bg-gradient-to-r from-transparent via-gold-400/5 to-transparent" />
              </div>
            ))}
          </div>
          <aside className="hidden lg:block">
            <div className="relative overflow-hidden glass-card h-[420px] rounded-[32px] bg-white dark:bg-navy-800">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease_infinite] bg-gradient-to-r from-transparent via-gold-400/5 to-transparent" />
            </div>
          </aside>
        </div>
      </div>
    </div>
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
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [topOffset, setTopOffset] = useState(0);

  useEffect(() => {
    if (selectedTutorId && cardRefs.current[selectedTutorId]) {
      setTopOffset(cardRefs.current[selectedTutorId]?.offsetTop || 0);
    } else {
      setTopOffset(0);
    }
  }, [selectedTutorId, results]);

  useEffect(() => {
    const nextFilters = getFiltersFromSearchParams(new URLSearchParams(searchParamsKey));

    setFilters((current) => (areFiltersEqual(current, nextFilters) ? current : nextFilters));
    setSelectedTutorId(null);
  }, [searchParamsKey]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
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
    let controller = new AbortController();

    async function load(silent = false) {
      if (!silent) setLoading(true);
      const params = new URLSearchParams();
      if (filters.subject) params.set('subject', filters.subject);
      if (filters.minPrice) params.set('minPrice', String(filters.minPrice));
      if (filters.maxPrice) params.set('maxPrice', String(filters.maxPrice));
      if (filters.language) params.set('language', filters.language);
      if (filters.availability) params.set('availability', filters.availability);
      if (filters.nativeSpeaker) params.set('nativeSpeaker', 'true');
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
          if (data.length === 0) return null;
          if (!current || !data.some((tutor: any) => tutor.id === current)) return data[0].id;
          return current;
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error(err);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    }

    void load();
    // Bug 4.1: Auto-refresh every 30s to keep availability/data current
    const interval = setInterval(() => {
      controller.abort();
      controller = new AbortController();
      void load(true);
    }, 30000);

    return () => { controller.abort(); clearInterval(interval); };
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 mt-8 relative">
          {/* Main Listing */}
          <div className="space-y-6 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="glass-card p-6 flex gap-4 animate-pulse">
                    <div className="w-20 h-20 rounded-2xl bg-navy-100 dark:bg-navy-500/40 flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 w-1/3 rounded-lg bg-navy-100 dark:bg-navy-500/40" />
                      <div className="h-4 w-2/3 rounded-lg bg-navy-100 dark:bg-navy-500/40" />
                      <div className="h-4 w-1/2 rounded-lg bg-navy-100 dark:bg-navy-500/40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              results.map((tutor, index) => (
                <div
                  key={tutor.id}
                  ref={el => { cardRefs.current[tutor.id] = el; }}
                  onClick={() => setSelectedTutorId(tutor.id)}
                  className={`cursor-pointer min-w-0 transition-all ${selectedTutorId === tutor.id ? 'ring-4 ring-gold-400 rounded-[32px]' : ''}`}
                  style={{
                    opacity: loading ? 0 : 1,
                    transform: loading ? 'translateY(16px)' : 'translateY(0)',
                    transition: `opacity 0.45s ease ${Math.min(index * 0.07, 0.4)}s, transform 0.45s ease ${Math.min(index * 0.07, 0.4)}s`,
                  }}
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
              <div className="flex flex-col items-center justify-center py-24 gap-5">
                {/* Animated empty icon */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-cream-100 dark:bg-navy-500/50 flex items-center justify-center shadow-[0_4px_20px_rgba(10,22,40,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                    <SearchX size={32} className="text-navy-300 dark:text-cream-400/40" aria-hidden={true} />
                  </div>
                  <div className="absolute inset-0 rounded-2xl border-2 border-gold-400/20 animate-ping" style={{ animationDuration: '2s' }} />
                </div>
                <div className="text-center">
                  <h3 className="text-base font-bold text-navy-600 dark:text-cream-200 mb-1.5">No tutors found</h3>
                  <p className="text-sm text-navy-300 dark:text-cream-400/60 max-w-xs leading-relaxed">
                    Try adjusting your filters or search term to find available tutors.
                  </p>
                </div>
                <button
                  onClick={handleResetFilters}
                  className="btn-outline text-sm px-5 py-2.5 hover:shadow-navy-sm transition-shadow duration-200"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Sticky Detail Sidebar */}
          <aside className="hidden lg:block">
            <div
              style={{ marginTop: `${Math.max(0, topOffset - 32)}px` }}
              className="space-y-6 transition-all duration-500 ease-out"
            >
            {selectedTutor && (
              <div
                className="glass-card bg-white dark:bg-navy-800 rounded-[32px] overflow-hidden border border-navy-100/50 dark:border-navy-500/10 shadow-2xl"
                style={{
                  animation: 'slideInRight 0.4s cubic-bezier(0.4,0,0.2,1) both',
                }}
              >
                <VideoPlayer
                  url={selectedTutor.videoUrl}
                  poster={selectedTutor.user?.avatarUrl}
                  className="aspect-video"
                />
                <div className="p-6 space-y-3">
                  <button
                    onClick={() => navigateToProfile(selectedTutor.id)}
                    className="w-full py-3.5 border-2 border-navy-100 dark:border-navy-700 rounded-2xl label-sm text-navy-600 dark:text-cream-200 hover:bg-navy-600 hover:text-cream-200 hover:border-navy-600 dark:hover:bg-cream-200 dark:hover:text-navy-700 dark:hover:border-cream-200 transition-all duration-200 font-display"
                  >
                    View full schedule
                  </button>
                  <button
                    onClick={() => navigateToProfile(selectedTutor.id)}
                    className="w-full py-3.5 bg-gold-400 hover:bg-gold-300 text-navy-700 rounded-2xl label-sm font-bold transition-all duration-200 hover:shadow-gold active:scale-[0.98]"
                  >
                    See {selectedTutor.user?.name.split(' ')[0]}&apos;s profile
                  </button>
                </div>
              </div>
            )}
            </div>
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
