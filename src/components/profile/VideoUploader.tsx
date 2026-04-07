'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useSession } from 'next-auth/react';
import VideoPlayer, { parseVideoSource } from '@/components/shared/VideoPlayer';

interface Props {
  value: string;
  onChange: (url: string) => void;
}

type TabType = 'LINK' | 'RECORD';
type RecordingState = 'IDLE' | 'RECORDING' | 'PREVIEW';

export default function VideoUploader({ value, onChange }: Props) {
  const { data: session } = useSession();
  
  const [activeTab, setActiveTab] = useState<TabType>('LINK');
  const [isUploading, setIsUploading] = useState(false);
  const [parsedVideo, setParsedVideo] = useState<{ type: string, src: string }>(parseVideoSource(value));
  
  const [recordingState, setRecordingState] = useState<RecordingState>('IDLE');
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setParsedVideo(parseVideoSource(value));
    if (value && value.includes('supabase.co')) {
      setActiveTab('RECORD');
      setPreviewBlobUrl(value);
      setRecordingState('PREVIEW');
    }
  }, [value]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
    } catch (err: any) {
      toast.error('Could not access camera/microphone.');
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
    const shouldCameraBeOn = activeTab === 'RECORD' && recordingState !== 'PREVIEW';
    if (shouldCameraBeOn) {
      if (!streamRef.current) startCamera();
    } else {
      stopCamera();
    }
  }, [activeTab, recordingState]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleStartRecording = () => {
    if (!streamRef.current) return;
    setRecordingState('RECORDING');
    setRecordedChunks([]);
    const mimeTypes = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'];
    let selectedMimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) { selectedMimeType = type; break; }
    }
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: selectedMimeType });
    mediaRecorderRef.current = mediaRecorder;
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: selectedMimeType || 'video/webm' });
      setVideoBlob(blob);
      setPreviewBlobUrl(URL.createObjectURL(blob));
      setRecordingState('PREVIEW');
    };
    mediaRecorder.start();
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRetake = () => {
    setVideoBlob(null);
    if (previewBlobUrl && !previewBlobUrl.startsWith('http')) URL.revokeObjectURL(previewBlobUrl);
    setPreviewBlobUrl(null);
    setRecordedChunks([]);
    setRecordingState('IDLE');
  };

  const handleUrlChange = (v: string) => {
    onChange(v);
  };

  const handleUploadNative = async () => {
     if (!videoBlob) return;
     setIsUploading(true);
     try {
       const fileExt = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
       const fileName = `${session?.user?.id || 'tutor'}-${Date.now()}.${fileExt}`;
       const filePath = `intros/${fileName}`;

       const { error: uploadError } = await supabase.storage
          .from('tutor-videos')
          .upload(filePath, videoBlob, { contentType: videoBlob.type, upsert: true });

       if (uploadError) throw uploadError;

       const { data: publicUrlData } = supabase.storage.from('tutor-videos').getPublicUrl(filePath);
       onChange(publicUrlData.publicUrl);
       toast.success('Video uploaded successfully!');
     } catch (err: any) {
       toast.error('Upload Error: ' + err.message);
     } finally {
       setIsUploading(false);
     }
  };

  return (
    <div className="space-y-4">
      <div className="flex p-1 bg-cream-50 border border-navy-100 dark:border-navy-400/20 dark:bg-navy-600/30 rounded-xl">
         <button 
           type="button"
           onClick={() => setActiveTab('LINK')}
           className={`flex-1 py-1.5 text-[13px] font-bold rounded-lg transition-all ${activeTab === 'LINK' ? 'bg-white dark:bg-navy-500 text-navy-600 dark:text-cream-200 shadow-sm' : 'text-navy-400 dark:text-cream-400/60 hover:text-navy-500'}`}
         >
           Link YouTube / Loom
         </button>
         <button 
           type="button"
           onClick={() => setActiveTab('RECORD')}
           className={`flex-1 py-1.5 text-[13px] font-bold rounded-lg transition-all ${activeTab === 'RECORD' ? 'bg-white dark:bg-navy-500 text-navy-600 dark:text-cream-200 shadow-sm' : 'text-navy-400 dark:text-cream-400/60 hover:text-navy-500'}`}
         >
           Record Video
         </button>
      </div>

      {activeTab === 'LINK' && (
         <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <input
             type="url"
             className="input-field w-full text-sm py-2 px-3"
             placeholder="https://www.youtube.com/watch?v=..."
             value={value}
             onChange={e => handleUrlChange(e.target.value)}
           />
           {(parsedVideo.type === 'IFRAME' || parsedVideo.type === 'NATIVE') && (
             <div className="rounded-xl overflow-hidden border border-navy-100 dark:border-navy-400/20 aspect-video bg-navy-50">
               <VideoPlayer url={value} />
             </div>
           )}
           {value && parsedVideo.type === 'INVALID' && (
             <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
               Invalid URL. Please enter a valid YouTube or Loom URL.
             </div>
           )}
         </div>
      )}

      {activeTab === 'RECORD' && (
         <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="rounded-xl overflow-hidden border shadow-inner border-navy-100 dark:border-navy-400/20 aspect-video bg-black relative flex items-center justify-center">
              {(recordingState === 'IDLE' || recordingState === 'RECORDING') && (
                 <video 
                   ref={liveVideoRef} autoPlay muted playsInline
                   className={`w-full h-full object-cover ${recordingState === 'IDLE' ? 'opacity-80' : 'opacity-100'} transition-transform duration-700`}
                 />
              )}
              {recordingState === 'PREVIEW' && previewBlobUrl && (
                 <video src={previewBlobUrl} controls playsInline className="w-full h-full object-cover" />
              )}
              
              {recordingState === 'IDLE' && (
                 <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                   <button type="button" onClick={handleStartRecording} className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_0_4px_rgba(255,255,255,0.3)] hover:scale-110 transition-all">
                     <div className="w-5 h-5 bg-white rounded-full"></div>
                   </button>
                 </div>
              )}
              {recordingState === 'RECORDING' && (
                 <>
                   <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-[11px] font-bold tracking-wider">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>REC
                   </div>
                   <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                     <button type="button" onClick={handleStopRecording} className="w-12 h-12 bg-black/50 hover:bg-black/70 border border-white/50 rounded-full flex items-center justify-center hover:scale-110 transition-all">
                       <div className="w-4 h-4 bg-red-500 rounded-[3px]"></div>
                     </button>
                   </div>
                 </>
              )}
           </div>

           {recordingState === 'PREVIEW' && (
              <div className="flex items-center justify-between p-2 bg-cream-50 dark:bg-navy-600/30 rounded-lg border border-navy-100 dark:border-navy-400/20">
                <button type="button" onClick={handleRetake} className="text-xs font-bold text-navy-400 hover:text-navy-600 dark:text-cream-400 dark:hover:text-cream-200 transition-colors flex items-center gap-1">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
                   Retake
                </button>
                {/* Upload Action */}
                {videoBlob && (!value || previewBlobUrl !== value) && (
                    <button type="button" onClick={handleUploadNative} disabled={isUploading} className="btn-primary text-xs py-1.5 px-4 h-auto rounded-md shadow-sm">
                      {isUploading ? 'Uploading...' : 'Confirm Upload'}
                    </button>
                )}
                {value && previewBlobUrl === value && (
                   <div className="text-xs font-bold text-green-600 flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Saved
                   </div>
                )}
              </div>
           )}
         </div>
      )}
    </div>
  );
}
