// ---------------------------------------------------------------------------
// FormFields.tsx — reusable, accessible form pieces.
// Writing them once means every form in the app is accessible the same way.
// ---------------------------------------------------------------------------
import { forwardRef } from 'react';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange(value: string): void;
  hint?: string;
  error?: string;
  type?: 'text' | 'tel' | 'date' | 'time';
  autoComplete?: string;
}

/** A labeled box that shows a hint above and an error message below. */
export function TextField({ id, label, value, onChange, hint, error, type = 'text', autoComplete }: TextFieldProps) {
  // aria-describedby links the box to its hint and error text, so a screen
  // reader reads them aloud when the user lands on the box.
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
      />
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

/**
 * The red box at the top of a form listing every problem.
 * forwardRef lets the form move keyboard/screen-reader focus onto it.
 */
export const ErrorSummary = forwardRef<HTMLDivElement, { errors: string[] }>(
  function ErrorSummary({ errors }, ref) {
    if (errors.length === 0) return null;
    return (
      <div className="error-summary" role="alert" tabIndex={-1} ref={ref}>
        <p><strong>Please fix these:</strong></p>
        <ul>
          {errors.map((message) => <li key={message}>{message}</li>)}
        </ul>
      </div>
    );
  },
);
