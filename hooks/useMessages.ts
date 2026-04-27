import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/app/_layout';

export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

export type UseMessagesResult = {
  messages: Message[];
  loading: boolean;
  error: string | null;
  loadMessages: (matchId: string) => Promise<Message[]>;
  sendMessage: (matchId: string, content: string) => Promise<void>;
  subscribeToMessages: (matchId: string) => void;
};

export function useMessages(): UseMessagesResult {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const cleanupSubscription = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  }, []);

  const loadMessages = useCallback(
    async (matchId: string): Promise<Message[]> => {
      setLoading(true);
      setError(null);

      if (!userId) {
        const message = 'Unable to load messages: user not authenticated.';
        setError(message);
        setLoading(false);
        return [];
      }

      const { data, error: err } = await supabase
        .from('messages')
        .select('id, match_id, sender_id, content, created_at, read_at')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (err) {
        setError(err.message);
        setLoading(false);
        return [];
      }

      const rows = (data ?? []) as Message[];
      setMessages(rows);
      setLoading(false);
      return rows;
    },
    [userId]
  );

  const sendMessage = useCallback(
    async (matchId: string, content: string): Promise<void> => {
      setError(null);

      if (!userId) {
        setError('Unable to send message: user not authenticated.');
        return;
      }

      const trimmed = content.trim();
      if (trimmed.length === 0) {
        setError('Message cannot be empty.');
        return;
      }

      const { data: inserted, error: err } = await supabase
        .from('messages')
        .insert({ match_id: matchId, sender_id: userId, content: trimmed })
        .select('id, match_id, sender_id, content, created_at, read_at')
        .single();

      if (err) {
        setError(err.message);
        throw err;
      }

      if (inserted) {
        setMessages((prev) => {
          const alreadyPresent = prev.some((m) => m.id === inserted.id);
          if (alreadyPresent) return prev;
          return [...prev, inserted as Message].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      }
    },
    [userId]
  );

  const subscribeToMessages = useCallback(
    (matchId: string) => {
      cleanupSubscription();
      setError(null);

      if (!userId) {
        setError('Unable to subscribe: user not authenticated.');
        return;
      }

      const channel = supabase
        .channel(`messages:match:${matchId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            const newMessage = payload.new as Message | null;
            const oldMessage = payload.old as Message | null;

            if (!newMessage) return;

            setMessages((prev) => {
              if (payload.eventType === 'INSERT') {
                return [...prev, newMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              }

              if (payload.eventType === 'UPDATE' && oldMessage) {
                return prev.map((message) => (message.id === newMessage.id ? newMessage : message));
              }

              return prev;
            });
          }
        )
        .subscribe();

      subscriptionRef.current = channel;
    },
    [cleanupSubscription, userId]
  );

  useEffect(() => cleanupSubscription, [cleanupSubscription]);

  return {
    messages,
    loading,
    error,
    loadMessages,
    sendMessage,
    subscribeToMessages,
  };
}
