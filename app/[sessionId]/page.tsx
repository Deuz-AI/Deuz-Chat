'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chat } from '@/components/chat/Chat';
import { supabase } from '@/lib/supabase/client';
import { useChatStore } from '@/lib/store';
import { MessageSquare } from 'lucide-react';
import { CoinComponent } from '@/components/CoinComponent';
import { StockComponent } from '@/components/StockComponent';

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const { setSessions, createSession } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);

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
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [setSessions]);

  const handleCreateNewChat = async () => {
    const newSessionId = await createSession();
    router.push(`/${newSessionId}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-black text-white mb-4">
            <MessageSquare size={22} />
          </div>
          <div className="flex space-x-3 mt-2">
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <Chat sessionId={sessionId} />
    </div>
  );
} 