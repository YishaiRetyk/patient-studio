'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { WaitlistEntry } from '@/lib/api/waitlist';

/**
 * Waitlist Management Panel Component (T105)
 * Displays and manages waitlist entries for practitioners
 */

interface WaitlistPanelProps {
  entries: WaitlistEntry[];
  onNotify?: (entryId: string) => void;
  onRemove?: (entryId: string) => void;
  isLoading?: boolean;
}

export function WaitlistPanel({
  entries,
  onNotify,
  onRemove,
  isLoading = false,
}: WaitlistPanelProps) {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const statusColors = {
    ACTIVE: 'bg-blue-100 text-blue-800',
    CLAIMED: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-gray-100 text-gray-600',
  };

  const statusLabels = {
    ACTIVE: 'Active',
    CLAIMED: 'Claimed',
    EXPIRED: 'Expired',
  };

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No waitlist entries</h3>
        <p className="mt-1 text-sm text-gray-500">
          Patients will appear here when they join the waitlist
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Waitlist ({entries.length})
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          First-come, first-served order
        </p>
      </div>

      {/* Entries list */}
      <div className="divide-y divide-gray-200">
        {sortedEntries.map((entry, index) => {
          const isNotified = !!entry.notifiedAt;
          const isClaimed = entry.status === 'CLAIMED';
          const isExpired = entry.status === 'EXPIRED';

          return (
            <div
              key={entry.id}
              className="px-6 py-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                {/* Entry info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {/* Position badge */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
                      #{index + 1}
                    </div>

                    {/* Patient info */}
                    <div>
                      <p className="font-medium text-gray-900">
                        Patient ID: {entry.patientId.slice(0, 8)}...
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                        <span>
                          {format(new Date(entry.desiredDateStart), 'MMM d, yyyy')}
                        </span>
                        <span>-</span>
                        <span>
                          {format(new Date(entry.desiredDateEnd), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
                        statusColors[entry.status]
                      }`}
                    >
                      {statusLabels[entry.status]}
                    </span>
                  </div>

                  {/* Additional info */}
                  <div className="mt-2 text-sm text-gray-600">
                    <p>
                      Added {formatDistanceToNow(new Date(entry.createdAt))} ago
                    </p>
                    {isNotified && (
                      <p className="text-blue-600">
                        Notified {formatDistanceToNow(new Date(entry.notifiedAt!))} ago
                      </p>
                    )}
                    {isClaimed && entry.claimedAt && (
                      <p className="text-green-600">
                        Claimed {formatDistanceToNow(new Date(entry.claimedAt))} ago
                      </p>
                    )}
                    {entry.practitionerId && (
                      <p className="mt-1">
                        Preferred practitioner: {entry.practitionerId.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {entry.status === 'ACTIVE' && (
                  <div className="flex gap-2">
                    {onNotify && !isNotified && (
                      <button
                        onClick={() => onNotify(entry.id)}
                        disabled={isLoading}
                        className="rounded-md border border-blue-600 bg-white px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        type="button"
                      >
                        Notify
                      </button>
                    )}
                    {onRemove && (
                      <button
                        onClick={() => onRemove(entry.id)}
                        disabled={isLoading}
                        className="rounded-md border border-red-300 bg-white px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        type="button"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
