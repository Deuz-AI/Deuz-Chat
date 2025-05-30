"use client";

import { useState, useCallback, useRef } from 'react';
import { ResearchUpdate } from '@/components/deep-search/research-progress-card';

export interface DeepSearchState {
  isActive: boolean;
  progress: number;
  status: 'planning' | 'searching' | 'analyzing' | 'complete';
  updates: ResearchUpdate[];
  result: string | null;
  error: string | null;
  researchPlan: any | null;
  finalSources: Array<{ title: string; url: string; relevance?: number }> | null;
  planLinks: any | null;
}

export interface DeepSearchOptions {
  depth?: 'basic' | 'advanced';
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: DeepSearchState['status']) => void;
  onUpdate?: (update: ResearchUpdate) => void;
  onComplete?: (result: string) => void;
  onError?: (error: string) => void;
}

export const useDeepSearch = () => {
  const [state, setState] = useState<DeepSearchState>({
    isActive: false,
    progress: 0,
    status: 'planning',
    updates: [],
    result: null,
    error: null,
    researchPlan: null,
    finalSources: null,
    planLinks: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const addUpdate = useCallback((update: Omit<ResearchUpdate, 'id' | 'timestamp'>) => {
    const newUpdate: ResearchUpdate = {
      ...update,
      id: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      updates: [...prev.updates, newUpdate]
    }));

    return newUpdate;
  }, []);

  const updateExistingUpdate = useCallback((updateId: string, changes: Partial<ResearchUpdate>) => {
    setState(prev => ({
      ...prev,
      updates: prev.updates.map(u => 
        u.id === updateId ? { ...u, ...changes } : u
      )
    }));
  }, []);

  const updateProgress = useCallback((progress: number, status?: DeepSearchState['status']) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      ...(status && { status })
    }));
  }, []);

  const startDeepSearch = useCallback(async (
    topic: string, 
    sessionId: string, 
    options: DeepSearchOptions = {}
  ) => {
    const { 
      depth = 'basic', 
      onProgress, 
      onStatusChange, 
      onUpdate, 
      onComplete, 
      onError 
    } = options;

    // Reset state
    setState({
      isActive: true,
      progress: 0,
      status: 'planning',
      updates: [],
      result: null,
      error: null,
      researchPlan: null,
      finalSources: null,
      planLinks: null
    });

    try {
      // Close any existing EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Start deep search with fetch to get SSE stream
      const response = await fetch('/api/deep-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          sessionId,
          depth
        })
      });

      if (!response.ok) {
        throw new Error(`Deep search failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Read the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              await handleServerEvent(eventData, {
                onProgress,
                onStatusChange,
                onUpdate,
                onComplete,
                onError
              });
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isActive: false,
        status: 'complete'
      }));

      onError?.(errorMessage);
    }
  }, [addUpdate, updateProgress, updateExistingUpdate]);

  const handleServerEvent = useCallback(async (eventData: any, callbacks: any) => {
    console.log('[DEEP SEARCH HOOK] Received event:', eventData);

    switch (eventData.type) {
      case 'step_start':
        const startUpdate = addUpdate({
          step: eventData.data.step,
          title: eventData.data.title,
          description: eventData.data.description,
          status: 'running'
        });
        callbacks.onUpdate?.(startUpdate);
        
        // Update status based on step
        if (eventData.data.step === 1) {
          setState(prev => ({ ...prev, status: 'planning' }));
          callbacks.onStatusChange?.('planning');
        } else if (eventData.data.step <= 6) {
          setState(prev => ({ ...prev, status: 'searching' }));
          callbacks.onStatusChange?.('searching');
        } else {
          setState(prev => ({ ...prev, status: 'analyzing' }));
          callbacks.onStatusChange?.('analyzing');
        }
        break;

      case 'step_complete':
        setState(prev => ({
          ...prev,
          updates: prev.updates.map(u => 
            u.step === eventData.data.step 
              ? { 
                  ...u, 
                  status: 'completed' as const,
                  description: eventData.data.description,
                  data: eventData.data.data
                }
              : u
          )
        }));
        break;

      case 'research_plan':
        setState(prev => ({
          ...prev,
          researchPlan: eventData.data.plan
        }));
        console.log('[DEEP SEARCH] Research plan received:', eventData.data.plan);
        break;

      case 'progress':
        updateProgress(eventData.data.progress);
        callbacks.onProgress?.(eventData.data.progress);
        break;

      case 'status_change':
        setState(prev => ({ ...prev, status: eventData.data.status }));
        callbacks.onStatusChange?.(eventData.data.status);
        break;

      case 'report_chunk':
        setState(prev => ({
          ...prev,
          result: (prev.result || '') + eventData.data.chunk
        }));
        break;

      case 'report_complete':
        setState(prev => ({
          ...prev,
          result: eventData.data.fullReport,
          finalSources: eventData.data.sources || null,
          isActive: false,
          progress: 100,
          status: 'complete'
        }));
        callbacks.onComplete?.(eventData.data.fullReport);
        break;

      case 'error':
        setState(prev => ({
          ...prev,
          error: eventData.data.message,
          isActive: false,
          status: 'complete'
        }));
        callbacks.onError?.(eventData.data.message);
        break;

      default:
        console.log('[DEEP SEARCH] Unknown event type:', eventData.type);
    }
  }, [addUpdate, updateProgress]);

  const stopDeepSearch = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isActive: false
    }));
  }, []);

  const resetDeepSearch = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState({
      isActive: false,
      progress: 0,
      status: 'planning',
      updates: [],
      result: null,
      error: null,
      researchPlan: null,
      finalSources: null,
      planLinks: null
    });
  }, []);

  // F5 sonrası recovery fonksiyonu
  const recoverFromDatabase = useCallback(async (messageData: any) => {
    if (!messageData) return false;

    const { 
      research_plan_links, 
      research_plan, 
      research_status, 
      research_progress,
      content,
      citation_sources 
    } = messageData;

    if (!research_plan_links) return false;

    // Create updates from plan links data
    const recoveredUpdates: ResearchUpdate[] = [];

    // Add planning step
    if (research_plan) {
      recoveredUpdates.push({
        id: `recovery_planning_${Date.now()}`,
        step: 1,
        title: 'Research Planning',
        description: 'Research plan created successfully',
        status: 'completed',
        timestamp: research_plan_links.created_at
      });
    }

    // Add search steps
    research_plan_links.searches?.forEach((search: any) => {
      recoveredUpdates.push({
        id: `recovery_search_${search.step}`,
        step: search.step,
        title: `Web Search ${search.step - 1}`,
        description: `Found ${search.result_count} sources for "${search.query}"`,
        status: search.status,
        timestamp: search.found_at || research_plan_links.created_at,
        data: {
          query: search.query,
          resultCount: search.result_count,
          sources: search.links?.slice(0, 4).map((link: any) => ({
            title: link.title,
            url: link.url
          })) || []
        }
      });
    });

    // Add analysis steps  
    research_plan_links.analyses?.forEach((analysis: any) => {
      recoveredUpdates.push({
        id: `recovery_analysis_${analysis.step}`,
        step: analysis.step,
        title: `Analysis ${analysis.step - 6}: ${analysis.type}`,
        description: `Analysis completed - ${analysis.findings_count} key findings`,
        status: analysis.status,
        timestamp: research_plan_links.created_at,
        data: {
          type: analysis.type,
          findingsCount: analysis.findings_count,
          keyLinks: analysis.key_sources?.slice(0, 4) || []
        }
      });
    });

    // Add final report step if completed
    if (research_status === 'complete' && content) {
      recoveredUpdates.push({
        id: `recovery_report_${Date.now()}`,
        step: 12,
        title: 'Final Report Generation',
        description: 'Report generated successfully',
        status: 'completed',
        timestamp: research_plan_links.created_at
      });
    }

    // Restore state
    setState({
      isActive: research_status !== 'complete',
      progress: research_progress || 0,
      status: research_status || 'planning',
      updates: recoveredUpdates,
      result: content || null,
      error: null,
      researchPlan: research_plan,
      finalSources: citation_sources && citation_sources.length > 0 
        ? citation_sources.map((source: any) => ({
            title: source.title,
            url: source.url,
            relevance: source.relevance || 0.7
          }))
        : null,
      planLinks: research_plan_links
    });

    console.log('[DEEP SEARCH RECOVERY] Successfully recovered from database:', research_plan_links);
    return true;
  }, []);

  return {
    ...state,
    startDeepSearch,
    stopDeepSearch,
    resetDeepSearch,
    recoverFromDatabase,
    addUpdate,
    updateProgress
  };
}; 