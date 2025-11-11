'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useNote,
  useNoteByAppointment,
  useCreateNote,
  useUpdateNote,
  useExportPDF,
  CreateNoteDto,
  UpdateNoteDto,
} from '@/lib/api/notes';
import { SoapTemplate, SoapNote } from '@/components/notes/SoapTemplate';
import { AIAssistant } from '@/components/notes/AIAssistant';
import { VersionHistory } from '@/components/notes/VersionHistory';

/**
 * SOAP Note Editor Page (T126, T131)
 * Main page for creating and editing clinical SOAP notes
 * Phase 5: Clinical Documentation with SOAP Notes
 */

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params?.appointmentId as string;

  // State
  const [note, setNote] = useState<SoapNote>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const [currentSection, setCurrentSection] = useState<'subjective' | 'objective' | 'assessment' | 'plan'>('subjective');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // API hooks
  const { data: existingNoteRef } = useNoteByAppointment(appointmentId);
  const { data: existingNote, isLoading: isLoadingNote } = useNote(
    existingNoteRef?.id,
    { enabled: !!existingNoteRef?.id }
  );
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const exportPDFMutation = useExportPDF();

  // Load existing note data
  useEffect(() => {
    if (existingNote) {
      setNote({
        subjective: existingNote.subjective,
        objective: existingNote.objective,
        assessment: existingNote.assessment,
        plan: existingNote.plan,
      });
    }
  }, [existingNote]);

  // Auto-save logic (T131 - optimistic updates)
  useEffect(() => {
    if (!existingNote) return; // Don't auto-save for new notes

    const timeoutId = setTimeout(() => {
      handleSave();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [note, existingNote]);

  const handleNoteChange = (updatedNote: SoapNote) => {
    setNote(updatedNote);
    setSaveStatus('idle');
  };

  const handleSectionFocus = (section: 'subjective' | 'objective' | 'assessment' | 'plan') => {
    setCurrentSection(section);
  };

  const handleAcceptAICompletion = (section: string, completion: string) => {
    setNote((prev) => ({
      ...prev,
      [section]: prev[section as keyof SoapNote]
        ? `${prev[section as keyof SoapNote]}\n\n${completion}`
        : completion,
    }));
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      if (existingNote) {
        // Update existing note (T131 - with optimistic updates)
        const updateData: UpdateNoteDto = {
          subjective: note.subjective,
          objective: note.objective,
          assessment: note.assessment,
          plan: note.plan,
          currentVersion: existingNote.version,
        };

        await updateNoteMutation.mutateAsync({
          id: existingNote.id,
          data: updateData,
        });
      } else {
        // Create new note
        const createData: CreateNoteDto = {
          appointmentId,
          subjective: note.subjective,
          objective: note.objective,
          assessment: note.assessment,
          plan: note.plan,
        };

        await createNoteMutation.mutateAsync(createData);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save note:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!existingNote) return;

    try {
      await exportPDFMutation.mutateAsync(existingNote.id);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Mock patient data (in production, fetch from appointment API)
  const patientName = existingNote?.appointment?.patient?.fullName || 'Patient';
  const appointmentDate = existingNote?.appointment?.startTime || new Date().toISOString();

  const isNewNote = !existingNote;
  const canSave = note.subjective || note.objective || note.assessment || note.plan;

  if (isLoadingNote && existingNoteRef) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
          <p className="mt-4 text-sm text-gray-600">Loading clinical note...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Left: Back button and title */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {isNewNote ? 'New Clinical Note' : 'Edit Clinical Note'}
                </h1>
                <p className="text-sm text-gray-500">
                  SOAP Format • {patientName} • {new Date(appointmentDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-3">
              {/* Save Status Indicator */}
              {saveStatus !== 'idle' && (
                <div className="flex items-center space-x-2 text-sm">
                  {saveStatus === 'saving' && (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
                      <span className="text-gray-600">Saving...</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-green-600">Saved</span>
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <>
                      <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-red-600">Error saving</span>
                    </>
                  )}
                </div>
              )}

              {/* Version History */}
              {existingNote && (
                <VersionHistory
                  noteId={existingNote.id}
                  currentVersion={existingNote.version}
                />
              )}

              {/* Export PDF */}
              {existingNote && (
                <button
                  onClick={handleExportPDF}
                  disabled={exportPDFMutation.isPending}
                  className="inline-flex items-center space-x-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <svg
                    className="h-5 w-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                    />
                  </svg>
                  <span>Export PDF</span>
                </button>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!canSave || isSaving}
                className="inline-flex items-center space-x-2 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-medium text-white hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                <span>{isNewNote ? 'Create Note' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SoapTemplate
          value={note}
          onChange={handleNoteChange}
          onSectionFocus={handleSectionFocus}
        />
      </div>

      {/* AI Assistant */}
      <AIAssistant
        currentSection={currentSection}
        partialNote={note}
        patientName={patientName}
        appointmentDate={appointmentDate}
        onAcceptCompletion={handleAcceptAICompletion}
      />
    </div>
  );
}
