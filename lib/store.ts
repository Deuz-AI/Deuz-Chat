import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Session, Message, supabase } from './supabase/client';
import { deleteSessionAttachments } from './supabase/storage';

interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  
  // Session actions
  setSessions: (sessions: Session[]) => void;
  createSession: () => Promise<string>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  setCurrentSessionId: (id: string | null) => void;
  
  // Message actions
  addMessage: (
    sessionId: string, 
    content: string, 
    role: 'user' | 'assistant', 
    messageId?: string,
    attachments?: string[]
  ) => Promise<void>;
  updateMessageContent: (sessionId: string, messageId: string, content: string) => Promise<void>;
  updateMessageResponseTime: (sessionId: string, messageId: string, responseTime: number) => Promise<void>;
  getMessages: (sessionId: string) => Promise<void>;
  setIsLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: {},
  isLoading: false,
  
  setSessions: (sessions) => set({ sessions }),
  
  createSession: async () => {
    const newSession = {
      id: uuidv4(),
      title: 'New Chat',
      created_at: new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('sessions')
      .insert(newSession);
      
    if (error) {
      console.error('Error creating session:', error);
      throw error;
    }
    
    set((state) => ({
      sessions: [newSession, ...state.sessions],
      currentSessionId: newSession.id,
      messages: { ...state.messages, [newSession.id]: [] }
    }));
    
    return newSession.id;
  },
  
  deleteSession: async (id) => {
    // First, delete all attachments associated with this session
    try {
      const success = await deleteSessionAttachments(id);
      if (!success) {
        console.warn('Failed to delete some attachments for session:', id);
      }
    } catch (error) {
      console.error('Error deleting session attachments:', error);
    }

    // Delete the session from database
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
    
    set((state) => {
      const newMessages = { ...state.messages };
      delete newMessages[id];
      
      const newSessions = state.sessions.filter((session) => session.id !== id);
      const newCurrentSessionId = 
        state.currentSessionId === id 
          ? (newSessions.length > 0 ? newSessions[0].id : null) 
          : state.currentSessionId;
          
      return {
        sessions: newSessions,
        currentSessionId: newCurrentSessionId,
        messages: newMessages,
      };
    });
  },
  
  renameSession: async (id, title) => {
    const { error } = await supabase
      .from('sessions')
      .update({ title })
      .eq('id', id);
      
    if (error) {
      console.error('Error renaming session:', error);
      throw error;
    }
    
    set((state) => ({
      sessions: state.sessions.map((session) => 
        session.id === id ? { ...session, title } : session
      ),
    }));
  },
  
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  
  addMessage: async (sessionId, content, role, messageId, attachments) => {
    try {
      console.log('[STORE] addMessage çağrıldı:', { sessionId, role, attachments });
      
      // Eğer attachments varsa loglama yap
      if (attachments && attachments.length > 0) {
        console.log('[STORE] Resim URL\'leri:', attachments);
      }
      
      // Yeni mesajı oluştur
      const newMessage: Message = {
        id: messageId || uuidv4(),
        session_id: sessionId,
        role,
        content,
        created_at: new Date().toISOString(),
        attachments: attachments || []
      };
      
      // Veritabanına gönderilecek obje
      const dbMessage = {
        id: newMessage.id,
        session_id: sessionId,
        role,
        content,
        created_at: new Date().toISOString(),
        attachments: attachments || [],
        image_url: attachments && attachments.length > 0 ? attachments[0] : null
      };
      
      console.log('[STORE] Veritabanına kaydedilecek mesaj:', dbMessage);
      
      const { error, data } = await supabase
        .from('messages')
        .insert(dbMessage)
        .select();
        
      if (error) {
        console.error('[STORE] Error adding message:', error);
        throw error;
      }
      
      console.log('[STORE] Message added successfully:', data);
      
      set((state) => {
        const sessionMessages = state.messages[sessionId] || [];
        const updatedMessages = [...sessionMessages, newMessage];
        
        const result = {
          messages: {
            ...state.messages,
            [sessionId]: updatedMessages, // Use newMessage with attachments for UI
          },
        };
        
        return result;
      });
    } catch (error) {
      console.error('Exception adding message:', error, JSON.stringify(error));
      throw error;
    }
  },
  
  updateMessageContent: async (sessionId, messageId, content) => {
    // First update UI state immediately for responsiveness
    set((state) => {
      const sessionMessages = state.messages[sessionId] || [];
      const updatedMessages = sessionMessages.map(msg => 
        msg.id === messageId ? { ...msg, content } : msg
      );
      
      return {
        messages: {
          ...state.messages,
          [sessionId]: updatedMessages,
        },
      };
    });
    
    // Then update database
    const { error } = await supabase
      .from('messages')
      .update({ content })
      .match({ id: messageId, session_id: sessionId });
      
    if (error) {
      console.error('Error updating message:', error);
    }
  },
  
  updateMessageResponseTime: async (sessionId, messageId, responseTime) => {
    console.log(`Updating response time for message ${messageId} to ${responseTime.toFixed(2)}s`);
    
    // First update UI state immediately for responsiveness
    set((state) => {
      const sessionMessages = state.messages[sessionId] || [];
      const updatedMessages = sessionMessages.map(msg => 
        msg.id === messageId ? { ...msg, response_time: responseTime } : msg
      );
      
      return {
        messages: {
          ...state.messages,
          [sessionId]: updatedMessages,
        },
      };
    });
    
    // Log the updated state to verify
    const updatedMsg = get().messages[sessionId]?.find(m => m.id === messageId);
    console.log(`After state update, message ${messageId} response_time:`, updatedMsg?.response_time);
    
    // Backend update is handled by separate direct call in Chat.tsx
  },
  
  getMessages: async (sessionId) => {
    // Get current state before database fetch
    const currentState = get();
    const currentMessages = currentState.messages[sessionId] || [];
    
    console.log('[STORE] Fetching messages for session:', sessionId);
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('[STORE] Error fetching messages:', error);
      throw error;
    }
    
    console.log('[STORE] Raw messages from database:', data);
    
    // Mesajları işle ve attachments'ları düzgün bir şekilde ekle
    const messagesWithAttachments = (data || []).map(dbMsg => {
      // Mevcut attachments alanını kontrol et
      let attachments = [];
      
      // Veritabanından gelen attachments varsa ve bir dizi ise kullan
      if (dbMsg.attachments && Array.isArray(dbMsg.attachments)) {
        attachments = dbMsg.attachments;
        console.log(`[STORE] Message ${dbMsg.id} has attachments in DB:`, attachments);
      }
      // Veritabanında attachments yoksa ama image_url varsa, onu ekle
      else if (dbMsg.image_url) {
        attachments = [dbMsg.image_url];
        console.log(`[STORE] Message ${dbMsg.id} has image_url:`, dbMsg.image_url);
      }
      // Current state'te attachments varsa, onları koru
      else {
        const existingMsg = currentMessages.find(msg => msg.id === dbMsg.id);
        if (existingMsg?.attachments && existingMsg.attachments.length > 0) {
          attachments = existingMsg.attachments;
          console.log(`[STORE] Message ${dbMsg.id} using attachments from current state:`, attachments);
        }
      }
      
      const mergedMessage = {
        ...dbMsg,
        attachments: attachments
      };
      
      console.log(`[STORE] Processed message ${dbMsg.id}:`, {
        content: mergedMessage.content.substring(0, 30) + '...',
        attachments: mergedMessage.attachments
      });
      
      return mergedMessage;
    });
    
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: messagesWithAttachments,
      },
    }));
    
    console.log('[STORE] Updated messages state with attachments.');
  },
  
  setIsLoading: (loading) => set({ isLoading: loading }),
}));