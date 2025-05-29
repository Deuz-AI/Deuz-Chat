"use client";

import React, { useState } from 'react';
import { ChevronDown, List, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
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
}

export const ResearchProgressCard: React.FC<ResearchProgressCardProps> = ({
  progress,
  status,
  updates,
  totalSteps,
  showRunningIndicators = false,
  researchPlan
}) => {
  const [showPlan, setShowPlan] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const isComplete = status === 'complete';
  
  // Sort updates by step number for proper display order
  const sortedUpdates = [...updates].sort((a, b) => a.step - b.step);

  const getStatusText = () => {
    switch (status) {
      case 'planning':
        return 'Planning';
      case 'searching':
        return 'Searching';
      case 'analyzing':
        return 'Analyzing';
      case 'complete':
        return 'Complete';
      default:
        return 'Processing';
    }
  };

  const getTitle = () => {
    if (isComplete) {
      return "Deep Research Complete";
    }
    
    switch (status) {
      case 'planning':
        return "Creating Research Plan";
      case 'searching':
        return "Searching Web Sources";
      case 'analyzing':
        return "Analyzing Results";
      default:
        return "Deep Research Progress";
    }
  };

  // Get total steps from plan if available
    const totalStepsFromPlan = researchPlan 
    ? (researchPlan.searches?.length || 0) + (researchPlan.analyses?.length || 0) + 2 // +1 for planning, +1 for report
    : 12;

  // Generate step numbers (1-12)
  const stepNumbers = Array.from({ length: totalStepsFromPlan }, (_, i) => i + 1);

  const getStepStatus = (stepNum: number) => {
    const stepUpdate = sortedUpdates.find(u => u.step === stepNum);
    if (stepUpdate) {
      return stepUpdate.status;
    }
    return stepNum <= progress / (100 / totalStepsFromPlan) ? 'completed' : 'pending';
  };

  const getCurrentStepUpdate = () => {
    return sortedUpdates.find(u => u.step === currentStep);
  };

  const currentUpdate = getCurrentStepUpdate();

    return (
    <div className="bg-gray-900 rounded-xl p-6 text-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-medium text-white">
            {getTitle()}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-cyan-400 font-medium text-sm">
            {getStatusText()}
          </span>
        <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-cyan-400 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-cyan-400 text-sm font-medium min-w-[35px]">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Show Research Plan Button */}
      <button
        onClick={() => setShowPlan(!showPlan)}
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-6"
      >
        <List className="w-4 h-4" />
        <span className="text-sm">Show Research Plan</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", showPlan && "rotate-180")} />
      </button>

      {/* Research Plan (Collapsible) */}
      {showPlan && researchPlan && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="space-y-4">
        {/* Searches */}
        {researchPlan.searches && researchPlan.searches.length > 0 && (
          <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
              Web Searches ({researchPlan.searches.length})
            </h5>
            <div className="space-y-1">
              {researchPlan.searches.map((search: any, index: number) => (
                <div 
                  key={index} 
                      className="flex items-start gap-2 text-xs p-2 bg-gray-700 rounded border border-gray-600"
                >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-medium">
                    {search.priority}
                  </span>
                      <span className="text-gray-200 leading-relaxed">
                    {search.query}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analyses */}
        {researchPlan.analyses && researchPlan.analyses.length > 0 && (
          <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
              Analyses ({researchPlan.analyses.length})
            </h5>
            <div className="space-y-1">
              {researchPlan.analyses.map((analysis: any, index: number) => (
                <div 
                  key={index} 
                      className="flex items-start gap-2 text-xs p-2 bg-gray-700 rounded border border-gray-600"
                >
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-medium">
                    {analysis.priority}
                  </span>
                      <div>
                        <div className="text-gray-200 font-medium">{analysis.type}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5">{analysis.description}</div>
                    </div>
                    </div>
                  ))}
                  </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Step Info */}
      {currentUpdate && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            {currentUpdate.status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : currentUpdate.status === 'running' ? (
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Clock className="w-5 h-5 text-gray-400" />
            )}
            <span className="font-medium text-white">{currentUpdate.title}</span>
          </div>
          <p className="text-sm text-gray-300 ml-7">{currentUpdate.description}</p>
          <div className="text-xs text-gray-500 ml-7">
            {new Date(currentUpdate.timestamp).toLocaleTimeString()}
          </div>

          {/* Show sources if available */}
          {currentUpdate.data?.sources && currentUpdate.data.sources.length > 0 && (
            <div className="mt-3 ml-7">
              <div className="text-xs text-gray-400 mb-2 font-medium">Found Sources:</div>
              <div className="space-y-1">
                {currentUpdate.data.sources.map((source: any, index: number) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 hover:underline p-1 rounded"
                  >
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`}
                      alt=""
                      className="w-4 h-4 rounded-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23374151"/><text x="8" y="12" text-anchor="middle" fill="%23fff" font-size="10">🔗</text></svg>';
                      }}
                    />
                    <span className="truncate max-w-[300px]">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Show key links if available */}
          {currentUpdate.data?.keyLinks && currentUpdate.data.keyLinks.length > 0 && (
            <div className="mt-3 ml-7">
              <div className="text-xs text-gray-400 mb-2 font-medium">Key Sources:</div>
              <div className="space-y-1">
                {currentUpdate.data.keyLinks.map((link: any, index: number) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300 hover:underline p-1 rounded"
                  >
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=16`}
                      alt=""
                      className="w-4 h-4 rounded-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23374151"/><text x="8" y="12" text-anchor="middle" fill="%23fff" font-size="10">📄</text></svg>';
                      }}
                    />
                    <span className="truncate max-w-[300px]">{link.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Show insights if available */}
          {currentUpdate.data?.insights && currentUpdate.data.insights.length > 0 && (
            <div className="mt-3 ml-7">
              <div className="text-xs text-gray-400 mb-2 font-medium">Key Insights:</div>
              <div className="space-y-1">
                {currentUpdate.data.insights.map((insight: string, index: number) => (
                  <div key={index} className="text-xs text-gray-300 p-2 bg-gray-800 rounded">
                    • {insight}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Step Numbers */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {stepNumbers.map((stepNum) => {
          const stepStatus = getStepStatus(stepNum);
          const isActive = stepNum === currentStep;

  return (
            <button
              key={stepNum}
              onClick={() => setCurrentStep(stepNum)}
              className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                stepStatus === 'completed' 
                  ? "bg-green-500 text-white" 
                  : stepStatus === 'running'
                  ? "bg-cyan-400 text-gray-900"
                  : isActive
                  ? "bg-cyan-400 text-gray-900"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              )}
            >
              {stepNum}
            </button>
          );
        })}
        
        {stepNumbers.length > 8 && (
          <button className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center hover:bg-gray-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
            </div>
  );
}; 