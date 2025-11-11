'use client';

import React, { useState } from 'react';
import { useNoteAuditHistory, AuditEvent } from '@/lib/api/notes';

/**
 * Version History Component (T129)
 * Display audit trail for clinical note versions
 * Phase 5: Clinical Documentation with SOAP Notes
 */

export interface VersionHistoryProps {
  noteId: string;
  currentVersion: number;
  className?: string;
}

export function VersionHistory({ noteId, currentVersion, className = '' }: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, isError } = useNoteAuditHistory(noteId, {
    enabled: isOpen,
  });

  const auditEvents = data?.auditHistory || [];

  // Group events by version
  const versionGroups = auditEvents.reduce((acc, event) => {
    const version = (event.metadata?.newVersion || event.metadata?.version || currentVersion) as number;
    if (!acc[version]) {
      acc[version] = [];
    }
    acc[version].push(event);
    return acc;
  }, {} as Record<number, AuditEvent[]>);

  const versions = Object.keys(versionGroups)
    .map(Number)
    .sort((a, b) => b - a); // Sort descending (newest first)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'UPDATE':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        );
      case 'READ':
        return (
          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path
              fillRule="evenodd"
              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'SHARE':
        return (
          <svg className="h-5 w-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'Created';
      case 'UPDATE':
        return 'Updated';
      case 'READ':
        return 'Viewed';
      case 'SHARE':
        return 'Shared';
      default:
        return action;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center space-x-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      >
        <svg
          className="h-5 w-5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Version History</span>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
          v{currentVersion}
        </span>
      </button>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className}`}>
      <div className="w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Version History</h2>
            <p className="mt-1 text-sm text-gray-500">
              Complete audit trail for this clinical note
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
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
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
              <p className="ml-3 text-sm text-gray-600">Loading version history...</p>
            </div>
          ) : isError ? (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">Failed to load version history. Please try again.</p>
            </div>
          ) : auditEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-4 text-sm font-medium text-gray-900">No history available</p>
              <p className="mt-1 text-sm text-gray-500">Version history will appear here once changes are made.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {versions.map((version) => (
                <div key={version} className="relative">
                  {/* Version Header */}
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                      v{version}
                    </div>
                    <div className="flex-1 border-t border-gray-200"></div>
                    {version === currentVersion && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Current
                      </span>
                    )}
                  </div>

                  {/* Events for this version */}
                  <div className="ml-4 space-y-3 border-l-2 border-gray-200 pl-6">
                    {versionGroups[version].map((event, idx) => (
                      <div key={event.id || idx} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[1.6rem] top-1.5 flex h-3 w-3 items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                        </div>

                        {/* Event Card */}
                        <div className="rounded-md border border-gray-200 bg-white p-3 shadow-sm">
                          <div className="flex items-start space-x-3">
                            {getActionIcon(event.action)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">
                                  {getActionLabel(event.action)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(event.timestamp)}
                                </p>
                              </div>
                              <p className="mt-1 text-sm text-gray-600">
                                by {event.user.email}
                              </p>
                              {event.metadata?.changedFields && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {event.metadata.changedFields.map((field: string) => (
                                    <span
                                      key={field}
                                      className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                                    >
                                      {field}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              All actions are logged for HIPAA compliance and audit purposes.
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
