"use client";

import React from "react";
import { motion } from "framer-motion";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { AuthHeader } from "../AuthHeader";
import { ResetPasswordFormField } from "@/lib/utils/client-enums";

interface ResetPasswordFormProps {
  values: {
    newPassword: string;
    confirmPassword: string;
  };
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  handleChange: (field: ResetPasswordFormField) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (field: ResetPasswordFormField) => (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function ResetPasswordForm({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  handleSubmit,
  isLoading,
}: ResetPasswordFormProps) {
  return (
    <>
      <AuthHeader
        title="Set New Password"
        subtitle="Enter your new password below"
      />

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
            <PasswordInput
              label="New Password"
              required
              value={values.newPassword}
              onChange={handleChange(ResetPasswordFormField.NewPassword)}
              onBlur={handleBlur(ResetPasswordFormField.NewPassword)}
              error={touched.newPassword ? (errors.newPassword ?? undefined) : undefined}
              helperText="At least 8 characters with uppercase, lowercase, and number"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <PasswordInput
              label="Confirm New Password"
              required
              value={values.confirmPassword}
              onChange={handleChange(ResetPasswordFormField.ConfirmPassword)}
              onBlur={handleBlur(ResetPasswordFormField.ConfirmPassword)}
              error={touched.confirmPassword ? (errors.confirmPassword ?? undefined) : undefined}
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
            Reset Password
          </Button>
        </motion.div>
      </motion.form>
    </>
  );
}
