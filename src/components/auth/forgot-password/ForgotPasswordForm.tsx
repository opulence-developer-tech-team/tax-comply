"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthHeader } from "../AuthHeader";
import { Mail, ArrowLeft } from "lucide-react";

interface ForgotPasswordFormProps {
  values: {
    email: string;
  };
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  handleChange: (field: "email") => (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (field: "email") => (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function ForgotPasswordForm({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  handleSubmit,
  isLoading,
}: ForgotPasswordFormProps) {
  return (
    <>
      <AuthHeader
        title="Reset Password"
        subtitle="Enter your email address and we'll send you a link to reset your password"
      />

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 space-y-6"
        onSubmit={handleSubmit}
      >
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
            onChange={handleChange("email")}
            onBlur={handleBlur("email")}
            error={touched.email && errors.email ? errors.email : undefined}
            placeholder="your@email.com"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Button
            type="submit"
            disabled={isLoading}
            loading={isLoading}
            className="w-full py-3 text-base font-semibold"
          >
            Send Reset Link
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center pt-4 border-t border-slate-100"
        >
          <Link
            href="/sign-in"
            className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Link>
        </motion.div>
      </motion.form>
    </>
  );
}
