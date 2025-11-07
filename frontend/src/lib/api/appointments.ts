import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from './client';

/**
 * Appointment API Hooks (T088)
 * React Query hooks for appointment booking and availability
 */

// Types
export interface Appointment {
  id: string;
  patientId: string;
  practitionerId: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  version: number;
  createdAt: string;
}

export interface AvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface CreateAppointmentDto {
  patientId: string;
  practitionerId: string;
  startTime: string;
  endTime: string;
}

// API Functions
const appointmentsApi = {
  getAvailability: async (params: {
    practitionerId: string;
    startDate: string;
    endDate: string;
  }): Promise<{ availability: AvailabilitySlot[] }> => {
    const response = await apiClient.get('/appointments/availability', { params });
    return response.data;
  },

  createAppointment: async (data: CreateAppointmentDto): Promise<Appointment> => {
    const response = await apiClient.post('/appointments', data);
    return response.data;
  },

  updateAppointment: async (params: {
    id: string;
    data: {
      startTime?: string;
      endTime?: string;
      status?: string;
      currentVersion: number;
    };
  }): Promise<Appointment> => {
    const response = await apiClient.patch(`/appointments/${params.id}`, params.data);
    return response.data;
  },

  cancelAppointment: async (params: {
    id: string;
    cancellationReason?: string;
  }): Promise<{ message: string; appointment: Appointment }> => {
    const response = await apiClient.delete(`/appointments/${params.id}`, {
      data: { cancellationReason: params.cancellationReason },
    });
    return response.data;
  },
};

// Hooks
export function useAvailability(
  params: {
    practitionerId: string;
    startDate: string;
    endDate: string;
  },
  options?: UseQueryOptions<{ availability: AvailabilitySlot[] }>
) {
  return useQuery({
    queryKey: ['availability', params.practitionerId, params.startDate, params.endDate],
    queryFn: () => appointmentsApi.getAvailability(params),
    enabled: !!params.practitionerId && !!params.startDate && !!params.endDate,
    ...options,
  });
}

export function useCreateAppointment() {
  return useMutation({
    mutationFn: appointmentsApi.createAppointment,
  });
}

export function useUpdateAppointment() {
  return useMutation({
    mutationFn: appointmentsApi.updateAppointment,
  });
}

export function useCancelAppointment() {
  return useMutation({
    mutationFn: appointmentsApi.cancelAppointment,
  });
}
