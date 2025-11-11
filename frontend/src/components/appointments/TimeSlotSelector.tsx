'use client';

import { AvailabilitySlot } from '@/lib/api/appointments';

/**
 * Time Slot Selector Component (T086)
 * Displays available time slots for selected date
 */
interface TimeSlotSelectorProps {
  slots: AvailabilitySlot[];
  selectedSlot: AvailabilitySlot | null;
  onSlotSelect: (slot: AvailabilitySlot) => void;
  loading?: boolean;
}

export function TimeSlotSelector({
  slots,
  selectedSlot,
  onSlotSelect,
  loading = false,
}: TimeSlotSelectorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const availableSlots = slots.filter((slot) => slot.available);

  if (availableSlots.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No available time slots for this date.</p>
        <p className="mt-2 text-sm text-gray-400">Please select another date.</p>
      </div>
    );
  }

  // Group slots by time of day
  const morningSlots = availableSlots.filter((slot) => {
    const hour = parseInt(slot.startTime.split(':')[0]);
    return hour < 12;
  });

  const afternoonSlots = availableSlots.filter((slot) => {
    const hour = parseInt(slot.startTime.split(':')[0]);
    return hour >= 12 && hour < 17;
  });

  const eveningSlots = availableSlots.filter((slot) => {
    const hour = parseInt(slot.startTime.split(':')[0]);
    return hour >= 17;
  });

  const renderSlotGroup = (title: string, slots: AvailabilitySlot[]) => {
    if (slots.length === 0) return null;

    return (
      <div className="mb-6">
        <h4 className="mb-3 text-sm font-medium text-gray-700">{title}</h4>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {slots.map((slot) => {
            const isSelected =
              selectedSlot &&
              selectedSlot.startTime === slot.startTime &&
              selectedSlot.date === slot.date;

            return (
              <button
                key={`${slot.date}-${slot.startTime}`}
                onClick={() => onSlotSelect(slot)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-primary-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:border-primary-500 hover:bg-primary-50'
                } `}
              >
                {slot.startTime}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Select Time ({availableSlots.length} available)
      </h3>
      {renderSlotGroup('Morning', morningSlots)}
      {renderSlotGroup('Afternoon', afternoonSlots)}
      {renderSlotGroup('Evening', eveningSlots)}
    </div>
  );
}
