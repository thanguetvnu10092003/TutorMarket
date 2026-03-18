'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function ReviewsSection() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tutor/reviews?rating=${filterRating}&page=${currentPage}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (error) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filterRating, currentPage]);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await fetch('/api/tutor/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, reply: replyText }),
      });
      if (res.ok) {
        toast.success('Reply posted!');
        setReplyingTo(null);
        setReplyText('');
        fetchReviews();
      } else {
        toast.error('Failed to post reply');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading && !data) return <div className="glass-card p-12 text-center animate-pulse">Loading reviews...</div>;

  return (
    <div className="glass-card p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-xl font-bold text-navy-600 dark:text-cream-200 mb-1">Student Reviews</h2>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-display font-bold text-gold-500">
              {data?.reviews?.length > 0 ? (data?.reviews?.reduce((acc: any, r: any) => acc + r.rating, 0) / data?.reviews?.length).toFixed(1) : '0.0'}
            </span>
            <div className="flex text-gold-400">
              {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ))}
            </div>
            <span className="text-xs text-navy-300 dark:text-cream-400/60 uppercase tracking-widest font-bold">
              ({data?.totalCount || 0} reviews)
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {['All', '5', '4', '3', '2', '1'].map(r => (
            <button
              key={r}
              onClick={() => { setFilterRating(r); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                filterRating === r 
                  ? 'bg-navy-600 text-white border-navy-600 shadow-lg' 
                  : 'bg-white dark:bg-navy-600/50 text-navy-400 border-navy-100 dark:border-navy-400/10 hover:border-gold-400/50'
              }`}
            >
              {r === 'All' ? 'All Reviews' : `${r} ★`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-1 space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = data?.distribution?.[star] || 0;
            const percentage = data?.totalCount > 0 ? (count / data?.totalCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-navy-400 w-4">{star}★</span>
                <div className="flex-1 h-2 bg-navy-50 dark:bg-navy-500 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gold-400 transition-all duration-1000" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-navy-300 w-8">{Math.round(percentage)}%</span>
              </div>
            );
          })}
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          {data?.reviews?.length > 0 ? (
            data.reviews.map((review: any) => (
              <div key={review.id} className="p-5 rounded-2xl bg-white/50 dark:bg-navy-600/50 border border-navy-100 dark:border-navy-400/10 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-navy-100 dark:bg-navy-500 flex items-center justify-center font-bold text-navy-400">
                      {review.student.avatarUrl ? (
                        <img src={review.student.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                      ) : review.student.name[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-navy-600 dark:text-cream-200">
                        {review.student.name.split(' ')[0]} {review.student.name.split(' ').slice(1).map((n:string)=>n[0]).join('')}.
                      </h4>
                      <p className="text-[10px] text-navy-300 font-medium">
                        {review.booking.subject.replace(/_/g, ' ')} • {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex text-gold-400 scale-75 origin-right">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < review.rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    ))}
                  </div>
                </div>
                
                <p className="text-sm text-navy-500 dark:text-cream-400/80 leading-relaxed mb-4 italic">
                  &quot;{review.comment}&quot;
                </p>

                {review.tutorReply ? (
                  <div className="mt-4 p-4 rounded-xl bg-navy-50 dark:bg-navy-500/30 border-l-4 border-gold-400">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] font-black text-gold-500 uppercase tracking-widest">Your Private Reply</span>
                       <span className="text-[9px] text-navy-300">• {new Date(review.repliedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-navy-600 dark:text-cream-400 font-medium">{review.tutorReply}</p>
                  </div>
                ) : (
                  replyingTo === review.id ? (
                    <div className="mt-4 space-y-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a professional reply..."
                        className="w-full p-3 rounded-xl bg-white dark:bg-navy-700 border border-navy-100 dark:border-navy-400/20 text-xs focus:ring-2 focus:ring-gold-400 outline-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => {setReplyingTo(null); setReplyText('');}} className="px-3 py-1.5 text-[10px] font-bold text-navy-400 uppercase tracking-widest">Cancel</button>
                        <button 
                          onClick={() => handleReply(review.id)}
                          disabled={submittingReply}
                          className="btn-primary px-4 py-1.5 text-[10px] font-bold"
                        >
                          {submittingReply ? 'Posting...' : 'Post Reply'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setReplyingTo(review.id)}
                      className="text-[10px] font-black text-gold-500 hover:text-gold-600 uppercase tracking-widest flex items-center gap-1 group"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:translate-x-0.5 transition-transform"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>
                      Reply to review
                    </button>
                  )
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-navy-50 dark:bg-navy-600/20 rounded-3xl border-2 border-dashed border-navy-100 dark:border-navy-400/10">
              <p className="text-navy-300 italic text-sm">No reviews found for this rating.</p>
            </div>
          )}

          {data?.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 rounded-lg bg-white dark:bg-navy-600 border border-navy-100 dark:border-navy-400/20 disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="text-xs font-bold text-navy-400">Page {currentPage} of {data.totalPages}</span>
              <button 
                disabled={currentPage === data.totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 rounded-lg bg-white dark:bg-navy-600 border border-navy-100 dark:border-navy-400/20 disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
