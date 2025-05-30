"use client";

import React, { useState } from 'react';
import { List, CheckCircle2, Clock, Search, Brain, FileText, Globe, BarChart3, TrendingUp, Users, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResearchUpdate {
  id: string;
  step: number;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp: string;
  data?: any;
}

interface ResearchProgressCardProps {
  progress: number;
  status: 'planning' | 'searching' | 'analyzing' | 'complete';
  updates: ResearchUpdate[];
  totalSteps: number;
  showRunningIndicators?: boolean;
  researchPlan?: any;
  finalSources?: Array<{ title: string; url: string; relevance?: number }> | null;
}

export const ResearchProgressCard: React.FC<ResearchProgressCardProps> = ({
  progress,
  status,
  updates,
  totalSteps,
  showRunningIndicators = false,
  researchPlan,
  finalSources
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showAllSources, setShowAllSources] = useState(false);
  const [showResearchPlan, setShowResearchPlan] = useState(true); // Research Plan initially open
  const isComplete = status === 'complete';
  
  const sortedUpdates = [...updates].sort((a, b) => a.step - b.step);

  const getStatusText = () => {
    switch (status) {
      case 'planning': return 'Planning';
      case 'searching': return 'Searching';
      case 'analyzing': return 'Analyzing';
      case 'complete': return 'Complete';
      default: return 'Processing';
    }
  };

  const getTitle = () => {
    if (isComplete) return "Research Complete";
    switch (status) {
      case 'planning': return "Creating Plan";
      case 'searching': return "Searching";
      case 'analyzing': return "Analyzing";
      default: return "Deep Research";
    }
  };

  const getCurrentStepUpdate = () => {
    return sortedUpdates.find(u => u.step === currentStep);
  };

  const currentUpdate = getCurrentStepUpdate();

  const getSearchIcon = (query: string) => {
    const lowercaseQuery = query.toLowerCase();
    if (lowercaseQuery.includes('biography') || lowercaseQuery.includes('background')) return <Users className="w-4 h-4 text-gray-400" />;
    if (lowercaseQuery.includes('achievement') || lowercaseQuery.includes('contribution')) return <BarChart3 className="w-4 h-4 text-gray-400" />;
    if (lowercaseQuery.includes('field') || lowercaseQuery.includes('work') || lowercaseQuery.includes('study')) return <Brain className="w-4 h-4 text-gray-400" />;
    if (lowercaseQuery.includes('publication') || lowercaseQuery.includes('project')) return <FileText className="w-4 h-4 text-gray-400" />;
    if (lowercaseQuery.includes('origin') || lowercaseQuery.includes('cultural')) return <Globe className="w-4 h-4 text-gray-400" />;
    return <Search className="w-4 h-4 text-gray-400" />;
  };

  const getAnalysisIcon = (type: string) => {
    const lowercaseType = type.toLowerCase();
    if (lowercaseType.includes('trend')) return <TrendingUp className="w-4 h-4 text-purple-400" />;
    if (lowercaseType.includes('impact') || lowercaseType.includes('assessment')) return <BarChart3 className="w-4 h-4 text-purple-400" />;
    if (lowercaseType.includes('comparative') || lowercaseType.includes('comparison')) return <Users className="w-4 h-4 text-purple-400" />;
    if (lowercaseType.includes('risk') || lowercaseType.includes('evaluation')) return <Brain className="w-4 h-4 text-purple-400" />;
    if (lowercaseType.includes('future') || lowercaseType.includes('outlook')) return <Lightbulb className="w-4 h-4 text-purple-400" />;
    return <Brain className="w-4 h-4 text-purple-400" />;
  };

  const getAllLinks = () => {
    // Eğer backend'den finalSources geliyorsa onu kullan (daha doğru sayı)
    if (finalSources && finalSources.length > 0) {
      return finalSources.map(source => ({ ...source, type: 'final' }));
    }
    
    // Yoksa eski mantığı kullan (updates'den topla) - ama daha akıllıca
    const allLinks: any[] = [];
    const linkUrlsSet = new Set<string>(); // Duplicate URL'leri önlemek için
    
    // Önce search step'lerinden linkleri topla
    sortedUpdates.forEach(update => {
      if (update.data?.sources) {
        update.data.sources.forEach((source: any) => {
          if (source.url && !linkUrlsSet.has(source.url)) {
            linkUrlsSet.add(source.url);
            allLinks.push({ ...source, type: 'source' });
          }
        });
      }
      
      if (update.data?.keyLinks) {
        update.data.keyLinks.forEach((link: any) => {
          if (link.url && !linkUrlsSet.has(link.url)) {
            linkUrlsSet.add(link.url);
            allLinks.push({ ...link, type: 'key' });
          }
        });
      }
    });
    
    // Eğer research plan'dan da link verisi varsa onları da ekle
    if (researchPlan?.searches) {
      researchPlan.searches.forEach((searchItem: any, searchIndex: number) => {
        const currentSearchStep = searchIndex + 2; 
        const relatedUpdate = sortedUpdates.find(upd => upd.step === currentSearchStep && upd.status === 'completed');
        const sourcesForThisSearch = relatedUpdate?.data?.sources || [];
        
        sourcesForThisSearch.forEach((source: any) => {
          if (source.url && !linkUrlsSet.has(source.url)) {
            linkUrlsSet.add(source.url);
            allLinks.push({ ...source, type: 'source' });
          }
        });
      });
    }
    
    return allLinks;
  };

  const allCollectedLinks = getAllLinks();

  return (
    <div className="relative bg-black/90 backdrop-blur-sm rounded-lg p-6 space-y-6 overflow-hidden">
      {/* Sun effect - Remains behind everything */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="w-[600px] h-[600px] bg-gradient-radial from-yellow-400/20 via-yellow-500/5 to-transparent rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">{getTitle()}</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{getStatusText()}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-gray-400 min-w-[30px]">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Research Plan Toggle */}
        {researchPlan && (
          <div className="space-y-2">
             <button
              onClick={() => setShowResearchPlan(!showResearchPlan)}
              className="flex items-center justify-between w-full text-left group mb-2"
            >
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">Research Plan</h4>
              </div>
              {showResearchPlan ? <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-white" /> : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white" />}
            </button>
            
            {showResearchPlan && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pl-1 pr-1">
                {/* Searches */}
                {researchPlan.searches && researchPlan.searches.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider pl-2">
                      Search Queries
                    </h5>
                    <div className="space-y-2">
                      {researchPlan.searches.map((searchItem: any, searchIndex: number) => {
                        const currentSearchStep = searchIndex + 2; 
                        const relatedUpdate = sortedUpdates.find(upd => upd.step === currentSearchStep);
                        const sourcesForThisSearch = relatedUpdate?.data?.sources;

                        return (
                          <div key={`search-block-${searchIndex}`} className="p-3 rounded-md bg-gray-800/60 border border-gray-700/80 space-y-2">
                            <div className="flex items-center gap-2.5">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                                {getSearchIcon(searchItem.query)}
                              </div>
                              <span className="text-sm text-gray-200 truncate">{searchItem.query}</span>
                            </div>

                            {sourcesForThisSearch && sourcesForThisSearch.length > 0 && (
                              <div className="ml-[calc(1.5rem+0.625rem)] pt-1.5 space-y-1.5 border-t border-gray-700/60">
                                {sourcesForThisSearch.slice(0, 3).map((source: any, sourceIdx: number) => (
                                  <a
                                    key={`slink-${searchIndex}-${sourceIdx}`}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 group"
                                  >
                                    <img 
                                      src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`}
                                      alt=""
                                      className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%234B5563"/></svg>'; }}
                                    />
                                    <span className="text-xs text-gray-400 group-hover:text-cyan-400 transition-colors truncate" title={source.title}>
                                      {source.title.substring(0, 20)}{source.title.length > 20 ? '...' : ''}
                                    </span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Analyses */}
                {researchPlan.analyses && researchPlan.analyses.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider pl-2">
                      Analysis Steps
                    </h5>
                    <div className="space-y-2">
                      {researchPlan.analyses.map((analysis: any, index: number) => {
                        const totalSearches = researchPlan.searches?.length || 0;
                        const currentAnalysisStep = totalSearches + 2 + index;
                        const relatedUpdate = sortedUpdates.find(upd => upd.step === currentAnalysisStep);
                        const isRunning = relatedUpdate?.status === 'running';

                        return (
                          <div
                            key={`analysis-${index}`}
                            className={cn(
                              "flex items-center gap-2.5 text-sm p-3 rounded-md",
                              isRunning
                                ? "bg-gray-800/60 border-2 border-green-500"
                                : "bg-gray-800/60 border border-gray-700/80"
                            )}
                          >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                              {getAnalysisIcon(analysis.type)}
                            </div>
                            <span className="text-sm text-gray-200 truncate">
                              {analysis.type}: <span className="text-gray-400 text-xs">{analysis.description.substring(0,30)}{analysis.description.length > 30 ? '...' : ''}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* All Collected Links */}
        {allCollectedLinks.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-gray-700/80">
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className="flex items-center justify-between w-full text-left group"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h5 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                  All Sources ({allCollectedLinks.length})
                </h5>
              </div>
              {showAllSources ? <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-white" /> : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white" />}
            </button>

            {showAllSources && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-1 pl-6 pr-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
                {allCollectedLinks.map((link: any, index: number) => (
                  <a
                    key={`alllink-${index}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 group p-1 hover:bg-gray-700/60 rounded"
                  >
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=16`}
                      alt=""
                      className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%234B5563"/></svg>'; }}
                    />
                    <span className="text-gray-400 group-hover:text-cyan-400 transition-colors truncate" title={link.title}>
                      {link.title}
                    </span>
                    {link.type === 'key' && (
                      <span className="ml-auto text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-sm font-medium">
                        KEY
                      </span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 