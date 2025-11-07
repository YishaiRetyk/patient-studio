'use client';

import { useState } from 'react';
import { AvailableHours, TimeSlot } from '@/lib/api/practitioners';

/**
 * Availability Settings Modal Component (T104)
 * Allows practitioners to configure their available hours
 */

interface AvailabilitySettingsProps {
  initialHours?: AvailableHours;
  onSave: (hours: AvailableHours) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

export function AvailabilitySettings({
  initialHours = {},
  onSave,
  onCancel,
  isLoading = false,
}: AvailabilitySettingsProps) {
  const [hours, setHours] = useState<AvailableHours>(initialHours);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addTimeSlot = (day: keyof AvailableHours) => {
    const currentSlots = hours[day] || [];
    setHours({
      ...hours,
      [day]: [...currentSlots, { start: '09:00', end: '17:00' }],
    });
  };

  const removeTimeSlot = (day: keyof AvailableHours, index: number) => {
    const currentSlots = hours[day] || [];
    setHours({
      ...hours,
      [day]: currentSlots.filter((_, i) => i !== index),
    });
  };

  const updateTimeSlot = (
    day: keyof AvailableHours,
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const currentSlots = hours[day] || [];
    const updatedSlots = [...currentSlots];
    updatedSlots[index] = { ...updatedSlots[index], [field]: value };
    setHours({
      ...hours,
      [day]: updatedSlots,
    });
  };

  const validateHours = (): boolean => {
    const newErrors: Record<string, string> = {};

    Object.entries(hours).forEach(([day, slots]) => {
      if (!slots || slots.length === 0) return;

      slots.forEach((slot, idx) => {
        const key = `${day}-${idx}`;

        // Validate time format
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot.start)) {
          newErrors[`${key}-start`] = 'Invalid time format (use HH:MM)';
        }
        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(slot.end)) {
          newErrors[`${key}-end`] = 'Invalid time format (use HH:MM)';
        }

        // Validate end > start
        const [startH, startM] = slot.start.split(':').map(Number);
        const [endH, endM] = slot.end.split(':').map(Number);
        if (endH * 60 + endM <= startH * 60 + startM) {
          newErrors[key] = 'End time must be after start time';
        }

        // Check for overlaps
        slots.forEach((otherSlot, otherIdx) => {
          if (idx === otherIdx) return;

          const [os1, oe1] = [slot.start, slot.end];
          const [os2, oe2] = [otherSlot.start, otherSlot.end];

          const overlap =
            (os1 >= os2 && os1 < oe2) ||
            (oe1 > os2 && oe1 <= oe2) ||
            (os1 <= os2 && oe1 >= oe2);

          if (overlap) {
            newErrors[key] = 'Time slots overlap';
          }
        });
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateHours()) {
      onSave(hours);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Configure Available Hours
        </h2>

        <div className="space-y-6">
          {DAYS_OF_WEEK.map(({ key, label }) => (
            <div key={key} className="border-b border-gray-200 pb-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
                <button
                  onClick={() => addTimeSlot(key)}
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  type="button"
                >
                  + Add Time Slot
                </button>
              </div>

              {hours[key] && hours[key]!.length > 0 ? (
                <div className="space-y-2">
                  {hours[key]!.map((slot, idx) => {
                    const errorKey = `${key}-${idx}`;
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <label className="mb-1 block text-xs text-gray-600">
                                Start Time
                              </label>
                              <input
                                type="time"
                                value={slot.start}
                                onChange={(e) =>
                                  updateTimeSlot(key, idx, 'start', e.target.value)
                                }
                                className="rounded-md border border-gray-300 px-3 py-2"
                              />
                            </div>
                            <div className="pt-6">-</div>
                            <div>
                              <label className="mb-1 block text-xs text-gray-600">
                                End Time
                              </label>
                              <input
                                type="time"
                                value={slot.end}
                                onChange={(e) =>
                                  updateTimeSlot(key, idx, 'end', e.target.value)
                                }
                                className="rounded-md border border-gray-300 px-3 py-2"
                              />
                            </div>
                          </div>
                          {errors[errorKey] && (
                            <p className="mt-1 text-sm text-red-600">
                              {errors[errorKey]}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeTimeSlot(key, idx)}
                          className="mt-6 rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hours set for this day</p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            type="button"
          >
            {isLoading ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      </div>
    </div>
  );
}
