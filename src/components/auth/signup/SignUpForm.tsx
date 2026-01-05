"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { AuthHeader } from "../AuthHeader";
import { AccountType } from "@/lib/utils/account-type";
import { SignUpFormField, AlertVariant } from "@/lib/utils/client-enums";

interface SignUpFormProps {
  values: {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    accountType: AccountType;
    referralId?: string;
  };
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  handleChange: (field: SignUpFormField) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleBlur: (field: SignUpFormField) => (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isValid: boolean;
  error: string | null;
  onClearError?: () => void;
}

export function SignUpForm({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  handleSubmit,
  isLoading,
  isValid,
  error,
  onClearError,
}: SignUpFormProps) {
  return (
    <>
      <AuthHeader
        title="Create your account"
        subtitle="Start managing your tax compliance today"
      />

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-6 space-y-4"
        onSubmit={handleSubmit}
      >
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-2"
          >
            <Alert variant={AlertVariant.Error} onClose={onClearError}>
              <p className="font-medium">{error}</p>
            </Alert>
          </motion.div>
        )}

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <label htmlFor="account-type" className="block text-sm font-semibold text-slate-800 mb-3">
              Account Type <span className="text-red-500" aria-label="required">*</span>
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  const syntheticEvent = {
                    target: { value: AccountType.Company, name: "accountType" },
                  } as React.ChangeEvent<HTMLSelectElement>;
                  handleChange(SignUpFormField.AccountType)(syntheticEvent);
                }}
                className={`group w-full p-5 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden ${
                  values.accountType === AccountType.Company
                    ? "bg-gradient-to-br from-emerald-50 via-green-50/80 to-emerald-50 border-emerald-500/60 shadow-lg shadow-emerald-100/50 ring-2 ring-emerald-200/50"
                    : "bg-white border-slate-200 hover:border-emerald-300/40 hover:bg-gradient-to-br hover:from-emerald-50/30 hover:to-white hover:shadow-md"
                }`}
              >
                {values.accountType === AccountType.Company && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none"></div>
                )}
                <div className="flex items-start gap-4 relative z-10">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    values.accountType === AccountType.Company
                      ? "border-emerald-700 bg-emerald-700 shadow-md shadow-emerald-500/30"
                      : "border-slate-300 group-hover:border-emerald-400"
                  }`}>
                    {values.accountType === AccountType.Company && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-lg mb-2 ${
                      values.accountType === AccountType.Company ? "text-emerald-900" : "text-slate-900"
                    }`}>
                      Company Account
                    </p>
                    <p className={`text-sm leading-relaxed ${
                      values.accountType === AccountType.Company ? "text-emerald-800/90" : "text-slate-600"
                    }`}>
                      For companies, partnerships, and organizations. Track VAT, WHT, CIT (Company Income Tax), 
                      manage invoices, expenses, employees, payroll, and PAYE remittances. Perfect if you run a 
                      registered company or organization that employs staff.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const syntheticEvent = {
                    target: { value: AccountType.Business, name: "accountType" },
                  } as React.ChangeEvent<HTMLSelectElement>;
                  handleChange(SignUpFormField.AccountType)(syntheticEvent);
                }}
                className={`group w-full p-5 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden ${
                  values.accountType === AccountType.Business
                    ? "bg-gradient-to-br from-emerald-50 via-green-50/80 to-emerald-50 border-emerald-500/60 shadow-lg shadow-emerald-100/50 ring-2 ring-emerald-200/50"
                    : "bg-white border-slate-200 hover:border-emerald-300/40 hover:bg-gradient-to-br hover:from-emerald-50/30 hover:to-white hover:shadow-md"
                }`}
              >
                {values.accountType === AccountType.Business && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none"></div>
                )}
                <div className="flex items-start gap-4 relative z-10">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    values.accountType === AccountType.Business
                      ? "border-emerald-700 bg-emerald-700 shadow-md shadow-emerald-500/30"
                      : "border-slate-300 group-hover:border-emerald-400"
                  }`}>
                    {values.accountType === AccountType.Business && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-lg mb-2 ${
                      values.accountType === AccountType.Business ? "text-emerald-900" : "text-slate-900"
                    }`}>
                      Business Account (Sole Proprietorship)
                    </p>
                    <p className={`text-sm leading-relaxed ${
                      values.accountType === AccountType.Business ? "text-emerald-800/90" : "text-slate-600"
                    }`}>
                      For sole proprietorships and small businesses. Track VAT, WHT, PIT (Personal Income Tax), 
                      manage invoices, expenses, employees, payroll, and compliance. Perfect if you run a business 
                      as a sole proprietor or small business owner.
                    </p>
                  </div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const syntheticEvent = {
                    target: { value: AccountType.Individual, name: "accountType" },
                  } as React.ChangeEvent<HTMLSelectElement>;
                  handleChange(SignUpFormField.AccountType)(syntheticEvent);
                }}
                className={`group w-full p-5 rounded-xl border-2 transition-all duration-300 text-left relative overflow-hidden ${
                  values.accountType === AccountType.Individual
                    ? "bg-gradient-to-br from-emerald-50 via-green-50/80 to-emerald-50 border-emerald-500/60 shadow-lg shadow-emerald-100/50 ring-2 ring-emerald-200/50"
                    : "bg-white border-slate-200 hover:border-emerald-300/40 hover:bg-gradient-to-br hover:from-emerald-50/30 hover:to-white hover:shadow-md"
                }`}
              >
                {values.accountType === AccountType.Individual && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none"></div>
                )}
                <div className="flex items-start gap-4 relative z-10">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    values.accountType === AccountType.Individual
                      ? "border-emerald-700 bg-emerald-700 shadow-md shadow-emerald-500/30"
                      : "border-slate-300 group-hover:border-emerald-400"
                  }`}>
                    {values.accountType === AccountType.Individual && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-lg mb-2 ${
                      values.accountType === AccountType.Individual ? "text-emerald-900" : "text-slate-900"
                    }`}>
                      Individual Account
                    </p>
                    <p className={`text-sm leading-relaxed ${
                      values.accountType === AccountType.Individual ? "text-emerald-800/90" : "text-slate-600"
                    }`}>
                      For personal tax management. Track your personal income, expenses, and PIT (Personal Income Tax). 
                      Perfect if you're an employee, 
                      freelancer, or self-employed person managing your personal taxes.
                    </p>
                  </div>
                </div>
              </button>
            </div>
            <input
              type="hidden"
              id="account-type"
              name="accountType"
              value={values.accountType}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Input
              label="First Name"
              type="text"
              required
              placeholder="John"
              value={values.firstName}
              onChange={handleChange(SignUpFormField.FirstName)}
              onBlur={handleBlur(SignUpFormField.FirstName)}
              error={touched.firstName ? (errors.firstName ?? undefined) : undefined}
              autoComplete="given-name"
              name="firstName"
            />
            <Input
              label="Last Name"
              type="text"
              required
              placeholder="Doe"
              value={values.lastName}
              onChange={handleChange(SignUpFormField.LastName)}
              onBlur={handleBlur(SignUpFormField.LastName)}
              error={touched.lastName ? (errors.lastName ?? undefined) : undefined}
              autoComplete="family-name"
              name="lastName"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <Input
              label="Email Address"
              type="email"
              required
              placeholder="you@example.com"
              value={values.email}
              onChange={handleChange(SignUpFormField.Email)}
              onBlur={handleBlur(SignUpFormField.Email)}
              error={touched.email ? (errors.email ?? undefined) : undefined}
              helperText="We'll send a verification code to this email"
              autoComplete="email"
              name="email"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+234 800 000 0000"
              value={values.phoneNumber}
              onChange={handleChange(SignUpFormField.PhoneNumber)}
              onBlur={handleBlur(SignUpFormField.PhoneNumber)}
              error={touched.phoneNumber ? (errors.phoneNumber ?? undefined) : undefined}
              helperText="Optional - Include country code (e.g., +234)"
              autoComplete="tel"
              name="phoneNumber"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <PasswordInput
              label="Password"
              required
              placeholder="Create a strong password"
              value={values.password}
              onChange={handleChange(SignUpFormField.Password)}
              onBlur={handleBlur(SignUpFormField.Password)}
              error={touched.password ? (errors.password ?? undefined) : undefined}
              helperText="At least 8 characters with uppercase, lowercase, and number"
              autoComplete="new-password"
              name="password"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <PasswordInput
              label="Confirm Password"
              required
              placeholder="Confirm your password"
              value={values.confirmPassword}
              onChange={handleChange(SignUpFormField.ConfirmPassword)}
              onBlur={handleBlur(SignUpFormField.ConfirmPassword)}
              error={touched.confirmPassword ? (errors.confirmPassword ?? undefined) : undefined}
              autoComplete="new-password"
              name="confirmPassword"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          >
            <Input
              label="Referral ID"
              type="text"
              placeholder="Enter referral ID (optional)"
              value={values.referralId || ""}
              onChange={handleChange(SignUpFormField.ReferralId)}
              onBlur={handleBlur(SignUpFormField.ReferralId)}
              error={touched.referralId ? (errors.referralId ?? undefined) : undefined}
              helperText="Optional - Enter a referral ID if you were referred by someone"
              name="referralId"
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="pt-2"
        >
          <Button
            type="submit"
            disabled={isLoading || !isValid}
            loading={isLoading}
            className="w-full py-3 text-base font-semibold"
          >
            Create Account
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="text-center pt-3 border-t border-slate-100 mt-4"
        >
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </motion.form>
    </>
  );
}
