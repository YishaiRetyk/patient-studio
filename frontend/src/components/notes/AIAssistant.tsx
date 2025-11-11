'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAIComplete, AICompleteDto } from '@/lib/api/notes';

/**
 * AI Assistant Component (T128)
 * AI-powered SOAP note autocompletion with keyboard shortcut
 * Phase 5: Clinical Documentation with SOAP Notes
 */

export interface AIAssistantProps {
  currentSection: 'subjective' | 'objective' | 'assessment' | 'plan';
  partialNote: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  patientName: string;
  appointmentDate: string;
  onAcceptCompletion: (section: string, completion: string) => void;
  className?: string;
}

export function AIAssistant({
  currentSection,
  partialNote,
  patientName,
  appointmentDate,
  onAcceptCompletion,
  className = '',
}: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [completion, setCompletion] = useState<string>('');
  const aiCompleteMutation = useAIComplete();

  // Keyboard shortcut: Ctrl+Space or Cmd+Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        handleRequestCompletion();
      }

      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setCompletion('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSection, partialNote, isOpen]);

  const handleRequestCompletion = useCallback(async () => {
    if (aiCompleteMutation.isPending) return;

    setIsOpen(true);

    const requestData: AICompleteDto = {
      partialNote: {
        ...partialNote,
        soapSection: currentSection,
      },
      context: {
        patientName,
        appointmentDate,
      },
    };

    try {
      const result = await aiCompleteMutation.mutateAsync(requestData);
      setCompletion(result.completion);
    } catch (error) {
      console.error('AI completion failed:', error);
      setCompletion('');
    }
  }, [currentSection, partialNote, patientName, appointmentDate, aiCompleteMutation]);

  const handleAccept = () => {
    if (completion) {
      onAcceptCompletion(currentSection, completion);
      setIsOpen(false);
      setCompletion('');
    }
  };

  const handleReject = () => {
    setIsOpen(false);
    setCompletion('');
  };

  if (!isOpen && !aiCompleteMutation.isPending) {
    // Floating button when closed
    return (
      <div className={`fixed bottom-8 right-8 z-50 ${className}`}>
        <button
          onClick={handleRequestCompletion}
          disabled={aiCompleteMutation.isPending}
          className="group relative rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="AI Assistant"
          title="Get AI completion (Ctrl+Space)"
        >
          {/* AI Sparkle Icon */}
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
            <div className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white whitespace-nowrap">
              AI Assistant (Ctrl+Space)
              <div className="text-gray-400 mt-1">Get SOAP note suggestions</div>
            </div>
          </div>

          {/* Pulse animation */}
          <span className="absolute inset-0 rounded-full bg-blue-400 opacity-75 animate-ping"></span>
        </button>
      </div>
    );
  }

  // Full modal when open or loading
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className}`}>
      <div className="w-full max-w-2xl mx-4 rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 p-2">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
              <p className="text-sm text-gray-500">
                Suggestion for <span className="font-medium capitalize">{currentSection}</span> section
              </p>
            </div>
          </div>
          <button
            onClick={handleReject}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {aiCompleteMutation.isPending ? (
            // Loading state
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="h-8 w-8 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-700">Generating AI completion...</p>
              <p className="mt-1 text-xs text-gray-500">This may take a few seconds</p>
            </div>
          ) : aiCompleteMutation.isError ? (
            // Error state
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">AI Completion Failed</h3>
                  <p className="mt-2 text-sm text-red-700">
                    {(aiCompleteMutation.error as Error)?.message || 'An unexpected error occurred. Please try again.'}
                  </p>
                </div>
              </div>
            </div>
          ) : completion ? (
            // Success state with completion
            <div>
              <div className="rounded-md bg-gray-50 border border-gray-200 p-4 mb-4">
                <div className="text-sm text-gray-900 whitespace-pre-wrap">{completion}</div>
              </div>

              {/* HIPAA Notice */}
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <div className="flex items-start">
                  <svg
                    className="h-4 w-4 text-blue-400 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="ml-2 text-xs text-blue-700">
                    PHI de-identified • HIPAA compliant • Zero-retention mode
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {completion && !aiCompleteMutation.isPending && (
          <div className="flex items-center justify-end space-x-3 border-t border-gray-200 px-6 py-4">
            <button
              onClick={handleReject}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Discard
            </button>
            <button
              onClick={handleAccept}
              className="rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Accept & Insert
            </button>
          </div>
        )}

        {aiCompleteMutation.isError && (
          <div className="flex items-center justify-end space-x-3 border-t border-gray-200 px-6 py-4">
            <button
              onClick={handleReject}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Close
            </button>
            <button
              onClick={handleRequestCompletion}
              className="rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
