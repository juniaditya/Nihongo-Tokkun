import React, { forwardRef } from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Slot for a right-side action (e.g. show/hide password toggle) */
  rightAction?: React.ReactNode;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, hint, rightAction, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground/90"
        >
          {label}
        </label>

        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            className={[
              'w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/70 focus:border-primary-500/50',
              'transition-all duration-200',
              error
                ? 'border-red-500/60 focus:ring-red-500/40'
                : 'border-white/10 hover:border-white/20',
              rightAction ? 'pr-11' : '',
              className ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...rest}
          />

          {rightAction && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {rightAction}
            </div>
          )}
        </div>

        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-red-400"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

AuthInput.displayName = 'AuthInput';
