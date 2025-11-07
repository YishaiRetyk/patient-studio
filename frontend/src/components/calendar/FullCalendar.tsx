'use client';

import { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';

/**
 * Full Calendar Component (T103)
 * Displays a month view calendar with appointments for practitioners
 */

export interface CalendarAppointment {
  id: string;
  patientName: string;
  startTime: string; // ISO datetime
  endTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

interface FullCalendarProps {
  appointments: CalendarAppointment[];
  onDateClick?: (date: Date) => void;
  onAppointmentClick?: (appointment: CalendarAppointment) => void;
}

export function FullCalendar({
  appointments,
  onDateClick,
  onAppointmentClick,
}: FullCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const goToPreviousMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const getAppointmentsForDate = (date: Date): CalendarAppointment[] => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime);
      return isSameDay(aptDate, date);
    });
  };

  // Generate calendar days
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={goToPreviousMonth}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={goToToday}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="border-r border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-700 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayAppointments = getAppointmentsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] border-b border-r border-gray-200 p-2 ${
                  idx % 7 === 6 ? 'border-r-0' : ''
                } ${idx >= days.length - 7 ? 'border-b-0' : ''} ${
                  !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } ${onDateClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => onDateClick?.(day)}
              >
                <div
                  className={`mb-1 text-sm font-medium ${
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  } ${
                    isCurrentDay
                      ? 'flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white'
                      : ''
                  }`}
                >
                  {format(day, 'd')}
                </div>

                {/* Appointments list */}
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((apt) => {
                    const statusColors = {
                      SCHEDULED: 'bg-blue-100 text-blue-800 border-blue-200',
                      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
                      CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',
                      NO_SHOW: 'bg-red-100 text-red-800 border-red-200',
                    };

                    return (
                      <button
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick?.(apt);
                        }}
                        className={`w-full truncate rounded border px-2 py-1 text-left text-xs font-medium ${
                          statusColors[apt.status]
                        } hover:opacity-80`}
                      >
                        <div className="truncate">
                          {format(new Date(apt.startTime), 'HH:mm')} - {apt.patientName}
                        </div>
                      </button>
                    );
                  })}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-blue-200 bg-blue-100"></div>
          <span className="text-gray-700">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-green-200 bg-green-100"></div>
          <span className="text-gray-700">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-gray-200 bg-gray-100"></div>
          <span className="text-gray-700">Cancelled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-red-200 bg-red-100"></div>
          <span className="text-gray-700">No Show</span>
        </div>
      </div>
    </div>
  );
}
