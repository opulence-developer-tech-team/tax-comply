import React from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
}

export function Select({ label, error, helperText, className, required, id, children, ...props }: SelectProps) {
  // Generate ID if not provided for proper label-input association
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText && !error ? `${selectId}-helper` : undefined;
  const ariaDescribedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "w-full px-4 py-3 border rounded-lg shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
          "transition-all duration-200",
          "bg-white",
          error 
            ? "border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500" 
            : "border-slate-300 hover:border-slate-400",
          "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
          className
        )}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={ariaDescribedBy}
        aria-required={required ? "true" : undefined}
        {...props}
        required={false}
      >
        {children}
      </select>
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







