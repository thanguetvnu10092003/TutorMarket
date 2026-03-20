'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { formatRelativeTime, getInitials } from '@/lib/utils';

interface Conversation {
  id: string;
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
    body: string;
    recalledAt?: string | Date | null;
  }[];
}

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string;
}

export default function ConversationList({ onSelectConversation, selectedId }: ConversationListProps) {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await fetch('/api/conversations');
        const json = await res.json();
        setConversations(json.data || []);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadConversations();

    const intervalId = window.setInterval(() => {
      void loadConversations();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

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

          return (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className={`w-full p-5 text-left transition-all hover:bg-navy-50/50 dark:hover:bg-navy-900/30 flex items-center gap-4 ${
                selectedId === conv.id ? 'bg-gold-50/50 dark:bg-navy-700/50 border-l-4 border-gold-400' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-gold-100 dark:bg-navy-600 overflow-hidden flex items-center justify-center font-bold text-navy-600 dark:text-gold-400 flex-shrink-0">
                {participant.avatarUrl ? (
                  <img src={participant.avatarUrl} alt={participant.name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(participant.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-sm font-bold text-navy-600 dark:text-cream-200 truncate">{participant.name}</h4>
                  <span className="text-[10px] text-navy-300 dark:text-cream-400/40 font-bold uppercase tracking-widest">
                    {formatRelativeTime(conv.lastMessageAt.toString())}
                  </span>
                </div>
                <p className="text-xs text-navy-400 dark:text-cream-400/60 truncate">
                  {conv.messages?.[0]?.recalledAt ? 'Message unsent' : (conv.messages?.[0]?.body || 'Start the conversation...')}
                </p>
              </div>
            </button>
          );
        })()
      ))}
    </div>
  );
}
