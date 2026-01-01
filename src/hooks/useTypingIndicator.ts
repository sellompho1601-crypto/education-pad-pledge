import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface TypingState {
  [key: string]: {
    userId: string;
    userName: string;
    isTyping: boolean;
    timestamp: number;
  };
}

export const useTypingIndicator = (
  conversationId: string | null,
  currentUserId: string,
  currentUserName: string
) => {
  const [typingUsers, setTypingUsers] = useState<TypingState>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Clean up stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (now - updated[key].timestamp > 3000) {
            delete updated[key];
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Set up presence channel for typing indicators
  useEffect(() => {
    if (!conversationId || !currentUserId) {
      return;
    }

    const channelName = `typing:${conversationId}`;
    
    channelRef.current = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserId
        }
      }
    });

    channelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current?.presenceState() || {};
        const newTypingUsers: TypingState = {};
        
        Object.entries(state).forEach(([key, presences]) => {
          if (key !== currentUserId && Array.isArray(presences) && presences.length > 0) {
            const presence = presences[0] as any;
            if (presence.isTyping) {
              newTypingUsers[key] = {
                userId: key,
                userName: presence.userName || 'Someone',
                isTyping: true,
                timestamp: Date.now()
              };
            }
          }
        });
        
        setTypingUsers(newTypingUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== currentUserId && newPresences.length > 0) {
          const presence = newPresences[0] as any;
          if (presence.isTyping) {
            setTypingUsers(prev => ({
              ...prev,
              [key]: {
                userId: key,
                userName: presence.userName || 'Someone',
                isTyping: true,
                timestamp: Date.now()
              }
            }));
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setTypingUsers(prev => {
          const updated = { ...prev };
          delete updated[key];
          return updated;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channelRef.current?.track({
            userName: currentUserName,
            isTyping: false,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, currentUserId, currentUserName]);

  const startTyping = useCallback(async () => {
    if (!channelRef.current || isTypingRef.current) return;
    
    isTypingRef.current = true;
    
    await channelRef.current.track({
      userName: currentUserName,
      isTyping: true,
      online_at: new Date().toISOString()
    });

    // Auto-stop typing after 3 seconds of no activity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [currentUserName]);

  const stopTyping = useCallback(async () => {
    if (!channelRef.current || !isTypingRef.current) return;
    
    isTypingRef.current = false;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    await channelRef.current.track({
      userName: currentUserName,
      isTyping: false,
      online_at: new Date().toISOString()
    });
  }, [currentUserName]);

  const handleTyping = useCallback(() => {
    startTyping();
  }, [startTyping]);

  // Get list of other users who are typing
  const othersTyping = Object.values(typingUsers).filter(
    u => u.userId !== currentUserId && u.isTyping
  );

  return {
    typingUsers: othersTyping,
    handleTyping,
    stopTyping,
    isAnyoneTyping: othersTyping.length > 0
  };
};
