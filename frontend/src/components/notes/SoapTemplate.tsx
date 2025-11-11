'use client';

import React from 'react';

/**
 * SOAP Template Component (T127)
 * Structured editor for Subjective, Objective, Assessment, and Plan sections
 * Phase 5: Clinical Documentation with SOAP Notes
 */

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface SoapTemplateProps {
  value: SoapNote;
  onChange: (note: SoapNote) => void;
  readOnly?: boolean;
  onSectionFocus?: (section: 'subjective' | 'objective' | 'assessment' | 'plan') => void;
  className?: string;
}

const soapSections = [
  {
    key: 'subjective' as const,
    label: 'Subjective',
    description: 'Patient-reported symptoms, concerns, and feelings',
    placeholder: 'Document what the patient reports about their condition, symptoms, and concerns...',
    color: 'border-blue-300 focus:border-blue-500',
  },
  {
    key: 'objective' as const,
    label: 'Objective',
    description: 'Observable findings and clinical observations',
    placeholder: 'Document your clinical observations, measurements, and examination findings...',
    color: 'border-green-300 focus:border-green-500',
  },
  {
    key: 'assessment' as const,
    label: 'Assessment',
    description: 'Clinical impression and diagnosis',
    placeholder: 'Document your professional assessment, diagnosis, and clinical impressions...',
    color: 'border-yellow-300 focus:border-yellow-500',
  },
  {
    key: 'plan' as const,
    label: 'Plan',
    description: 'Treatment plan and follow-up',
    placeholder: 'Document your treatment plan, recommendations, and follow-up instructions...',
    color: 'border-purple-300 focus:border-purple-500',
  },
] as const;

export function SoapTemplate({
  value,
  onChange,
  readOnly = false,
  onSectionFocus,
  className = '',
}: SoapTemplateProps) {
  const handleChange = (
    section: 'subjective' | 'objective' | 'assessment' | 'plan',
    content: string
  ) => {
    onChange({
      ...value,
      [section]: content,
    });
  };

  const handleFocus = (section: 'subjective' | 'objective' | 'assessment' | 'plan') => {
    if (onSectionFocus) {
      onSectionFocus(section);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {soapSections.map((section) => (
        <div key={section.key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {/* Section Header */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{section.label}</h3>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {section.key}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{section.description}</p>
          </div>

          {/* Section Content */}
          <div className="relative">
            <textarea
              id={`soap-${section.key}`}
              name={section.key}
              value={value[section.key]}
              onChange={(e) => handleChange(section.key, e.target.value)}
              onFocus={() => handleFocus(section.key)}
              readOnly={readOnly}
              placeholder={readOnly ? '' : section.placeholder}
              rows={6}
              maxLength={10000}
              className={`
                w-full rounded-md border-2 ${section.color} bg-white px-4 py-3
                text-sm text-gray-900 placeholder-gray-400
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500
                ${readOnly ? 'cursor-default bg-gray-50' : ''}
              `}
              disabled={readOnly}
            />

            {/* Character count */}
            {!readOnly && (
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {value[section.key].length} / 10,000 characters
                </span>
                {value[section.key].length > 9500 && (
                  <span className="text-amber-600 font-medium">
                    Approaching character limit
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* HIPAA Notice */}
      <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">HIPAA Compliance Notice</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                All clinical notes are encrypted at rest and in transit. PHI is automatically de-identified
                before AI assistance. Access to this information is logged for audit purposes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Read-only SOAP Note Display Component
 * For viewing completed notes
 */
export interface SoapDisplayProps {
  note: SoapNote;
  className?: string;
}

export function SoapDisplay({ note, className = '' }: SoapDisplayProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {soapSections.map((section) => (
        <div key={section.key} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
            {section.label}
          </h3>
          <div className="text-sm text-gray-900 whitespace-pre-wrap">
            {note[section.key] || <span className="text-gray-400 italic">No content</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
