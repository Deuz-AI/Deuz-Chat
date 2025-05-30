"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search, Brain, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResearchUpdate } from './research-progress-card';

interface StepCarouselProps {
  updates: ResearchUpdate[];
}

export const StepCarousel: React.FC<StepCarouselProps> = ({ updates }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!updates || updates.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-neutral-500">No research steps available</div>
      </div>
    );
  }

  const getStepIcon = (update: ResearchUpdate) => {
    const iconClass = "h-4 w-4";
    
    if (update.title.toLowerCase().includes('search') || update.title.toLowerCase().includes('query')) {
      return <Search className={iconClass} />;
    }
    if (update.title.toLowerCase().includes('analysis') || update.title.toLowerCase().includes('analyze')) {
      return <Brain className={iconClass} />;
    }
    if (update.title.toLowerCase().includes('plan') || update.title.toLowerCase().includes('research')) {
      return <FileText className={iconClass} />;
    }
    
    return <FileText className={iconClass} />;
  };

  const getStatusIcon = (status: ResearchUpdate['status']) => {
    const iconClass = "h-3 w-3";
    
    switch (status) {
      case 'completed':
        return <CheckCircle className={cn(iconClass, "text-green-500")} />;
      case 'error':
        return <XCircle className={cn(iconClass, "text-red-500")} />;
      case 'running':
        return <Clock className={cn(iconClass, "text-blue-500 animate-spin")} />;
      case 'pending':
        return <Clock className={cn(iconClass, "text-neutral-400")} />;
      default:
        return <Clock className={cn(iconClass, "text-neutral-400")} />;
    }
  };

  const getStatusColor = (status: ResearchUpdate['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'running':
        return 'text-blue-600 dark:text-blue-400';
      case 'pending':
        return 'text-neutral-500 dark:text-neutral-400';
      default:
        return 'text-neutral-500 dark:text-neutral-400';
    }
  };

  const nextStep = () => {
    setCurrentIndex((prev) => (prev + 1) % updates.length);
  };

  const prevStep = () => {
    setCurrentIndex((prev) => (prev - 1 + updates.length) % updates.length);
  };

  const goToStep = (index: number) => {
    setCurrentIndex(index);
  };

  const currentUpdate = updates[currentIndex];

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {updates.map((update, index) => {
          const isActive = index === currentIndex;
          const isRunning = update.status === 'running';
          const isAnalysisStep = update.step >= 7; // Analysis steps start from step 7
          
          return (
            <button
              key={update.id}
              onClick={() => goToStep(index)}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all duration-200",
                isRunning && isAnalysisStep
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 ring-2 ring-green-500"
                  : isActive
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-200 dark:ring-blue-800"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              )}
            >
              {update.step}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="relative min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Step header */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {getStepIcon(currentUpdate)}
                <h4 className="font-medium text-sm">{currentUpdate.title}</h4>
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon(currentUpdate.status)}
                <span className={cn("text-xs capitalize", getStatusColor(currentUpdate.status))}>
                  {currentUpdate.status}
                </span>
              </div>
            </div>

            {/* Step description */}
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {currentUpdate.description}
            </p>

            {/* Key Links (for analysis steps) */}
            {currentUpdate.data?.keyLinks && currentUpdate.data.keyLinks.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-xs text-blue-600 dark:text-blue-400 mb-2 font-medium">Key Sources:</div>
                <div className="space-y-1">
                  {currentUpdate.data.keyLinks.map((link: any, index: number) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                    >
                      📄 {link.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Web Search Sources */}
            {currentUpdate.data?.sources && currentUpdate.data.sources.length > 0 && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-xs text-green-600 dark:text-green-400 mb-2 font-medium">Found Sources:</div>
                <div className="space-y-1">
                  {currentUpdate.data.sources.map((source: any, index: number) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline"
                    >
                      🔗 {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Step data preview (if available) */}
            {currentUpdate.data && !currentUpdate.data.keyLinks && !currentUpdate.data.sources && (
              <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                <div className="text-xs text-neutral-500 mb-1">Data Preview:</div>
                <pre className="text-xs text-neutral-700 dark:text-neutral-300 overflow-x-auto">
                  {typeof currentUpdate.data === 'string' 
                    ? currentUpdate.data.slice(0, 200) + (currentUpdate.data.length > 200 ? '...' : '')
                    : JSON.stringify(currentUpdate.data, null, 2).slice(0, 200) + '...'
                  }
                </pre>
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-neutral-400">
              {new Date(currentUpdate.timestamp).toLocaleTimeString()}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {updates.length > 1 && (
          <>
            <button
              onClick={prevStep}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-6 h-6 rounded-full bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              onClick={nextStep}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-6 h-6 rounded-full bg-white dark:bg-neutral-800 shadow-md border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}; 