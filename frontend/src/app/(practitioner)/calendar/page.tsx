'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FullCalendar, CalendarAppointment } from '@/components/calendar/FullCalendar';
import { AvailabilitySettings } from '@/components/practitioners/AvailabilitySettings';
import { WaitlistPanel } from '@/components/waitlist/WaitlistPanel';
import {
  usePractitioner,
  useUpdateAvailableHours,
  useGenerateCalendarToken,
  AvailableHours,
} from '@/lib/api/practitioners';
import { usePractitionerWaitlistEntries, useRemoveFromWaitlist } from '@/lib/api/waitlist';

/**
 * Practitioner Calendar Page (T102)
 * Full calendar management interface for practitioners
 */

export default function PractitionerCalendarPage() {
  const queryClient = useQueryClient();

  // For demo: hardcoded practitioner ID - in real app, get from auth context
  const practitionerId = 'demo-practitioner-id';

  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarAppointment | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Queries
  const { data: practitioner, isLoading: isPractitionerLoading } = usePractitioner(practitionerId);
  const { data: waitlistEntries = [], isLoading: isWaitlistLoading } =
    usePractitionerWaitlistEntries(practitionerId);

  // Mutations
  const updateHoursMutation = useUpdateAvailableHours();
  const generateTokenMutation = useGenerateCalendarToken();
  const removeFromWaitlistMutation = useRemoveFromWaitlist();

  // Mock appointments - in real app, fetch from API
  const mockAppointments: CalendarAppointment[] = [
    {
      id: '1',
      patientName: 'John Doe',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'SCHEDULED',
    },
  ];

  const handleSaveAvailability = async (hours: AvailableHours) => {
    try {
      await updateHoursMutation.mutateAsync({
        id: practitionerId,
        data: { availableHours: hours },
      });
      setShowAvailabilityModal(false);
      queryClient.invalidateQueries({ queryKey: ['practitioner', practitionerId] });
    } catch (error) {
      console.error('Failed to update availability:', error);
      alert('Failed to update availability. Please try again.');
    }
  };

  const handleGenerateCalendarUrl = async () => {
    try {
      const result = await generateTokenMutation.mutateAsync(practitionerId);
      await navigator.clipboard.writeText(result.calendarUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      console.error('Failed to generate calendar URL:', error);
      alert('Failed to generate calendar URL. Please try again.');
    }
  };

  const handleRemoveFromWaitlist = async (entryId: string) => {
    if (!confirm('Are you sure you want to remove this patient from the waitlist?')) {
      return;
    }

    try {
      await removeFromWaitlistMutation.mutateAsync(entryId);
      queryClient.invalidateQueries({ queryKey: ['waitlist', 'practitioner', practitionerId] });
    } catch (error) {
      console.error('Failed to remove from waitlist:', error);
      alert('Failed to remove from waitlist. Please try again.');
    }
  };

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    setSelectedAppointment(appointment);
    // Could open a modal with appointment details
  };

  if (isPractitionerLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Calendar</h1>
          <p className="mt-2 text-gray-600">Manage your appointments, availability, and waitlist</p>
        </div>

        {/* Action Bar */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowAvailabilityModal(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Configure Availability
          </button>
          <button
            onClick={handleGenerateCalendarUrl}
            disabled={generateTokenMutation.isPending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {copiedUrl ? '✓ Copied!' : 'Copy iCal URL'}
          </button>
          {practitioner?.calendarToken && (
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/calendar/export/${practitioner.calendarToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Download iCal
            </a>
          )}
        </div>

        {/* Current availability display */}
        {practitioner?.availableHours && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-gray-900">Current Availability</h3>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 lg:grid-cols-7">
              {Object.entries(practitioner.availableHours as AvailableHours).map(([day, slots]) => (
                <div key={day}>
                  <div className="font-medium capitalize text-gray-700">{day}</div>
                  {slots && slots.length > 0 ? (
                    <div className="mt-1 space-y-1 text-xs text-gray-600">
                      {slots.map((slot: { start: string; end: string }, idx: number) => (
                        <div key={idx}>
                          {slot.start} - {slot.end}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-gray-400">Unavailable</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Calendar - 2/3 width */}
          <div className="lg:col-span-2">
            <FullCalendar
              appointments={mockAppointments}
              onAppointmentClick={handleAppointmentClick}
            />
          </div>

          {/* Waitlist panel - 1/3 width */}
          <div className="lg:col-span-1">
            <WaitlistPanel
              entries={waitlistEntries}
              onRemove={handleRemoveFromWaitlist}
              isLoading={isWaitlistLoading || removeFromWaitlistMutation.isPending}
            />
          </div>
        </div>

        {/* Appointment detail modal (if selected) */}
        {selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-xl font-bold text-gray-900">Appointment Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Patient:</span>{' '}
                  {selectedAppointment.patientName}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Start:</span>{' '}
                  {new Date(selectedAppointment.startTime).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium text-gray-700">End:</span>{' '}
                  {new Date(selectedAppointment.endTime).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>{' '}
                  {selectedAppointment.status}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="rounded-md bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Availability settings modal */}
      {showAvailabilityModal && (
        <AvailabilitySettings
          initialHours={(practitioner?.availableHours as AvailableHours) || {}}
          onSave={handleSaveAvailability}
          onCancel={() => setShowAvailabilityModal(false)}
          isLoading={updateHoursMutation.isPending}
        />
      )}
    </div>
  );
}
