'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  senderId: string;
  body: string;
  sentAt: string | Date;
  readAt?: string | Date | null;
  recalledAt?: string | Date | null;
  clientStatus?: 'sending' | 'sent' | 'failed';
}

interface ChatWindowProps {
  tutorProfileId?: string;
  conversationId?: string;
  tutorName: string;
  tutorImage?: string | null;
  onClose?: () => void;
}

const DEFAULT_RECALL_WINDOW_MINUTES = 10;

function formatMessageTimestamp(value: string | Date) {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isRecallEligible(message: Message, currentUserId?: string | null, recallWindowMinutes = DEFAULT_RECALL_WINDOW_MINUTES) {
  if (
    !currentUserId ||
    message.senderId !== currentUserId ||
    message.recalledAt ||
    message.clientStatus === 'sending' ||
    message.clientStatus === 'failed'
  ) {
    return false;
  }

  return Date.now() - new Date(message.sentAt).getTime() <= recallWindowMinutes * 60 * 1000;
}

export default function ChatWindow({ tutorProfileId, conversationId, tutorName, tutorImage, onClose }: ChatWindowProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [recallingMessageId, setRecallingMessageId] = useState<string | null>(null);
  const [recallWindowMinutes, setRecallWindowMinutes] = useState(DEFAULT_RECALL_WINDOW_MINUTES);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadMessages() {
      if (!conversationId && !tutorProfileId) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const query = conversationId
          ? `conversationId=${conversationId}`
          : `tutorProfileId=${tutorProfileId}`;
        const res = await fetch(`/api/messages?${query}`, { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Failed to load messages');
        }

        setMessages(json.data || []);
        setRecallWindowMinutes(json.meta?.recallWindowMinutes || DEFAULT_RECALL_WINDOW_MINUTES);
      } catch (error) {
        console.error('Failed to load messages:', error);
        toast.error('Could not load messages.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadMessages();
  }, [conversationId, tutorProfileId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const latestOutgoingSeenMessageId = useMemo(() => {
    const myMessages = messages.filter(
      (message) =>
        message.senderId === session?.user?.id &&
        !message.recalledAt &&
        !message.clientStatus
    );
    const latestSeen = [...myMessages].reverse().find((message) => Boolean(message.readAt));
    return latestSeen?.id || null;
  }, [messages, session?.user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();

    if (!trimmed || !session?.user?.id) {
      return;
    }

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      senderId: session.user.id,
      body: trimmed,
      sentAt: new Date().toISOString(),
      readAt: null,
      recalledAt: null,
      clientStatus: 'sending',
    };

    setMessages((current) => [...current, optimisticMessage]);
    setNewMessage('');
    setSelectedMessageId(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorProfileId,
          content: trimmed,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to send message');
      }

      setRecallWindowMinutes(json.meta?.recallWindowMinutes || DEFAULT_RECALL_WINDOW_MINUTES);
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? { ...json.data, clientStatus: 'sent' }
            : message
        )
      );
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === optimisticId
            ? { ...message, clientStatus: 'failed' }
            : message
        )
      );
      toast.error(error instanceof Error ? error.message : 'Network error');
    }
  };

  const handleRecallMessage = async (messageId: string) => {
    setRecallingMessageId(messageId);

    try {
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to unsend message');
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? { ...message, ...json.data, clientStatus: undefined }
            : message
        )
      );
      setSelectedMessageId(null);
      toast.success('Message unsent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unsend message');
    } finally {
      setRecallingMessageId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-navy-800 rounded-[32px] overflow-hidden shadow-2xl border border-navy-100/50 dark:border-navy-500/20">
      <div className="p-4 bg-navy-50/50 dark:bg-navy-900/50 border-b border-navy-100/50 dark:border-navy-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-100 dark:bg-navy-700 overflow-hidden flex items-center justify-center font-bold text-navy-600 dark:text-gold-400">
            {tutorImage ? <img src={tutorImage} alt={tutorName} className="w-full h-full object-cover" /> : getInitials(tutorName)}
          </div>
          <div>
            <h3 className="text-sm font-black text-navy-600 dark:text-cream-200 uppercase tracking-widest">{tutorName}</h3>
            <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Messages</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white dark:bg-navy-800 flex items-center justify-center text-navy-400 hover:text-navy-600 transition-colors">
            x
          </button>
        )}
      </div>

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
            const isSelected = selectedMessageId === msg.id;
            const recallEligible = isRecallEligible(msg, session?.user?.id, recallWindowMinutes);

            let statusLabel = '';
            if (isMe) {
              if (msg.clientStatus === 'sending') {
                statusLabel = 'Sending...';
              } else if (msg.clientStatus === 'failed') {
                statusLabel = 'Failed';
              } else if (msg.recalledAt) {
                statusLabel = 'Unsent';
              } else if (msg.id === latestOutgoingSeenMessageId) {
                statusLabel = 'Seen';
              } else {
                statusLabel = 'Sent';
              }
            }

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                  <button
                    type="button"
                    onClick={() => setSelectedMessageId((current) => (current === msg.id ? null : msg.id))}
                    className={`text-left max-w-full p-4 rounded-[20px] transition-all ${
                      isMe
                        ? 'bg-navy-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-navy-700 text-navy-600 dark:text-cream-200 border border-navy-100/50 dark:border-navy-500/10 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <p className={`text-sm leading-relaxed ${msg.recalledAt ? 'italic opacity-70' : ''}`}>
                      {msg.body}
                    </p>
                    <div className={`mt-2 flex items-center gap-2 text-[10px] font-bold ${isMe ? 'text-cream-200/70 justify-end' : 'text-navy-300 dark:text-cream-400/60 justify-start'}`}>
                      <span>{formatRelativeTime(msg.sentAt.toString())}</span>
                      {isMe && <span>{statusLabel}</span>}
                    </div>
                  </button>

                  {isSelected && (
                    <div className={`px-1 text-[11px] ${isMe ? 'text-right' : 'text-left'} text-navy-400 dark:text-cream-300/70`}>
                      <p>{formatMessageTimestamp(msg.sentAt)}</p>
                      {isMe && msg.readAt && !msg.recalledAt && (
                        <p className="mt-1">Seen {formatMessageTimestamp(msg.readAt)}</p>
                      )}
                      {isMe && recallEligible && (
                        <button
                          type="button"
                          onClick={() => handleRecallMessage(msg.id)}
                          disabled={recallingMessageId === msg.id}
                          className="mt-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                        >
                          {recallingMessageId === msg.id ? 'Unsending...' : `Unsend (${recallWindowMinutes}m)`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
