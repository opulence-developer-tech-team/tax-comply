"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import { FileText, TrendingUp, CheckCircle2 } from "lucide-react"; // DollarSign removed
import { NairaSign } from "@/components/icons/NairaSign";
import { cn } from "@/lib/utils";
import { LoadingSpinnerTheme, LoadingSpinnerSize, LoadingSpinnerVariant } from "@/lib/utils/client-enums";

interface LoadingSpinnerProps {
  /**
   * Optional message to display below the spinner
   */
  message?: string;
  /**
   * Size of the spinner
   * @default "md"
   */
  size?: LoadingSpinnerSize;
  /**
   * Visual theme reflecting company context
   * @default "default"
   */
  theme?: LoadingSpinnerTheme;
  /**
   * Animation variant
   * @default "spinner"
   */
  variant?: LoadingSpinnerVariant;
  /**
   * Whether to show full page layout (centered with min-height)
   * @default false
   */
  fullPage?: boolean;
  /**
   * Optional progress value (0-100) for progress indicator
   */
  progress?: number;
  /**
   * Custom className for container
   */
  className?: string;
  /**
   * Whether to show icon with spinner
   * @default true
   */
  showIcon?: boolean;
}

const sizeConfig: Record<LoadingSpinnerSize, {
  spinner: string;
  icon: string;
  text: string;
  container: string;
}> = {
  xs: {
    spinner: "h-4 w-4 border-2",
    icon: "w-3 h-3",
    text: "text-xs",
    container: "min-h-[100px]",
  },
  sm: {
    spinner: "h-6 w-6 border-2",
    icon: "w-4 h-4",
    text: "text-sm",
    container: "min-h-[150px]",
  },
  md: {
    spinner: "h-12 w-12 border-4",
    icon: "w-6 h-6",
    text: "text-base",
    container: "min-h-[200px]",
  },
  lg: {
    spinner: "h-16 w-16 border-4",
    icon: "w-8 h-8",
    text: "text-lg",
    container: "min-h-[300px]",
  },
  xl: {
    spinner: "h-20 w-20 border-4",
    icon: "w-10 h-10",
    text: "text-xl",
    container: "min-h-[400px]",
  },
};

const themeConfig: Record<LoadingSpinnerTheme, {
  primary: string;
  secondary: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  [LoadingSpinnerTheme.Default]: {
    primary: "border-emerald-600",
    secondary: "border-emerald-100",
    accent: "text-emerald-600",
    icon: FileText,
    description: "Loading",
  },
  [LoadingSpinnerTheme.Tax]: {
    primary: "border-emerald-700",
    secondary: "border-emerald-200",
    accent: "text-emerald-700",
    icon: CheckCircle2,
    description: "Processing tax data",
  },
  [LoadingSpinnerTheme.Finance]: {
    primary: "border-emerald-600",
    secondary: "border-emerald-100",
    accent: "text-emerald-600",
    icon: NairaSign,
    description: "Calculating finances",
  },
  [LoadingSpinnerTheme.Corporate]: {
    primary: "border-emerald-800",
    secondary: "border-emerald-300",
    accent: "text-emerald-800",
    icon: TrendingUp,
    description: "Loading company data",
  },
  [LoadingSpinnerTheme.Income]: {
    primary: "border-emerald-500",
    secondary: "border-emerald-100",
    accent: "text-emerald-500",
    icon: NairaSign,
    description: "Processing income",
  },
};

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
};

const spinnerVariants: Variants = {
  rotate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

const pulseVariants: Variants = {
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Production-ready Loading Spinner Component
 * 
 * Features:
 * - Multiple themes (tax, finance, corporate, income)
 * - Multiple sizes and variants
 * - Accessible (ARIA labels, semantic HTML)
 * - Progress indicator support
 * - Full-page or inline modes
 * - Professional corporate design
 * 
 * @example
 * <LoadingSpinner message="Loading invoices..." theme="tax" size="lg" />
 * <LoadingSpinner variant="dots" size="sm" />
 * <LoadingSpinner progress={75} message="Processing..." />
 */
export function LoadingSpinner({
  message,
  size = LoadingSpinnerSize.Md,
  theme = LoadingSpinnerTheme.Default,
  variant = LoadingSpinnerVariant.Spinner,
  fullPage = false,
  progress,
  className,
  showIcon = true,
}: LoadingSpinnerProps) {
  const config = sizeConfig[size];
  const themeData = themeConfig[theme];
  const Icon = themeData.icon;

  const containerClasses = cn(
    "flex items-center justify-center",
    fullPage ? config.container : "",
    className
  );

  const renderSpinner = () => {
    switch (variant) {
      case LoadingSpinnerVariant.Spinner:
        // Map theme colors to actual hex values for reliable rendering
        const getColorValue = (colorClass: string): string => {
          if (colorClass.includes("emerald-700")) return "#047857";
          if (colorClass.includes("emerald-600")) return "#059669";
          if (colorClass.includes("emerald-800")) return "#065f46";
          if (colorClass.includes("emerald-500")) return "#10b981";
          if (colorClass.includes("emerald-200")) return "#a7f3d0";
          if (colorClass.includes("emerald-100")) return "#d1fae5";
          if (colorClass.includes("emerald-300")) return "#6ee7b7";
          return "#059669"; // Default emerald-600
        };
        
        // Get size in pixels directly from size prop (more reliable)
        const getSizePx = (): number => {
          if (size === LoadingSpinnerSize.Xs) return 16; // h-4 w-4 = 1rem = 16px
          if (size === LoadingSpinnerSize.Sm) return 24; // h-6 w-6 = 1.5rem = 24px
          if (size === LoadingSpinnerSize.Md) return 48; // h-12 w-12 = 3rem = 48px
          if (size === LoadingSpinnerSize.Lg) return 64; // h-16 w-16 = 4rem = 64px
          if (size === LoadingSpinnerSize.Xl) return 80; // h-20 w-20 = 5rem = 80px
          return 24; // Default sm
        };
        
        // Get border width from config - ensure minimum 2px for visibility
        const borderWidth = config.spinner.includes("border-2") ? 2 : 
                           config.spinner.includes("border-4") ? 4 : 2;
        
        const primaryColor = getColorValue(themeData.primary);
        const secondaryColor = getColorValue(themeData.secondary);
        const sizePx = getSizePx();
        
        // Use CSS keyframe animation - bulletproof approach that always works
        return (
          <div
            className="tax-spinner"
            style={{
              width: `${sizePx}px`,
              height: `${sizePx}px`,
              border: `${borderWidth}px solid ${secondaryColor}`,
              borderTopColor: primaryColor,
              borderRightColor: "transparent",
              borderBottomColor: "transparent",
              borderLeftColor: "transparent",
              borderRadius: "50%",
              display: "inline-block",
              flexShrink: 0,
              boxSizing: "border-box",
            }}
            aria-hidden="true"
          />
        );

      case LoadingSpinnerVariant.Dots:
        // Get color value for dots
        const getDotColor = (colorClass: string): string => {
          if (colorClass.includes("emerald-700")) return "#047857";
          if (colorClass.includes("emerald-600")) return "#059669";
          if (colorClass.includes("emerald-800")) return "#065f46";
          if (colorClass.includes("emerald-500")) return "#10b981";
          return "#047857"; // Default to emerald-700 for tax theme
        };
        
        const dotColor = getDotColor(themeData.primary);
        const dotSize = size === LoadingSpinnerSize.Xs ? "4px" : size === LoadingSpinnerSize.Sm ? "5px" : size === LoadingSpinnerSize.Md ? "6px" : size === LoadingSpinnerSize.Lg ? "8px" : "10px";
        
        return (
          <div className="flex items-center gap-1.5" aria-hidden="true" style={{ gap: size === LoadingSpinnerSize.Xs ? "3px" : "4px" }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: dotSize,
                  height: dotSize,
                  backgroundColor: dotColor,
                }}
                animate={{
                  y: [0, -6, 0],
                  opacity: [0.4, 1, 0.4],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        );

      case LoadingSpinnerVariant.Pulse:
        return (
          <motion.div
            variants={pulseVariants}
            animate="pulse"
            className={cn(
              "rounded-full",
              themeData.primary,
              "bg-current",
              config.spinner
            )}
            aria-hidden="true"
          />
        );

      case LoadingSpinnerVariant.Bars:
        return (
          <div className="flex items-end space-x-1" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className={cn("bg-current", themeData.primary)}
                style={{
                  width: size === LoadingSpinnerSize.Xs ? "3px" : size === LoadingSpinnerSize.Sm ? "4px" : size === LoadingSpinnerSize.Md ? "5px" : size === LoadingSpinnerSize.Lg ? "6px" : "8px",
                  height: size === LoadingSpinnerSize.Xs ? "12px" : size === LoadingSpinnerSize.Sm ? "16px" : size === LoadingSpinnerSize.Md ? "20px" : size === LoadingSpinnerSize.Lg ? "24px" : "28px",
                }}
                animate={{
                  height: [
                    size === LoadingSpinnerSize.Xs ? "12px" : size === LoadingSpinnerSize.Sm ? "16px" : size === LoadingSpinnerSize.Md ? "20px" : size === LoadingSpinnerSize.Lg ? "24px" : "28px",
                    size === LoadingSpinnerSize.Xs ? "20px" : size === LoadingSpinnerSize.Sm ? "28px" : size === LoadingSpinnerSize.Md ? "36px" : size === LoadingSpinnerSize.Lg ? "44px" : "52px",
                    size === LoadingSpinnerSize.Xs ? "12px" : size === LoadingSpinnerSize.Sm ? "16px" : size === LoadingSpinnerSize.Md ? "20px" : size === LoadingSpinnerSize.Lg ? "24px" : "28px",
                  ],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-label={message || themeData.description}
    >
      <div className="text-center">
        <div className="flex flex-col items-center space-y-4">
          {/* Icon + Spinner Container */}
          <div className="relative flex items-center justify-center">
            {showIcon && size !== LoadingSpinnerSize.Xs && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className={cn(
                  "absolute z-10 p-2 rounded-full bg-white shadow-lg",
                  themeData.accent
                )}
              >
                <Icon className={config.icon} />
              </motion.div>
            )}
            <div className={cn(showIcon && size !== LoadingSpinnerSize.Xs ? "opacity-20" : "")}>
              {renderSpinner()}
            </div>
          </div>

          {/* Progress Bar (if progress provided) */}
          {progress !== undefined && (
            <div className={cn("space-y-2", size === LoadingSpinnerSize.Xs || size === LoadingSpinnerSize.Sm ? "w-32" : "w-48")}>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={cn("h-full rounded-full", themeData.primary, "bg-current")}
                />
              </div>
              <p className={cn("font-medium", config.text, themeData.accent)}>
                {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Message */}
          {message && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className={cn(
                "font-medium text-slate-700 max-w-md",
                config.text
              )}
            >
              {message}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Inline loading spinner for buttons and small spaces
 * Uses animated dots for guaranteed visibility and animation
 * Renders directly without wrapper for better visibility
 */
export function InlineSpinner({
  size = LoadingSpinnerSize.Sm,
  theme = LoadingSpinnerTheme.Default,
  className,
}: Pick<LoadingSpinnerProps, "size" | "theme" | "className">) {
  const themeData = themeConfig[theme];
  
  // Get color value for dots - adapts to theme
  const getDotColor = (colorClass: string, themeName: LoadingSpinnerTheme): string => {
    // For tax theme, use white dots (visible on emerald gradient buttons)
    if (themeName === LoadingSpinnerTheme.Tax) return "#ffffff"; // White for visibility on emerald buttons
    // For default theme (used on outline/ghost buttons), use emerald
    if (themeName === LoadingSpinnerTheme.Default) return "#047857"; // emerald-700 for visibility on light backgrounds
    if (colorClass.includes("emerald-700")) return "#047857";
    if (colorClass.includes("emerald-600")) return "#059669";
    if (colorClass.includes("emerald-800")) return "#065f46";
    if (colorClass.includes("emerald-500")) return "#10b981";
    return "#047857"; // Default to emerald-700
  };
  
  const dotColor = getDotColor(themeData.primary, theme);
  // Make dots slightly larger for better visibility
  const dotSize = size === LoadingSpinnerSize.Xs ? "5px" : size === LoadingSpinnerSize.Sm ? "6px" : size === LoadingSpinnerSize.Md ? "8px" : size === LoadingSpinnerSize.Lg ? "10px" : "12px";
  const gapSize = size === LoadingSpinnerSize.Xs ? "3px" : size === LoadingSpinnerSize.Sm ? "4px" : "5px";
  
  // Render dots directly - no wrapper, guaranteed to be visible
  return (
    <div 
      className={cn("flex items-center", className)} 
      aria-hidden="true"
      style={{ gap: gapSize }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: dotColor,
            display: "block",
          }}
          animate={{
            y: [0, -6, 0],
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

