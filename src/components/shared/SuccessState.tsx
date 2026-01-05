"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";

interface SuccessStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string | React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  email?: string;
  additionalInfo?: string;
}

export function SuccessState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  email,
  additionalInfo,
}: SuccessStateProps) {
  const renderDescription = () => {
    if (typeof description === "string" && email) {
      const parts = description.split("<email>");
      if (parts.length > 1) {
        return (
          <>
            {parts[0]}
            <strong className="text-emerald-700 font-semibold">{email}</strong>
            {parts[1]}
          </>
        );
      }
    }
    return description;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
        className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 mb-6 ring-4 ring-emerald-100/50"
      >
        {icon || <CheckCircle2 className="w-10 h-10 text-emerald-600" />}
      </motion.div>
      
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-2xl font-bold text-slate-900 mb-3"
      >
        {title}
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-sm text-slate-600 mb-4 leading-relaxed"
      >
        {renderDescription()}
      </motion.p>
      
      {additionalInfo && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-xs text-slate-500 mb-8 leading-relaxed"
        >
          {additionalInfo}
        </motion.p>
      )}
      
      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Button onClick={onAction} className="w-full">
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
