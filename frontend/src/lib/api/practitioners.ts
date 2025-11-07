import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from './client';

/**
 * Practitioner API Hooks (T106)
 * React Query hooks for practitioner management and calendar operations
 */

// Types
export interface Practitioner {
  id: string;
  userId: string;
  tenantId: string;
  fullName: string;
  specialty?: string;
  licenseNumber?: string;
  availableHours?: AvailableHours;
  calendarToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  start: string; // Format: "HH:MM" (24-hour)
  end: string; // Format: "HH:MM" (24-hour)
}

export interface AvailableHours {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface UpdateAvailableHoursDto {
  availableHours: AvailableHours;
}

export interface CalendarTokenResponse {
  calendarToken: string;
  calendarUrl: string;
}

// API Functions
const practitionersApi = {
  getAll: async (): Promise<Practitioner[]> => {
    const response = await apiClient.get('/practitioners');
    return response.data;
  },

  getById: async (id: string): Promise<Practitioner> => {
    const response = await apiClient.get(`/practitioners/${id}`);
    return response.data;
  },

  updateAvailableHours: async (params: {
    id: string;
    data: UpdateAvailableHoursDto;
  }): Promise<Practitioner> => {
    const response = await apiClient.patch(`/practitioners/${params.id}/hours`, params.data);
    return response.data;
  },

  generateCalendarToken: async (id: string): Promise<CalendarTokenResponse> => {
    const response = await apiClient.patch(`/practitioners/${id}/calendar-token`);
    return response.data;
  },
};

// Hooks
export function usePractitioners(options?: UseQueryOptions<Practitioner[]>) {
  return useQuery({
    queryKey: ['practitioners'],
    queryFn: practitionersApi.getAll,
    ...options,
  });
}

export function usePractitioner(id: string, options?: UseQueryOptions<Practitioner>) {
  return useQuery({
    queryKey: ['practitioner', id],
    queryFn: () => practitionersApi.getById(id),
    enabled: !!id,
    ...options,
  });
}

export function useUpdateAvailableHours() {
  return useMutation({
    mutationFn: practitionersApi.updateAvailableHours,
  });
}

export function useGenerateCalendarToken() {
  return useMutation({
    mutationFn: practitionersApi.generateCalendarToken,
  });
}
