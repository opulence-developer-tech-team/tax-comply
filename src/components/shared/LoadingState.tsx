"use client";

import React from "react";
import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

import { LoadingStateSize } from "@/lib/utils/client-enums";

interface LoadingStateProps {
  message?: string;
  size?: LoadingStateSize;
}

/**
 * Full-page loading state component with brand name for maximum recall
 * Premium, fast, and smooth loading experience with brand reinforcement
 * 
 * Marketing Strategy:
 * - Brand name always visible during loading = increased brand recall
 * - Users see "TaxComply" repeatedly = better word-of-mouth referrals
 * - Professional presentation builds trust and memorability
 * 
 * Features:
 * - Prominent brand name display (TaxComply)
 * - Fast rotating spinner (0.3s) for speed perception
 * - Hardware-accelerated animations
 * - Optimized for low-end devices
 */
const sizeConfig = {
  xs: { spinner: "w-8 h-8 border-2", brandSize: "text-lg", iconSize: "w-5 h-5", logoSize: "w-6 h-6" },
  sm: { spinner: "w-10 h-10 border-[2.5px]", brandSize: "text-xl", iconSize: "w-6 h-6", logoSize: "w-7 h-7" },
  md: { spinner: "w-12 h-12 border-[3px]", brandSize: "text-2xl", iconSize: "w-7 h-7", logoSize: "w-8 h-8" },
  lg: { spinner: "w-16 h-16 border-[3.5px]", brandSize: "text-3xl", iconSize: "w-8 h-8", logoSize: "w-10 h-10" },
};

const APP_NAME = "TaxComply";
const APP_SUFFIX = "NG";

export function LoadingState({
  message = "Loading...",
  size = LoadingStateSize.Md,
}: LoadingStateProps) {
  const config = sizeConfig[size];
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      {/* Brand name with spinner - maximum visibility for brand recall */}
      <div className="flex flex-col items-center space-y-6">
        {/* Spinner with brand logo */}
        <div className="relative flex items-center justify-center">
          {/* Fast rotating spinner */}
          <div
            className={cn(
              "rounded-full border-solid",
              config.spinner,
              "border-emerald-200",
              "border-t-emerald-600",
              "flutterwave-spinner-fast"
            )}
            style={{
              borderRightColor: "transparent",
              borderBottomColor: "transparent",
              borderLeftColor: "transparent",
            }}
            aria-label="Processing"
            role="status"
          />
          
          {/* Brand logo icon in center - subtle pulse */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              opacity: [0.7, 1, 0.7],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className={cn(
              "bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-emerald-500/20",
              config.logoSize
            )}>
              <Scale className={cn("text-white", config.iconSize)} strokeWidth={2.5} />
            </div>
          </motion.div>
        </div>
        
        {/* Brand name - prominent display for recall */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          className="flex flex-col items-center space-y-1"
        >
          <h1 className={cn(
            "font-bold bg-gradient-to-r from-emerald-700 to-emerald-600 bg-clip-text text-transparent",
            config.brandSize,
            "tracking-tight"
          )}>
            {APP_NAME}
          </h1>
          <span className="text-xs font-semibold text-emerald-600 tracking-wider">
            {APP_SUFFIX}
          </span>
        </motion.div>
      </div>
      
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.2, ease: "easeOut" }}
          className="text-sm font-medium text-slate-600"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
