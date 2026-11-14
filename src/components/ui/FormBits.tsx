'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Hidden anti-spam fields: honeypot + time the form was opened. */
export function AntiSpamFields() {
  const [startedAt, setStartedAt] = useState('');
  useEffect(() => setStartedAt(String(Date.now())), []);
  return (
    <>
      <input type="hidden" name="startedAt" value={startedAt} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
    </>
  );
}

export function Field({
  id,
  label,
  error,
  optional,
  optionalLabel,
  children,
  className
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-muted">({optionalLabel})</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Consent({
  name = 'consent',
  label,
  error,
  checked,
  onChange
}: {
  name?: string;
  label: string;
  error?: string;
  checked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div>
      <label className={cn('flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-soft')}>
        <input
          type="checkbox"
          name={name}
          value="1"
          required
          checked={checked}
          onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
          aria-invalid={!!error}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-sand-300 text-forest-700 accent-forest-700"
        />
        <span>{label}</span>
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
