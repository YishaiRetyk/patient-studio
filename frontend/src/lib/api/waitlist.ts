import { useMutation, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from './client';

/**
 * Waitlist API Hooks (T106)
 * React Query hooks for waitlist management
 */

// Types
export interface WaitlistEntry {
  id: string;
  tenantId: string;
  patientId: string;
  practitionerId?: string;
  desiredDateStart: string;
  desiredDateEnd: string;
  status: 'ACTIVE' | 'CLAIMED' | 'EXPIRED';
  createdAt: string;
  notifiedAt?: string;
  claimedAt?: string;
}

export interface CreateWaitlistEntryDto {
  patientId: string;
  practitionerId?: string;
  desiredDateStart: string;
  desiredDateEnd: string;
}

// API Functions
const waitlistApi = {
  addToWaitlist: async (data: CreateWaitlistEntryDto): Promise<WaitlistEntry> => {
    const response = await apiClient.post('/waitlist', data);
    return response.data;
  },

  getPatientWaitlistEntries: async (patientId: string): Promise<WaitlistEntry[]> => {
    const response = await apiClient.get(`/waitlist/patient/${patientId}`);
    return response.data;
  },

  getPractitionerWaitlistEntries: async (practitionerId: string): Promise<WaitlistEntry[]> => {
    const response = await apiClient.get(`/waitlist/practitioner/${practitionerId}`);
    return response.data;
  },

  claimWaitlistSlot: async (id: string): Promise<{ message: string; entry: WaitlistEntry }> => {
    const response = await apiClient.patch(`/waitlist/${id}/claim`);
    return response.data;
  },

  removeFromWaitlist: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/waitlist/${id}`);
    return response.data;
  },
};

// Hooks
export function useAddToWaitlist() {
  return useMutation({
    mutationFn: waitlistApi.addToWaitlist,
  });
}

export function usePatientWaitlistEntries(
  patientId: string,
  options?: UseQueryOptions<WaitlistEntry[]>
) {
  return useQuery({
    queryKey: ['waitlist', 'patient', patientId],
    queryFn: () => waitlistApi.getPatientWaitlistEntries(patientId),
    enabled: !!patientId,
    ...options,
  });
}

export function usePractitionerWaitlistEntries(
  practitionerId: string,
  options?: UseQueryOptions<WaitlistEntry[]>
) {
  return useQuery({
    queryKey: ['waitlist', 'practitioner', practitionerId],
    queryFn: () => waitlistApi.getPractitionerWaitlistEntries(practitionerId),
    enabled: !!practitionerId,
    ...options,
  });
}

export function useClaimWaitlistSlot() {
  return useMutation({
    mutationFn: waitlistApi.claimWaitlistSlot,
  });
}

export function useRemoveFromWaitlist() {
  return useMutation({
    mutationFn: waitlistApi.removeFromWaitlist,
  });
}
