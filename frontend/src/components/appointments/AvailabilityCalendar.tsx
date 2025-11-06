'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

/**
 * Availability Calendar Component (T085)
 * Displays a week view calendar for selecting appointment dates
 */
interface AvailabilityCalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  availableDates?: string[]; // ISO date strings
}

export function AvailabilityCalendar({
  selectedDate,
  onDateSelect,
  availableDates = [],
}: AvailabilityCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availableDates.includes(dateStr);
  };

  return (
    <div className="w-full">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousWeek}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Previous Week
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {format(currentWeekStart, 'MMMM yyyy')}
        </h3>
        <button
          onClick={goToNextWeek}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Next Week
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((date) => {
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isAvailable = isDateAvailable(date);
          const isPast = date < new Date();

          return (
            <button
              key={date.toISOString()}
              onClick={() => !isPast && isAvailable && onDateSelect(date)}
              disabled={isPast || !isAvailable}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200'
                }
                ${
                  isAvailable && !isPast
                    ? 'hover:border-primary-300 hover:bg-primary-50 cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
                }
              `}
            >
              <div className="text-xs font-medium text-gray-500 mb-1">
                {format(date, 'EEE')}
              </div>
              <div className="text-lg font-semibold">
                {format(date, 'd')}
              </div>
              {isAvailable && !isPast && (
                <div className="text-xs text-green-600 mt-1">Available</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
