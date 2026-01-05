"use client";

import React from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthHeader } from "../AuthHeader";
import { Mail } from "lucide-react";
import { VerifyEmailFormField } from "@/lib/utils/client-enums";

interface VerifyEmailFormProps {
  values: {
    email: string;
    otp: string;
  };
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  handleChange: (field: VerifyEmailFormField) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (field: VerifyEmailFormField) => (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleResend: () => void;
  isLoading: boolean;
  isResending: boolean;
}

export function VerifyEmailForm({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  handleSubmit,
  handleResend,
  isLoading,
  isResending,
}: VerifyEmailFormProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 mb-6 ring-4 ring-emerald-100/50">
          <Mail className="w-8 h-8 text-emerald-600" />
        </div>
        <AuthHeader
          title="Verify Your Email"
          subtitle="Enter the 6-digit code sent to your email address"
        />
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 space-y-6"
        onSubmit={handleSubmit}
      >
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Input
              label="Email Address"
              type="email"
              required
              value={values.email}
              onChange={handleChange(VerifyEmailFormField.Email)}
              onBlur={handleBlur(VerifyEmailFormField.Email)}
              error={touched.email ? (errors.email ?? undefined) : undefined}
              placeholder="your@email.com"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Input
              label="Verification Code"
              type="text"
              required
              maxLength={6}
              value={values.otp}
              onChange={handleChange(VerifyEmailFormField.Otp)}
              onBlur={handleBlur(VerifyEmailFormField.Otp)}
              error={touched.otp ? (errors.otp ?? undefined) : undefined}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono"
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Button
            type="submit"
            disabled={isLoading}
            loading={isLoading}
            className="w-full py-3 text-base font-semibold"
          >
            Verify Email
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="text-center pt-4 border-t border-slate-100"
        >
          <p className="text-sm text-slate-600 mb-2">
            Didn't receive the code?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResending ? "Sending..." : "Resend Code"}
          </button>
        </motion.div>
      </motion.form>
    </>
  );
}
