import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ 
  label, 
  error, 
  helperText, 
  className, 
  required, 
  id,
  ...props 
}: InputProps) {
  // Generate ID if not provided for proper label-input association
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText && !error ? `${inputId}-helper` : undefined;
  const ariaDescribedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full px-4 py-3 border rounded-lg shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
          "transition-all duration-200",
          "placeholder:text-slate-400 placeholder:text-sm",
          error 
            ? "border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500" 
            : "border-slate-300 bg-white hover:border-slate-400",
          "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
          className
        )}
        // Don't override required - let browser handle it for accessibility
        // Don't override autoComplete - critical for password managers
        aria-invalid={error ? "true" : undefined}
        aria-describedby={ariaDescribedBy}
        aria-required={required ? "true" : undefined}
        {...props}
      />
      {error && (
        <p 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-1.5 text-sm text-red-600 font-medium flex items-center"
        >
          <span className="mr-1" aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p 
          id={helperId}
          className="mt-1.5 text-xs text-slate-500 line-clamp-2"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

