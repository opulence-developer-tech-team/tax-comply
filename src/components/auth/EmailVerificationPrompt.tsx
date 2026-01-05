"use client";

import React from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ButtonVariant } from "@/lib/utils/client-enums";

interface EmailVerificationPromptProps {
  email: string;
  onBack: () => void;
}

export function EmailVerificationPrompt({ email, onBack }: EmailVerificationPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 200 }}
        className="flex justify-center"
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center ring-4 ring-emerald-100/50">
          <Mail className="w-10 h-10 text-emerald-600" />
        </div>
      </motion.div>

      <div className="text-center space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-2xl font-bold text-slate-900"
        >
          Verify Your Email
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-sm text-slate-600 leading-relaxed"
        >
          We've sent a verification link to your email address. Please check your inbox to verify your account.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-6 space-y-4"
      >
        <div className="flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">
              Check your email
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              We've sent a verification link to <strong className="text-emerald-700 font-semibold">{email}</strong>. 
              Please check your inbox and click the link to verify your email address.
            </p>
          </div>
        </div>
        
        <div className="pt-4 border-t border-emerald-100">
          <p className="text-xs text-slate-500 mb-4">
            Didn't receive the email? Check your spam folder or try signing in again.
          </p>
          
          <Button
            onClick={onBack}
            variant={ButtonVariant.Outline}
            className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
