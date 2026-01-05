import { useState, useCallback } from "react";

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationRules?: ValidationRules
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validate = useCallback(
    (fieldName?: keyof T): boolean => {
      if (!validationRules) return true;

      const fieldsToValidate = fieldName ? [fieldName] : Object.keys(validationRules);
      const newErrors: Partial<Record<keyof T, string>> = {};

      fieldsToValidate.forEach((field) => {
        const rule = validationRules[field as string];
        const value = values[field as keyof T];

        if (rule) {
          if (rule.required && (!value || (typeof value === "string" && !value.trim()))) {
            newErrors[field as keyof T] = `${String(field)} is required`;
          } else if (rule.minLength && typeof value === "string" && value.length < rule.minLength) {
            newErrors[field as keyof T] = `${String(field)} must be at least ${rule.minLength} characters`;
          } else if (rule.maxLength && typeof value === "string" && value.length > rule.maxLength) {
            newErrors[field as keyof T] = `${String(field)} must be at most ${rule.maxLength} characters`;
          } else if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
            newErrors[field as keyof T] = `${String(field)} format is invalid`;
          } else if (rule.custom) {
            const customError = rule.custom(value);
            if (customError) {
              newErrors[field as keyof T] = customError;
            }
          }
        }
      });

      setErrors((prev) => ({ ...prev, ...newErrors }));
      return Object.keys(newErrors).length === 0;
    },
    [values, validationRules]
  );

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // If field has been touched, validate immediately to clear errors as user types
    if (touched[field]) {
      // Validate and clear error if validation passes
      if (validationRules && validationRules[field as string]) {
        const rule = validationRules[field as string];
        let hasError = false;
        
        if (rule.required && (!value || (typeof value === "string" && !value.trim()))) {
          hasError = true;
        } else if (rule.minLength && typeof value === "string" && value.length < rule.minLength) {
          hasError = true;
        } else if (rule.maxLength && typeof value === "string" && value.length > rule.maxLength) {
          hasError = true;
        } else if (rule.pattern && typeof value === "string" && !rule.pattern.test(value)) {
          hasError = true;
        } else if (rule.custom) {
          const customError = rule.custom(value);
          if (customError) {
            hasError = true;
          }
        }
        
        // Clear error if validation passes
        if (!hasError) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        } else {
          // Re-validate to show updated error message
          validate(field);
        }
      } else {
        // No validation rules, clear any existing error
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  }, [touched, validate, validationRules]);

  const setFieldTouched = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validate(field);
  }, [validate]);

  const handleChange = useCallback(
    (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
      setValue(field, value);
    },
    [setValue]
  );

  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setFieldTouched(field);
    },
    [setFieldTouched]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setAllValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newValues }));
  }, []);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setValues: setAllValues,
    handleChange,
    handleBlur,
    setFieldTouched,
    validate,
    reset,
  };
}





















