import { useMutation, useQuery, UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

/**
 * Clinical Notes API Hooks (T130)
 * React Query hooks for SOAP note management with encryption and AI assistance
 * Phase 5: Clinical Documentation with SOAP Notes
 */

// Types
export interface ClinicalNote {
  id: string;
  appointmentId: string;
  practitionerId: string;
  tenantId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  sharedWithPatient: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  appointment?: {
    id: string;
    startTime: string;
    patient: {
      id: string;
      fullName: string;
    };
    practitioner: {
      id: string;
      fullName: string;
      licenseNumber?: string;
    };
  };
}

export interface EncryptedClinicalNote {
  id: string;
  appointmentId: string;
  practitionerId: string;
  tenantId: string;
  subjectiveEncrypted: string;
  objectiveEncrypted: string;
  assessmentEncrypted: string;
  planEncrypted: string;
  sharedWithPatient: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteDto {
  appointmentId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  sharedWithPatient?: boolean;
}

export interface UpdateNoteDto {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  sharedWithPatient?: boolean;
  currentVersion?: number; // For optimistic locking
}

export interface AICompleteDto {
  partialNote: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    soapSection: 'subjective' | 'objective' | 'assessment' | 'plan';
  };
  context: {
    patientName: string;
    appointmentDate: string;
  };
}

export interface AICompletionResponse {
  completion: string;
  soapSection: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  estimatedCost: number;
  phiDeidentified: boolean;
  hipaaCompliant: boolean;
  zeroRetention: boolean;
  timestamp: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: string;
  metadata: any;
  user: {
    email: string;
    role: string;
  };
}

// API Functions
const notesApi = {
  /**
   * Create a new clinical note
   */
  createNote: async (data: CreateNoteDto): Promise<EncryptedClinicalNote> => {
    const response = await apiClient.post('/notes', data);
    return response.data;
  },

  /**
   * Get a clinical note by ID (returns decrypted)
   */
  getNote: async (id: string): Promise<ClinicalNote> => {
    const response = await apiClient.get(`/notes/${id}`);
    return response.data;
  },

  /**
   * Get clinical note by appointment ID
   */
  getNoteByAppointment: async (appointmentId: string): Promise<{ id: string; version: number } | null> => {
    const response = await apiClient.get(`/notes/appointment/${appointmentId}`);
    return response.data;
  },

  /**
   * Update an existing clinical note
   */
  updateNote: async (params: {
    id: string;
    data: UpdateNoteDto;
  }): Promise<EncryptedClinicalNote> => {
    const response = await apiClient.patch(`/notes/${params.id}`, params.data);
    return response.data;
  },

  /**
   * Generate AI completion for SOAP section
   */
  aiComplete: async (data: AICompleteDto): Promise<AICompletionResponse> => {
    const response = await apiClient.post('/notes/ai-complete', data);
    return response.data;
  },

  /**
   * Export note as PDF
   */
  exportPDF: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/notes/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get audit history for a clinical note
   */
  getAuditHistory: async (id: string): Promise<{ auditHistory: AuditEvent[] }> => {
    const response = await apiClient.get(`/notes/${id}/audit`);
    return response.data;
  },

  /**
   * Delete a clinical note (admin only)
   */
  deleteNote: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/notes/${id}`);
    return response.data;
  },
};

// React Query Hooks

/**
 * Hook to get a clinical note by ID
 */
export function useNote(
  id: string | undefined,
  options?: UseQueryOptions<ClinicalNote>
) {
  return useQuery({
    queryKey: ['note', id],
    queryFn: () => notesApi.getNote(id!),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to get clinical note by appointment ID
 */
export function useNoteByAppointment(
  appointmentId: string | undefined,
  options?: UseQueryOptions<{ id: string; version: number } | null>
) {
  return useQuery({
    queryKey: ['note', 'appointment', appointmentId],
    queryFn: () => notesApi.getNoteByAppointment(appointmentId!),
    enabled: !!appointmentId,
    ...options,
  });
}

/**
 * Hook to create a new clinical note
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notesApi.createNote,
    onSuccess: (data) => {
      // Invalidate appointment note query
      queryClient.invalidateQueries({ queryKey: ['note', 'appointment', data.appointmentId] });
    },
  });
}

/**
 * Hook to update a clinical note with optimistic updates (T131)
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notesApi.updateNote,
    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['note', id] });

      // Snapshot previous value
      const previousNote = queryClient.getQueryData<ClinicalNote>(['note', id]);

      // Optimistically update to the new value
      if (previousNote) {
        queryClient.setQueryData<ClinicalNote>(['note', id], {
          ...previousNote,
          ...data,
          updatedAt: new Date().toISOString(),
          version: previousNote.version + 1,
        });
      }

      return { previousNote };
    },
    // If mutation fails, use the context returned from onMutate to roll back
    onError: (err, { id }, context) => {
      if (context?.previousNote) {
        queryClient.setQueryData(['note', id], context.previousNote);
      }
    },
    // Always refetch after error or success
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['note', id] });
    },
  });
}

/**
 * Hook to generate AI completion for SOAP section
 */
export function useAIComplete() {
  return useMutation({
    mutationFn: notesApi.aiComplete,
  });
}

/**
 * Hook to export note as PDF
 */
export function useExportPDF() {
  return useMutation({
    mutationFn: notesApi.exportPDF,
    onSuccess: (blob, noteId) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `clinical-note-${noteId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}

/**
 * Hook to get audit history for a note
 */
export function useNoteAuditHistory(
  id: string | undefined,
  options?: UseQueryOptions<{ auditHistory: AuditEvent[] }>
) {
  return useQuery({
    queryKey: ['note', id, 'audit'],
    queryFn: () => notesApi.getAuditHistory(id!),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to delete a clinical note
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notesApi.deleteNote,
    onSuccess: () => {
      // Invalidate all note queries
      queryClient.invalidateQueries({ queryKey: ['note'] });
    },
  });
}
