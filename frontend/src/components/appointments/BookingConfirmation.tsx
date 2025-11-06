'use client';

import { format } from 'date-fns';

/**
 * Booking Confirmation Modal (T087)
 * Displays confirmation after successful appointment booking
 */
interface BookingConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    practitionerName: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null;
}

export function BookingConfirmation({
  isOpen,
  onClose,
  appointment,
}: BookingConfirmationProps) {
  if (!isOpen || !appointment) return null;

  const appointmentDate = new Date(appointment.date);
  const formattedDate = format(appointmentDate, 'EEEE, MMMM d, yyyy');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-center text-gray-900 mb-2">
            Appointment Confirmed!
          </h3>

          {/* Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Practitioner</p>
                <p className="text-base font-medium text-gray-900">
                  {appointment.practitionerName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-base font-medium text-gray-900">{formattedDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="text-base font-medium text-gray-900">
                  {appointment.startTime} - {appointment.endTime}
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-800">
              ✉️ A confirmation email has been sent to your email address. You'll receive
              reminders 48 hours and 2 hours before your appointment.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
            >
              Done
            </button>
            <button
              onClick={() => {
                // Navigate to appointments list
                window.location.href = '/appointments';
              }}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            >
              View Appointments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
