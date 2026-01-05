"use client";

import { NIGERIAN_STATES } from "@/lib/constants/nigeria";
import { Select } from "./Select";

export interface StateSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
  name?: string;
  id?: string;
}

/**
 * StateSelect Component
 * 
 * A reusable dropdown component for selecting Nigerian states.
 * Ensures consistency across the application and validates against
 * the official list of Nigerian states.
 */
export function StateSelect({
  label,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  placeholder = "Select a state",
  disabled = false,
  helperText,
  name,
  id,
}: StateSelectProps) {
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
      required={required}
      disabled={disabled}
      helperText={helperText}
      name={name}
      id={id}
    >
      <option value="">{placeholder}</option>
      {NIGERIAN_STATES.map((state) => (
        <option key={state} value={state}>
          {state}
        </option>
      ))}
    </Select>
  );
}

