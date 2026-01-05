"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  helperText?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export function PasswordInput({
  label,
  error,
  helperText,
  value,
  onChange,
  onBlur,
  className,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Input
        label={label}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        error={error}
        helperText={helperText}
        className={`pr-12 ${className || ""}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/80 active:bg-emerald-100/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-1 group backdrop-blur-sm z-10"
        style={{
          // Position: label (text-sm font-medium ≈ 1.25rem) + label margin-bottom (mb-2 = 0.5rem) + input top padding (py-3 = 0.75rem) + half input line-height (≈0.75rem) = center of input field
          // Then translateY(-50%) centers the button itself
          top: label ? "calc(1.25rem + 0.6rem + 0.75rem + 0.75rem)" : "1.5rem",
          transform: "translateY(-50%)",
        }}
        aria-label={showPassword ? "Hide password" : "Show password"}
        tabIndex={0}
      >
        <motion.div
          initial={false}
          animate={{ rotate: showPassword ? 180 : 0, scale: 1 }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          {showPassword ? (
            <EyeOff className="w-[18px] h-[18px] transition-colors duration-200 group-hover:text-emerald-600" strokeWidth={2.5} />
          ) : (
            <Eye className="w-[18px] h-[18px] transition-colors duration-200 group-hover:text-emerald-600" strokeWidth={2.5} />
          )}
        </motion.div>
      </button>
    </div>
  );
}

