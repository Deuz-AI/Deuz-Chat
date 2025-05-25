import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/lib/store';
import { Message, supabase } from '@/lib/supabase/client';
import { PanelLeftClose, PanelLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

type ChatProps = {
  sessionId: string | null;
};

// Example queries for the buttons
const EXAMPLE_QUERIES = [
  {
    title: "What is the weather",
    subtitle: "in San Francisco?"
  },
  {
    title: "Show me earthquake data",
    subtitle: "for the last 24 hours"
  },
  {
    title: "Convert currency",
    subtitle: "100 USD to EUR"
  },
  {
    title: "Bitcoin price",
    subtitle: "and market information"
  },
  {
    title: "Show me stock data",
    subtitle: "for Tesla (TSLA)"
  }
];

export function Chat({ sessionId }: ChatProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { 
    messages,
    addMessage,
    getMessages,
    createSession,
    setCurrentSessionId,
    isLoading,
    setIsLoading,
    updateMessageContent,
    updateMessageResponseTime,
    renameSession
  } = useChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showExamples, setShowExamples] = useState(true);
  const fetchedSessions = useRef<Set<string>>(new Set()); // Track fetched sessions

  useEffect(() => {
    const initializeChat = async () => {
      if (!sessionId) {
        // If no sessionId is provided, create a new session and redirect
        const newSessionId = await createSession();
        router.push(`/${newSessionId}`);
        return;
      }
      
      // Set current session ID and fetch messages only once per session
      setCurrentSessionId(sessionId);
      
      // Only fetch messages if we haven't fetched them before
      if (!fetchedSessions.current.has(sessionId)) {
        await getMessages(sessionId);
        fetchedSessions.current.add(sessionId);
      }
    };
    
    initializeChat();
  }, [sessionId, createSession, setCurrentSessionId, getMessages, router]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Hide examples when there are messages
    if (messages[sessionId || '']?.length > 0) {
      setShowExamples(false);
    } else {
      setShowExamples(true);
    }
  }, [messages, sessionId]);

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!sessionId) return;
    
    // Check if this is the first message in the chat
    const isFirstMessage = !messages[sessionId] || messages[sessionId].length === 0;
    
    // Resim URL'lerini saklamak için dizi
    let attachmentUrls: string[] = [];
    
    // Resim var mı kontrol et
    if (attachments && attachments.length > 0) {
      setIsLoading(true);
      console.log('[CHAT] Uploading', attachments.length, 'images');
      
      try {
        // Supabase yükleme fonksiyonunu import et
        const { uploadImage } = await import('@/lib/supabase/storage');
        
        // Her dosyayı tek tek yükle
        for (const file of attachments) {
          console.log('[CHAT] Processing file:', file.name, 'type:', file.type, 'size:', file.size);
          
          // Dosyayı Supabase'e yükle
          const result = await uploadImage(file, sessionId);
          
          if (result.success && result.url) {
            console.log('[CHAT] Upload successful! Path:', result.path);
            console.log('[CHAT] Generated URL:', result.url);
            
            // URL'i listeye ekle - hiçbir kontrol yapmadan direk storage'dan gelen URL'i kullan
            attachmentUrls.push(result.url);
          } else {
            console.error('[CHAT] Upload failed:', result.error);
          }
        }
        
        console.log('[CHAT] All attachments uploaded successfully:', attachmentUrls);
      } catch (error) {
        console.error('[CHAT] Error in attachment upload process:', error);
      }
      
      setIsLoading(false);
    }
    
    // Add user message to UI with attachments
    const userMessageId = uuidv4();
    await addMessage(sessionId, content, 'user', userMessageId, attachmentUrls);
    
    // Force re-render by updating message list
    if (attachmentUrls.length > 0) {
      // Trigger a re-render to ensure attachments are visible
      setTimeout(() => {
        const currentMessages = messages[sessionId] || [];
        const targetMessage = currentMessages.find(m => m.id === userMessageId);
      }, 100);
    }
    
    // Verify the message was added with attachments
    const currentMessages = messages[sessionId] || [];
    const lastMessage = currentMessages[currentMessages.length - 1];
    
    // If this is the first message, update the chat title
    if (isFirstMessage) {
      // Use the first few words of the message as the title (max 25 chars)
      let title = content.trim().split(/\s+/).slice(0, 5).join(' ');
      if (title.length > 25) {
        title = title.substring(0, 22) + '...';
      }
      
      try {
        await renameSession(sessionId, title);
      } catch (e) {
        console.error('Failed to rename session:', e);
      }
    }
    
    // Set loading state
    setIsLoading(true);
    
    // Start timing the response
    const startTime = performance.now();
    let responseTime = 0;
    
    try {
      // Create assistant message placeholder
      const assistantMessageId = uuidv4();
      await addMessage(sessionId, '', 'assistant', assistantMessageId);
      
      let response;
      
      // Prepare request based on whether we have attachments
      if (attachments && attachments.length > 0) {
        // Use FormData for requests with attachments
        const formData = new FormData();
        
        // Add current messages including the new user message
        const currentMessages = [
          ...(messages[sessionId] || []).map((msg: Message) => ({
            role: msg.role,
            content: msg.content
          })),
          { 
            role: 'user', 
            content
          }
        ];
        
        formData.append('messages', JSON.stringify(currentMessages));
        formData.append('sessionId', sessionId);
        
        // Add attachment URLs for AI processing
        if (attachmentUrls.length > 0) {
          formData.append('attachmentUrls', JSON.stringify(attachmentUrls));
        }
        
        // Don't send actual files, only URLs (files already uploaded)
        
        response = await fetch('/api/chat', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Use JSON for text-only requests
        const requestBody = {
          messages: [
            ...(messages[sessionId] || []).map((msg: Message) => ({
              role: msg.role,
              content: msg.content
            })),
            { 
              role: 'user', 
              content
            }
          ],
          sessionId
        };
        
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error('No response body received');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          
          // Update message with accumulated text
          await updateMessageContent(sessionId, assistantMessageId, fullText);
        }
        
        // Calculate and update response time
        responseTime = (performance.now() - startTime) / 1000;
        
        // Update response time in database
        try {
          const { error: timeUpdateError } = await supabase
            .from('messages')
            .update({ response_time: responseTime })
            .match({ id: assistantMessageId, session_id: sessionId });
          
          if (timeUpdateError) {
            console.error('Error updating response time:', timeUpdateError);
          } else {
            console.log(`Response time ${responseTime.toFixed(2)}s saved to database for message ${assistantMessageId}`);
            // Also update in UI
            await updateMessageResponseTime(sessionId, assistantMessageId, responseTime);
          }
        } catch (timeError) {
          console.error('Error updating response time:', timeError);
        }
        
      } catch (streamError) {
        console.error('Error reading stream:', streamError);
        throw streamError;
      } finally {
        reader.releaseLock();
      }
      
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      
      // Add error message if one doesn't already exist
      const currentSessionMessages = messages[sessionId] || [];
      const hasErrorMessage = currentSessionMessages.some(msg => 
        msg.role === 'assistant' && msg.content.includes('Sorry, there was an error')
      );
      
      if (!hasErrorMessage) {
        await addMessage(
          sessionId,
          'Sorry, there was an error processing your request. Please try again.',
          'assistant'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: typeof EXAMPLE_QUERIES[0]) => {
    handleSendMessage(`${example.title} ${example.subtitle}`);
    setShowExamples(false);
  };

  // If no sessionId yet, show a loading state
  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-gray-200 mb-3"></div>
          <div className="h-4 w-24 bg-gray-200 rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden relative bg-white">
      {/* Blurlu mavi yuvarlak - daha büyük boyut */}
      <div className="absolute top-0 right-0 w-[1000px] h-[1000px] rounded-full bg-blue-600/60 blur-3xl -mr-[500px] -mt-[500px] pointer-events-none z-0"></div>
      {/* Sidebar with proper toggle behavior */}
      {sidebarOpen && (
        <div className="h-full w-72 min-w-[250px] border-r border-gray-100 shadow-sm transition-all duration-300 z-30 absolute md:relative">
          <Sidebar sessionId={sessionId} />
        </div>
      )}
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center px-5 py-4 sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-3 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </Button>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 z-10 relative scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 dark:hover:scrollbar-thumb-gray-500 scrollbar-track-transparent">
          
          {messages[sessionId]?.map((message: Message, index: number) => (
            <ChatMessage 
              key={message.id} 
              message={message} 
              isLoading={isLoading && index === messages[sessionId].length - 1 && message.role === 'assistant'}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* EXAMPLE QUERIES MOVED HERE */}
        {showExamples && messages[sessionId]?.length === 0 && (
            <div className="px-4 py-2 md:px-8 relative z-10">
              <div className="flex flex-col items-center justify-center max-w-3xl mx-auto">
                <p className="text-center mb-4 text-gray-600 text-base leading-relaxed">
                  A multi-agent system with <span className="font-medium text-black">weather</span>, 
                  <span className="font-medium text-black"> earthquake</span>, and 
                  <span className="font-medium text-black"> currency</span> data capabilities
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  {EXAMPLE_QUERIES.map((example, index) => (
                    <button
                      key={index}
                      className="text-left p-3 bg-background border border-gray-200 rounded-lg hover:border-black hover:shadow-sm transition-all duration-200"
                      onClick={() => handleExampleClick(example)}
                    >
                      <p className="font-medium text-black text-sm mb-1">{example.title}</p>
                      <p className="text-gray-500 text-xs">{example.subtitle}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        {/* Input Area */}
        <div className="sticky bottom-0 z-10 w-full p-4 md:p-5 border-t border-gray-100">
          <ChatInput 
            sessionId={sessionId} 
            onSend={handleSendMessage} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </div>
  );
}