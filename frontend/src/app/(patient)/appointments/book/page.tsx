'use client';

import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { useAvailability, useCreateAppointment, AvailabilitySlot } from '@/lib/api/appointments';
import { AvailabilityCalendar } from '@/components/appointments/AvailabilityCalendar';
import { TimeSlotSelector } from '@/components/appointments/TimeSlotSelector';
import { BookingConfirmation } from '@/components/appointments/BookingConfirmation';

/**
 * Appointment Booking Page (T084, T089)
 * Complete booking flow with error handling for concurrent bookings
 */
export default function BookAppointmentPage() {
  // State
  const [practitionerId] = useState<string>(''); // TODO: Add practitioner selector
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<{
    practitionerName: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Date range for availability query (7 days from selected or current date)
  const dateRange = useMemo(() => {
    const start = selectedDate || new Date();
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(addDays(start, 6), 'yyyy-MM-dd'),
    };
  }, [selectedDate]);

  // Fetch availability
  const { data: availabilityData, isLoading: isLoadingAvailability } = useAvailability({
    practitionerId: practitionerId || '',
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Create appointment mutation
  const createAppointment = useCreateAppointment();

  // Extract available dates for calendar
  const availableDates = useMemo(() => {
    if (!availabilityData?.availability) return [];
    const dates = new Set<string>();
    availabilityData.availability.forEach((slot) => {
      if (slot.available) {
        dates.add(slot.date);
      }
    });
    return Array.from(dates);
  }, [availabilityData]);

  // Filter slots for selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !availabilityData?.availability) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return availabilityData.availability.filter((slot) => slot.date === dateStr);
  }, [selectedDate, availabilityData]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Reset slot selection
    setBookingError(null);
  };

  // Handle slot selection
  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setBookingError(null);
  };

  // Handle booking (T089: Error handling for concurrent bookings)
  const handleBookAppointment = async () => {
    if (!selectedSlot || !practitionerId) {
      setBookingError('Please select a time slot');
      return;
    }

    setBookingError(null);

    try {
      // Construct ISO 8601 datetime strings
      const startTime = `${selectedSlot.date}T${selectedSlot.startTime}:00Z`;
      const endTime = `${selectedSlot.date}T${selectedSlot.endTime}:00Z`;

      await createAppointment.mutateAsync({
        patientId: 'current-patient-id', // TODO: Get from auth context
        practitionerId,
        startTime,
        endTime,
      });

      // Success - show confirmation
      setConfirmedAppointment({
        practitionerName: 'Dr. Jane Smith', // TODO: Get from practitioner data
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
      setShowConfirmation(true);

      // Reset form
      setSelectedDate(null);
      setSelectedSlot(null);
    } catch (error: unknown) {
      // Handle specific error cases (T089)
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err.response?.status === 409) {
        // Concurrent booking - slot already taken
        setBookingError(
          'This time slot was just booked by someone else. Please select another time slot.'
        );
        // Refetch availability to update UI
        // The query will automatically refetch on window focus
      } else if (err.response?.status === 400) {
        // Validation error
        const message = err.response.data?.message || 'Invalid booking request';
        setBookingError(message);
      } else if (err.response?.status === 401) {
        // Unauthorized
        setBookingError('Please log in to book an appointment');
      } else {
        // Generic error
        setBookingError('Failed to book appointment. Please try again.');
      }

      console.error('Booking error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book an Appointment</h1>
          <p className="mt-2 text-sm text-gray-600">
            Select your preferred date and time to schedule your appointment
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Calendar */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Step 1: Select a Date</h2>
              <AvailabilityCalendar
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                availableDates={availableDates}
              />
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="mt-6 rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">Step 2: Select a Time</h2>
                <TimeSlotSelector
                  slots={slotsForSelectedDate}
                  selectedSlot={selectedSlot}
                  onSlotSelect={handleSlotSelect}
                  loading={isLoadingAvailability}
                />
              </div>
            )}
          </div>

          {/* Right Column: Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Booking Summary</h2>

              {/* Selected Date */}
              <div className="mb-4">
                <p className="mb-1 text-sm text-gray-500">Date</p>
                <p className="text-base font-medium text-gray-900">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Not selected'}
                </p>
              </div>

              {/* Selected Time */}
              <div className="mb-6">
                <p className="mb-1 text-sm text-gray-500">Time</p>
                <p className="text-base font-medium text-gray-900">
                  {selectedSlot
                    ? `${selectedSlot.startTime} - ${selectedSlot.endTime}`
                    : 'Not selected'}
                </p>
              </div>

              {/* Error Message */}
              {bookingError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-800">{bookingError}</p>
                </div>
              )}

              {/* Book Button */}
              <button
                onClick={handleBookAppointment}
                disabled={!selectedSlot || createAppointment.isPending}
                className={`w-full rounded-md px-6 py-3 font-medium text-white ${
                  selectedSlot && !createAppointment.isPending
                    ? 'bg-primary-600 hover:bg-primary-700'
                    : 'cursor-not-allowed bg-gray-300'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {createAppointment.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Booking...
                  </span>
                ) : (
                  'Confirm Booking'
                )}
              </button>

              {/* Info Text */}
              <p className="mt-4 text-center text-xs text-gray-500">
                You'll receive confirmation and reminder emails after booking
              </p>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        <BookingConfirmation
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          appointment={confirmedAppointment}
        />
      </div>
    </div>
  );
}
