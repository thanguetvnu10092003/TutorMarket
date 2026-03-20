'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  senderId: string;
  body: string;
  sentAt: string | Date;
}

interface ChatWindowProps {
  tutorProfileId?: string;
  conversationId?: string;
  tutorName: string;
  tutorImage?: string | null;
  onClose?: () => void;
}

export default function ChatWindow({ tutorProfileId, conversationId, tutorName, tutorImage, onClose }: ChatWindowProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadMessages() {
      try {
        const query = conversationId 
          ? `conversationId=${conversationId}` 
          : `tutorProfileId=${tutorProfileId}`;
        const res = await fetch(`/api/messages?${query}`);
        const json = await res.json();
        setMessages(json.data || []);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadMessages();
  }, [tutorProfileId, conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const optimisticMsg = {
        id: 'temp-' + Date.now(),
        senderId: 'current-user', // Just for UI logic
        body: newMessage.trim(),
        sentAt: new Date(),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    try {
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tutorProfileId, // Or derive from conversation
                content: optimisticMsg.body 
            }),
        });
        
        if (!res.ok) {
            toast.error('Failed to send message');
            // Roll back or show error
        }
    } catch (error) {
        toast.error('Network error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-navy-800 rounded-[32px] overflow-hidden shadow-2xl border border-navy-100/50 dark:border-navy-500/20">
      {/* Header */}
      <div className="p-4 bg-navy-50/50 dark:bg-navy-900/50 border-b border-navy-100/50 dark:border-navy-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-100 dark:bg-navy-700 overflow-hidden flex items-center justify-center font-bold text-navy-600 dark:text-gold-400">
                {tutorImage ? <img src={tutorImage} alt={tutorName} className="w-full h-full object-cover" /> : getInitials(tutorName)}
            </div>
            <div>
                <h3 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">{tutorName}</h3>
                <p className="text-[10px] text-green-500 font-black animate-pulse uppercase tracking-widest">Online</p>
            </div>
        </div>
        {onClose && (
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white dark:bg-navy-800 flex items-center justify-center text-navy-400 hover:text-navy-600 transition-colors">✕</button>
        )}
      </div>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-cream-50/30 dark:bg-navy-800/20"
      >
        {isLoading ? (
            <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            </div>
        ) : messages.length === 0 ? (
            <div className="text-center py-10 opacity-30">
                <p className="text-xs font-bold uppercase tracking-widest">No messages yet. Say hi!</p>
            </div>
        ) : (
            messages.map((msg) => {
                const isMe = msg.senderId === session?.user?.id;
                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-4 rounded-[20px] ${
                            isMe 
                                ? 'bg-navy-600 text-white rounded-tr-none' 
                                : 'bg-white dark:bg-navy-700 text-navy-600 dark:text-cream-200 border border-navy-100/50 dark:border-navy-500/10 rounded-tl-none shadow-sm'
                        }`}>
                            <p className="text-sm leading-relaxed">{msg.body}</p>
                            <p className={`text-[9px] mt-2 font-black uppercase tracking-widest opacity-40 ${isMe ? 'text-cream-200' : 'text-navy-300'}`}>
                                {formatRelativeTime(msg.sentAt.toString())}
                            </p>
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-navy-900/50 border-t border-navy-100/50 dark:border-navy-500/20">
        <div className="relative flex items-center gap-2">
            <input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-navy-50/50 dark:bg-navy-800 border-2 border-navy-100 dark:border-navy-700 rounded-2xl py-3 px-5 text-sm focus:border-gold-400 outline-none transition-all pr-12"
            />
            <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="absolute right-2 w-10 h-10 bg-gold-400 text-navy-600 rounded-xl flex items-center justify-center hover:bg-gold-500 transition-colors disabled:opacity-50"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
        </div>
      </form>
    </div>
  );
}
