"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Shield, FileCheck, Stamp } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoaderSize, LoaderState, ButtonVariant } from "@/lib/utils/client-enums";

interface FlutterwaveLoaderProps {
  size?: LoaderSize;
  state?: LoaderState;
  className?: string;
  showSuccess?: boolean;
  onSuccessComplete?: () => void;
}

/**
 * Premium Flutterwave-inspired loader with tax compliance visual language
 * 
 * Features:
 * - Ultra-fast animations (0.3s rotation) - creates illusion of speed
 * - Tax compliance visual elements (shields, checkmarks, stamps)
 * - Immediate transitions - no delays, instant feedback
 * - Lightweight and performant - optimized for low-end devices
 * - Non-blocking UI updates
 * 
 * Animation Rationale:
 * - 0.3s rotation: Very fast, creates perception of rapid processing
 * - Immediate success: No delay, instant transition for speed illusion
 * - Tax compliance icons: Shield (security), Checkmark (validation), Stamp (approval)
 * - CSS transforms: Hardware-accelerated, 60fps guaranteed
 * - Minimal repaints: Only transform/opacity for performance
 */
const sizeConfig: Record<LoaderSize, { container: string; spinner: string; checkmark: string }> = {
  [LoaderSize.Xs]: {
    container: "w-4 h-4",
    spinner: "w-4 h-4 border-2",
    checkmark: "w-3 h-3",
  },
  [LoaderSize.Sm]: {
    container: "w-5 h-5",
    spinner: "w-5 h-5 border-2",
    checkmark: "w-4 h-4",
  },
  [LoaderSize.Md]: {
    container: "w-6 h-6",
    spinner: "w-6 h-6 border-2",
    checkmark: "w-5 h-5",
  },
  [LoaderSize.Lg]: {
    container: "w-8 h-8",
    spinner: "w-8 h-8 border-[3px]",
    checkmark: "w-6 h-6",
  },
};

export function FlutterwaveLoader({
  size = LoaderSize.Sm,
  state = LoaderState.Loading,
  className,
  showSuccess = true,
  onSuccessComplete,
}: FlutterwaveLoaderProps) {
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  useEffect(() => {
    if (state === LoaderState.Success && showSuccess) {
      // Immediate transition - no delay for speed illusion
      setShowSuccessAnimation(true);
      // Callback after animation completes
      if (onSuccessComplete) {
        setTimeout(() => {
          onSuccessComplete();
        }, 500); // Faster completion for speed perception
      }
    } else {
      setShowSuccessAnimation(false);
    }
  }, [state, showSuccess, onSuccessComplete]);

  const config = sizeConfig[size];

  return (
    <div className={cn("relative flex items-center justify-center", config.container, className)}>
      <AnimatePresence mode="wait">
        {state === LoaderState.Loading && !showSuccessAnimation && (
          <motion.div
            key="loader"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative"
          >
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
            {/* Tax compliance shield icon overlay - subtle pulse */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Shield
                className={cn(
                  "text-emerald-600",
                  size === LoaderSize.Xs ? "w-2 h-2" :
                  size === LoaderSize.Sm ? "w-2.5 h-2.5" :
                  size === LoaderSize.Md ? "w-3 h-3" : "w-4 h-4"
                )}
                strokeWidth={2.5}
              />
            </motion.div>
          </motion.div>
        )}

        {state === LoaderState.Success && showSuccessAnimation && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 500, // Faster, snappier spring
              damping: 25,
              duration: 0.25, // Faster animation
            }}
            className="relative flex items-center justify-center"
          >
            {/* Main checkmark - instant appearance */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 600,
                damping: 20,
                duration: 0.2,
              }}
            >
              <CheckCircle2
                className={cn(
                  "text-emerald-600",
                  config.checkmark,
                  "stroke-[3]"
                )}
                style={{
                  filter: "drop-shadow(0 2px 6px rgba(5, 150, 105, 0.4))",
                }}
              />
            </motion.div>
            {/* Tax compliance stamp effect - quick pulse */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.2, opacity: [0, 0.3, 0] }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              <Stamp
                className={cn(
                  "text-emerald-500",
                  size === LoaderSize.Xs ? "w-3 h-3" :
                  size === LoaderSize.Sm ? "w-4 h-4" :
                  size === LoaderSize.Md ? "w-5 h-5" : "w-6 h-6"
                )}
                strokeWidth={2}
              />
            </motion.div>
          </motion.div>
        )}

        {state === LoaderState.Error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "rounded-full bg-red-500",
              config.container
            )}
            aria-label="Error"
            role="status"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Inline loader for buttons - optimized version with high visibility
 * Designed specifically for button contexts with better contrast
 */
export function InlineFlutterwaveLoader({
  size = LoaderSize.Sm,
  state = LoaderState.Loading,
  className,
  variant, // Optional: ButtonVariant
}: Omit<FlutterwaveLoaderProps, "showSuccess" | "onSuccessComplete"> & { variant?: ButtonVariant }) {
  const config = sizeConfig[size];
  
  // For buttons, use higher contrast colors and thicker borders for visibility
  if (state === LoaderState.Loading) {
    // Calculate border width for better visibility
    const borderWidth = size === LoaderSize.Xs ? "2.5px" : size === LoaderSize.Sm ? "3px" : size === LoaderSize.Md ? "3.5px" : "4px";
    
    // Determine colors based on button variant
    const isDark = variant === ButtonVariant.Primary || variant === ButtonVariant.Secondary || variant === ButtonVariant.Danger;
    const baseColor = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(5, 150, 105, 0.3)"; // white/40 or emerald-600/30
    const topColor = isDark ? "#ffffff" : "#047857"; // white or emerald-700
    const glowColor = isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(5, 150, 105, 0.2)";
    
    return (
      <div className={cn("relative flex items-center justify-center", config.container, className)}>
        {/* High-contrast spinner for buttons - adaptive colors based on button variant */}
        <div
          className={cn(
            "rounded-full border-solid",
            config.spinner,
            "flutterwave-spinner-fast"
          )}
          style={{
            borderColor: baseColor,
            borderTopColor: topColor,
            borderRightColor: "transparent",
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
            borderWidth: borderWidth,
            boxShadow: `0 0 6px ${glowColor}`, // Subtle glow for visibility
          }}
          aria-label="Processing"
          role="status"
        />
      </div>
    );
  }
  
  // Success and error states use the full component
  return (
    <FlutterwaveLoader
      size={size}
      state={state}
      className={className}
      showSuccess={false}
    />
  );
}

