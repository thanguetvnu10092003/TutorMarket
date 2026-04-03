'use client';

import React from 'react';

interface VideoPlayerProps {
  url?: string;
  poster?: string;
  className?: string;
}

export function parseVideoSource(url: string): { type: 'IFRAME' | 'NATIVE' | 'INVALID'; src: string } {
  if (!url) return { type: 'INVALID', src: '' };
  
  try {
    const u = new URL(url);
    
    // YouTube
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      return v ? { type: 'IFRAME', src: `https://www.youtube.com/embed/${v}` } : { type: 'INVALID', src: '' };
    }
    if (u.hostname === 'youtu.be') {
      return { type: 'IFRAME', src: `https://www.youtube.com/embed${u.pathname}` };
    }
    
    // Loom
    if (u.hostname.includes('loom.com')) {
      const parts = u.pathname.split('/');
      const id = parts[parts.length - 1];
      return { type: 'IFRAME', src: `https://www.loom.com/embed/${id}` };
    }
    
    // Default to native video (mp4, webm, or Supabase links)
    return { type: 'NATIVE', src: url };
  } catch {
    return { type: 'INVALID', src: '' };
  }
}

export default function VideoPlayer({ url, poster, className = '' }: VideoPlayerProps) {
  const video = parseVideoSource(url || '');

  if (video.type === 'INVALID') {
    return (
      <div className={`relative bg-navy-900 flex items-center justify-center overflow-hidden ${className}`}>
        {poster && <img src={poster} alt="" className="w-full h-full object-cover opacity-40 blur-sm" />}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-navy-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <span className="mt-2 text-[10px] font-black uppercase tracking-widest opacity-60">No intro video</span>
        </div>
      </div>
    );
  }

  if (video.type === 'IFRAME') {
    return (
      <div className={`relative aspect-video bg-black overflow-hidden ${className}`}>
        <iframe
          src={video.src}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Tutor intro video"
        />
      </div>
    );
  }

  return (
    <div className={`relative aspect-video bg-black overflow-hidden ${className}`}>
      <video
        src={video.src}
        poster={poster}
        controls
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
}
