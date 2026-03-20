'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { formatRelativeTime, getInitials } from '@/lib/utils';

interface Conversation {
  id: string;
  unreadCount?: number;
  participant?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  student: {
    name: string;
    avatarUrl: string | null;
  };
  tutorProfile: {
    id: string;
    user: {
      name: string;
      avatarUrl: string | null;
    };
  };
  lastMessageAt: string | Date;
  messages: {
    id?: string;
    body: string;
    senderId?: string;
    sentAt?: string | Date;
    recalledAt?: string | Date | null;
  }[];
}

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string;
  onStatsChange?: (stats: { unreadCount: number; conversations: Conversation[] }) => void;
}

export default function ConversationList({ onSelectConversation, selectedId, onStatsChange }: ConversationListProps) {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    setConversations((current) => {
      let changed = false;
      const next = current.map((conversation) => {
        if (conversation.id === selectedId && (conversation.unreadCount || 0) > 0) {
          changed = true;
          return {
            ...conversation,
            unreadCount: 0,
          };
        }

        return conversation;
      });

      if (changed) {
        onStatsChange?.({
          unreadCount: next.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0),
          conversations: next,
        });
      }

      return next;
    });
  }, [onStatsChange, selectedId]);

  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await fetch('/api/conversations', { cache: 'no-store' });
        const json = await res.json();
        const nextConversations = json.data || [];
        setConversations(nextConversations);
        onStatsChange?.({
          unreadCount: json.unreadCount || 0,
          conversations: nextConversations,
        });
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadConversations();

    const intervalId = window.setInterval(() => {
      void loadConversations();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [onStatsChange, selectedId]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-navy-50/50 dark:bg-navy-900/50 animate-pulse rounded-[20px]" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
        <div className="p-10 text-center opacity-30">
            <p className="text-xs font-black uppercase tracking-widest">No conversations yet</p>
        </div>
    );
  }

  return (
    <div className="divide-y divide-navy-100/50 dark:divide-navy-500/10">
      {conversations.map((conv) => (
        (() => {
          const participant = conv.participant || (
            session?.user?.role === 'TUTOR'
              ? { id: conv.id, name: conv.student.name, avatarUrl: conv.student.avatarUrl }
              : { id: conv.tutorProfile.id, name: conv.tutorProfile.user.name, avatarUrl: conv.tutorProfile.user.avatarUrl }
          );
          const unreadCount = conv.unreadCount || 0;
          const hasUnread = unreadCount > 0;
          const latestMessage = conv.messages?.[0];
          const isLastMessageMine = latestMessage?.senderId === session?.user?.id;
          const preview = latestMessage?.recalledAt
            ? 'Message unsent'
            : latestMessage?.body || 'Start the conversation...';

          return (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className={`w-full p-5 text-left transition-all hover:bg-navy-50/50 dark:hover:bg-navy-900/30 flex items-center gap-4 ${
                selectedId === conv.id
                  ? 'bg-gold-50/50 dark:bg-navy-700/50 border-l-4 border-gold-400'
                  : hasUnread
                    ? 'bg-blue-50/60 dark:bg-navy-700/40'
                    : ''
              }`}
            >
              <div className="relative w-12 h-12 rounded-xl bg-gold-100 dark:bg-navy-600 overflow-hidden flex items-center justify-center font-bold text-navy-600 dark:text-gold-400 flex-shrink-0">
                {participant.avatarUrl ? (
                  <img src={participant.avatarUrl} alt={participant.name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(participant.name)
                )}
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-blue-500 text-white text-[10px] font-black flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <div className="min-w-0 flex items-center gap-2">
                    <h4 className={`text-sm truncate ${hasUnread ? 'font-black text-navy-700 dark:text-white' : 'font-bold text-navy-600 dark:text-cream-200'}`}>
                      {participant.name}
                    </h4>
                    {hasUnread && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${hasUnread ? 'text-blue-600 dark:text-blue-300' : 'text-navy-300 dark:text-cream-400/40'}`}>
                    {formatRelativeTime(conv.lastMessageAt.toString())}
                  </span>
                </div>
                <p className={`text-xs truncate ${hasUnread ? 'font-bold text-navy-600 dark:text-cream-200' : 'text-navy-400 dark:text-cream-400/60'}`}>
                  {isLastMessageMine ? 'You: ' : ''}
                  {preview}
                </p>
              </div>
            </button>
          );
        })()
      ))}
    </div>
  );
}
