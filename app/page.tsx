'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useChatStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { setSessions, createSession } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sessions on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          setSessions(data);
        }
        
        // Find sessions with messages
        const { data: messagesData } = await supabase
          .from('messages')
          .select('session_id')
          .not('content', 'is', null);
        
        // Get unique session IDs that have messages
        const sessionIdsWithMessages = messagesData ? 
          [...new Set(messagesData.map(msg => msg.session_id))] : 
          [];
        
        // Check if there are any sessions with messages
        const sessionsWithMessages = data?.filter(session => 
          sessionIdsWithMessages.includes(session.id)
        ) || [];
        
        if (sessionsWithMessages.length > 0) {
          // If there are sessions with messages, redirect to the most recent one
          router.push(`/${sessionsWithMessages[0].id}`);
        } else {
          // Only create a new session if there are no existing sessions with messages
          const newSessionId = await createSession();
          router.push(`/${newSessionId}`);
        }
      } catch (error) {
        console.error('Error in Home page:', error instanceof Error ? error.message : JSON.stringify(error));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [router, setSessions, createSession]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  return null;
}
