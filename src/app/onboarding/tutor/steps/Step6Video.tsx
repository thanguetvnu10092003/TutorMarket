'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useSession } from 'next-auth/react';

interface Props { onNext: () => void; onBack: () => void; }

type TabType = 'LINK' | 'RECORD';
type RecordingState = 'IDLE' | 'RECORDING' | 'PREVIEW';

function parseVideoSource(url: string): { type: 'IFRAME' | 'NATIVE' | 'INVALID', src: string } {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      return v ? { type: 'IFRAME', src: `https://www.youtube.com/embed/${v}` } : { type: 'INVALID', src: '' };
    }
    if (u.hostname === 'youtu.be') {
      return { type: 'IFRAME', src: `https://www.youtube.com/embed${u.pathname}` };
    }
    if (u.hostname.includes('loom.com')) {
      const parts = u.pathname.split('/');
      const id = parts[parts.length - 1];
      return { type: 'IFRAME', src: `https://www.loom.com/embed/${id}` };
    }
    if (u.hostname.includes('supabase.co')) {
      return { type: 'NATIVE', src: url };
    }
    return { type: 'INVALID', src: '' };
  } catch { return { type: 'INVALID', src: '' }; }
}

export default function Step6Video({ onNext, onBack }: Props) {
  const { data: session } = useSession();
  
  // States
  const [activeTab, setActiveTab] = useState<TabType>('LINK');
  const [isSaving, setIsSaving] = useState(false);
  
  // Link Tab State
  const [videoUrl, setVideoUrl] = useState('');
  const [parsedVideo, setParsedVideo] = useState<{ type: string, src: string }>({ type: 'INVALID', src: '' });
  
  // Record Tab State
  const [recordingState, setRecordingState] = useState<RecordingState>('IDLE');
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Refs for media
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Initial Load
  useEffect(() => {
    fetch('/api/onboarding/step/6').then(r => r.json()).then(d => {
      if (d.data?.videoUrl) {
        setVideoUrl(d.data.videoUrl);
        setParsedVideo(parseVideoSource(d.data.videoUrl));
        // Automatically switch to record tab if it's a native uploaded video
        if (d.data.videoUrl.includes('supabase.co')) {
          setActiveTab('RECORD');
          setPreviewBlobUrl(d.data.videoUrl);
          setRecordingState('PREVIEW');
          // Fake blob just to pass the save check if they don't retake
          // But actually we are already saved, if they hit save again we should just skip upload if nothing changed.
        }
      }
    });
  }, []);

  // 2. Camera Management (ON/OFF)
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      toast.error('Could not access camera/microphone. Please allow permissions in your browser.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (liveVideoRef.current) liveVideoRef.current.srcObject = null;
  };

  useEffect(() => {
    if (activeTab === 'RECORD' && recordingState === 'IDLE') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, recordingState]);

  // 3. Recording Controls
  const handleStartRecording = () => {
    if (!streamRef.current) return;
    setRecordingState('RECORDING');
    setRecordedChunks([]);
    // Prefer specific codecs for better compatibility across browsers
    const mimeTypes = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
      'video/mp4'
    ];
    
    let selectedMimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: selectedMimeType });
    mediaRecorderRef.current = mediaRecorder;
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: selectedMimeType || 'video/webm' });
      setVideoBlob(blob);
      setPreviewBlobUrl(URL.createObjectURL(blob));
      setRecordingState('PREVIEW');
    };

    mediaRecorder.start(); // No timeslice, get all data at stop
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRetake = () => {
    setVideoBlob(null);
    if (previewBlobUrl && !previewBlobUrl.startsWith('http')) {
       URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setRecordedChunks([]);
    setRecordingState('IDLE');
  };

  // 4. Save Logic
  const handleUrlChange = (v: string) => {
    setVideoUrl(v);
    setParsedVideo(parseVideoSource(v));
  };

  const submitApi = async (url: string) => {
    setIsSaving(true);
    try {
      await fetch('/api/onboarding/step/6', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ videoUrl: url }),
      });
      if (url) toast.success('Video saved!');
      onNext();
    } catch {
      toast.error('Failed to save to database');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (skip = false) => {
    if (skip) return submitApi('');

    if (activeTab === 'LINK') {
      if (!videoUrl || parsedVideo.type === 'INVALID') {
         toast.error('Please enter a valid YouTube or Loom URL');
         return;
      }
      return submitApi(videoUrl);
    } else {
       // If in PREVIEW state but videoBlob is null, it means it's an already loaded Supabase URL
       if (recordingState === 'PREVIEW' && !videoBlob && previewBlobUrl?.startsWith('http')) {
          return submitApi(previewBlobUrl);
       }

       if (!videoBlob) {
         toast.error('Please record a video first');
         return;
       }
       setIsSaving(true);
       try {
         const fileExt = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
         const fileName = `${session?.user?.id || 'tutor'}-${Date.now()}.${fileExt}`;
         const filePath = `intros/${fileName}`;

         const { error: uploadError } = await supabase.storage
            .from('tutor-videos')
            .upload(filePath, videoBlob, {
               contentType: videoBlob.type,
               upsert: true
            });

         if (uploadError) throw uploadError;

         const { data: publicUrlData } = supabase.storage.from('tutor-videos').getPublicUrl(filePath);
         await submitApi(publicUrlData.publicUrl);
         
       } catch (err: any) {
         console.error('Upload Error:', err);
         toast.error('Failed to upload video. Are Supabase keys set up correctly?');
         setIsSaving(false);
       }
    }
  };

  return (
    <div className="glass-card p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold text-navy-600 dark:text-cream-200">Intro Video</h2>
        <p className="text-navy-400 dark:text-cream-400/60 mt-1">A short video helps students connect with you instantly. This step is optional.</p>
      </div>

      {/* TABS */}
      <div className="flex p-1 bg-navy-50 dark:bg-navy-600/30 rounded-xl">
         <button 
           onClick={() => setActiveTab('LINK')}
           className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'LINK' ? 'bg-white dark:bg-navy-500 text-navy-600 dark:text-cream-200 shadow-sm' : 'text-navy-400 dark:text-cream-400/60 hover:text-navy-500'}`}
         >
           Link YouTube / Loom
         </button>
         <button 
           onClick={() => setActiveTab('RECORD')}
           className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'RECORD' ? 'bg-white dark:bg-navy-500 text-navy-600 dark:text-cream-200 shadow-sm' : 'text-navy-400 dark:text-cream-400/60 hover:text-navy-500'}`}
         >
           Record from Camera
         </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'LINK' && (
           <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="space-y-2">
               <label className="text-sm font-bold text-navy-500 dark:text-cream-300">YouTube or Loom URL</label>
               <input
                 className="input-field w-full"
                 placeholder="https://www.youtube.com/watch?v=..."
                 value={videoUrl}
                 onChange={e => handleUrlChange(e.target.value)}
               />
             </div>

             {parsedVideo.type === 'IFRAME' && (
               <div className="rounded-2xl overflow-hidden border border-navy-100 dark:border-navy-400/20 aspect-video bg-navy-50">
                 <iframe src={parsedVideo.src} className="w-full h-full" allowFullScreen title="Video preview" />
               </div>
             )}
              {parsedVideo.type === 'NATIVE' && (
               <div className="rounded-2xl overflow-hidden border border-navy-100 dark:border-navy-400/20 aspect-video bg-black flex items-center justify-center">
                  <video src={parsedVideo.src} controls className="w-full h-full" />
               </div>
             )}

             {videoUrl && parsedVideo.type === 'INVALID' && (
               <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                 Could not parse this URL. Please use a YouTube (youtube.com/watch?v=... or youtu.be/...) or Loom (loom.com/share/...) link.
               </div>
             )}
           </div>
        )}

        {activeTab === 'RECORD' && (
           <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="rounded-2xl overflow-hidden border-2 border-navy-100 dark:border-navy-400/20 aspect-video bg-black relative flex items-center justify-center">
                
                {/* IDLE or RECORDING -> Show Live Video Feed */}
                {(recordingState === 'IDLE' || recordingState === 'RECORDING') && (
                   <video 
                     ref={liveVideoRef} 
                     autoPlay 
                     muted 
                     playsInline
                     className={`w-full h-full object-cover ${recordingState === 'IDLE' ? 'opacity-80 scale-100' : 'opacity-100 scale-[1.02]'} transition-transform duration-700`}
                   />
                )}

                {/* PREVIEW -> Show Recorded Playback */}
                {recordingState === 'PREVIEW' && previewBlobUrl && (
                   <video 
                     src={previewBlobUrl} 
                     controls 
                     playsInline
                     className="w-full h-full object-cover" 
                   />
                )}

                {/* Overlays & Controls */}
                {recordingState === 'IDLE' && (
                   <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                     <button 
                       onClick={handleStartRecording}
                       className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_0_4px_rgba(255,255,255,0.3)] transition-all transform hover:scale-110"
                     >
                       <div className="w-6 h-6 bg-white rounded-full"></div>
                     </button>
                   </div>
                )}
                
                {recordingState === 'RECORDING' && (
                   <>
                     <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-bold font-mono">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                        REC
                     </div>
                     <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                       <button 
                         onClick={handleStopRecording}
                         className="w-14 h-14 bg-black/50 backdrop-blur-md hover:bg-black/70 rounded-full flex items-center justify-center border-2 border-white/50 transition-all transform hover:scale-110"
                       >
                         <div className="w-5 h-5 bg-red-500 rounded-sm"></div>
                       </button>
                     </div>
                   </>
                )}
             </div>

             {/* Retake Action */}
             {recordingState === 'PREVIEW' && (
                <div className="flex justify-center mt-4">
                  <button onClick={handleRetake} className="text-sm font-bold text-navy-400 hover:text-navy-600 dark:text-cream-400/60 dark:hover:text-cream-200 transition-colors flex items-center gap-2">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
                     Retake Video
                  </button>
                </div>
             )}
           </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="p-6 rounded-2xl bg-cream-50 dark:bg-navy-600/30 border border-navy-100 dark:border-navy-400/20 space-y-3">
        <h3 className="text-sm font-bold text-navy-500 dark:text-cream-300 uppercase tracking-wider">Tips for a great intro video</h3>
        {[
          'Keep it under 2 minutes',
          'Speak clearly, in a quiet environment',
          'Introduce your background and teaching style',
          'Look into the camera and smile!',
          'Good lighting makes a big difference',
        ].map((tip, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-gold-400 flex-shrink-0" />
            <p className="text-sm text-navy-500 dark:text-cream-300/80">{tip}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-navy-100 dark:border-navy-400/20">
        <button onClick={onBack} disabled={isSaving} className="btn-outline px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => handleSave(true)} disabled={isSaving} className="text-sm text-navy-400 hover:text-navy-600 dark:hover:text-cream-200 font-bold transition-colors">
            Skip for now
          </button>
          <button onClick={() => handleSave(false)} disabled={isSaving || recordingState === 'RECORDING'} className="btn-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2">
            {isSaving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving...</> : <>Save and continue <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></>}
          </button>
        </div>
      </div>
    </div>
  );
}
