"use client";

import React from "react";
import { motion, Variants } from "framer-motion";
import {
  AlertCircle,
  WifiOff,
  ShieldAlert,
  ServerOff,
  FileX,
  Inbox,
  RefreshCw,
  ArrowLeft,
  Home,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Re-export error utilities for convenience
export { createErrorStateProps, getErrorType, getErrorMessage } from "./errorUtils";

import { ButtonVariant, ButtonSize, ErrorVariant, ErrorType } from "@/lib/utils/client-enums";

interface ErrorStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonVariant;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ErrorStateProps {
  /**
   * Error variant - affects color scheme and tone
   * @default "error"
   */
  variant?: ErrorVariant;
  /**
   * Specific error type - provides default configuration
   */
  type?: ErrorType;
  /**
   * Main title/heading
   * If not provided, uses default from type or "Error"
   */
  title?: string;
  /**
   * Detailed description/explanation
   * If not provided, uses default from type or "An error occurred."
   */
  description?: string;
  /**
   * Custom icon component (overrides type-based icon)
   */
  icon?: React.ComponentType<{ className?: string }>;
  /**
   * Primary action button
   */
  primaryAction: ErrorStateAction;
  /**
   * Optional secondary action button
   */
  secondaryAction?: ErrorStateAction;
  /**
   * Custom className for container
   */
  className?: string;
  /**
   * Whether to show full-page layout
   * @default true
   */
  fullPage?: boolean;
  /**
   * Custom illustration/component to display
   */
  illustration?: React.ReactNode;
}

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const iconVariants: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.5,
      delay: 0.1,
      type: "spring",
      stiffness: 200,
    },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: 0.2,
    },
  },
};

const actionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: 0.3,
    },
  },
};

const variantConfig: Record<
  ErrorVariant,
  {
    iconBg: string;
    iconColor: string;
    titleColor: string;
    descriptionColor: string;
    borderColor: string;
    bgGradient: string;
  }
> = {
  [ErrorVariant.Error]: {
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    titleColor: "text-slate-900",
    descriptionColor: "text-slate-600",
    borderColor: "border-red-100",
    bgGradient: "from-red-50/30 via-white to-emerald-50/20",
  },
  [ErrorVariant.Warning]: {
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    titleColor: "text-slate-900",
    descriptionColor: "text-slate-600",
    borderColor: "border-amber-100",
    bgGradient: "from-amber-50/30 via-white to-emerald-50/20",
  },
  [ErrorVariant.Empty]: {
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
    titleColor: "text-slate-900",
    descriptionColor: "text-slate-600",
    borderColor: "border-emerald-100",
    bgGradient: "from-emerald-50/40 via-white to-emerald-50/20",
  },
};

const typeConfig: Record<
  ErrorType,
  {
    defaultIcon: React.ComponentType<{ className?: string }>;
    defaultTitle: string;
    defaultDescription: string;
    defaultVariant: ErrorVariant;
  }
> = {
  [ErrorType.Network]: {
    defaultIcon: WifiOff,
    defaultTitle: "Connection Problem",
    defaultDescription:
      "We couldn't connect to our servers. Please check your internet connection and try again.",
    defaultVariant: ErrorVariant.Error,
  },
  [ErrorType.Authorization]: {
    defaultIcon: ShieldAlert,
    defaultTitle: "Access Required",
    defaultDescription:
      "Your session has expired or you don't have permission to access this resource. Please sign in again.",
    defaultVariant: ErrorVariant.Error,
  },
  [ErrorType.Server]: {
    defaultIcon: ServerOff,
    defaultTitle: "Something Went Wrong",
    defaultDescription:
      "Something went wrong. Please try again in a few moments.",
    defaultVariant: ErrorVariant.Error,
  },
  [ErrorType.NotFound]: {
    defaultIcon: FileX,
    defaultTitle: "Page Not Found",
    defaultDescription:
      "The page or resource you're looking for doesn't exist or has been moved.",
    defaultVariant: ErrorVariant.Warning,
  },
  [ErrorType.Empty]: {
    defaultIcon: Inbox,
    defaultTitle: "No Data Available",
    defaultDescription:
      "There's nothing to display here yet. Get started by creating your first item.",
    defaultVariant: ErrorVariant.Empty,
  },
  [ErrorType.Generic]: {
    defaultIcon: AlertCircle,
    defaultTitle: "Something Went Wrong",
    defaultDescription:
      "An unexpected error occurred. Please try again or contact support if the problem persists.",
    defaultVariant: ErrorVariant.Error,
  },
};

/**
 * Production-ready Error State Component
 *
 * A comprehensive, reusable error UI component designed for fintech and tax compliance applications.
 * Features professional design, luxury green palette, and clear action guidance.
 *
 * @example
 * // Network error
 * <ErrorState
 *   type="network"
 *   primaryAction={{
 *     label: "Try Again",
 *     onClick: handleRetry,
 *     icon: RefreshCw,
 *   }}
 * />
 *
 * @example
 * // Custom error
 * <ErrorState
 *   variant="error"
 *   title="Payment Failed"
 *   description="Your payment could not be processed."
 *   icon={AlertCircle}
 *   primaryAction={{
 *     label: "Retry Payment",
 *     onClick: handleRetry,
 *   }}
 *   secondaryAction={{
 *     label: "Contact Support",
 *     onClick: handleSupport,
 *     variant: "outline",
 *   }}
 * />
 */
export function ErrorState({
  variant,
  type,
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  className,
  fullPage = true,
  illustration,
}: ErrorStateProps) {
  // Determine variant from type if not explicitly provided
  const effectiveVariant = variant || (type ? typeConfig[type].defaultVariant : "error");

  // Get type-based defaults if type is provided
  const typeDefaults = type ? typeConfig[type] : null;

  // Use provided values or fall back to type defaults or generic
  const finalTitle = title || typeDefaults?.defaultTitle || "Error";
  const finalDescription =
    description || typeDefaults?.defaultDescription || "An error occurred.";
  const finalIcon = icon || typeDefaults?.defaultIcon || AlertCircle;

  const config = variantConfig[effectiveVariant];
  const IconComponent = finalIcon;

  const containerClasses = cn(
    "flex items-center justify-center",
    fullPage ? "min-h-[500px] py-16" : "py-8",
    className
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        containerClasses,
        "bg-gradient-to-br",
        config.bgGradient
      )}
    >
      <div className="max-w-lg mx-auto px-6 text-center">
        {/* Illustration or Icon */}
        {illustration ? (
          <motion.div variants={iconVariants} initial="hidden" animate="visible">
            {illustration}
          </motion.div>
        ) : (
          <motion.div
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            className="flex justify-center mb-8"
          >
            <div
              className={cn(
                "rounded-full p-6 border-2",
                config.iconBg,
                config.borderColor
              )}
            >
              <IconComponent
                className={cn("w-16 h-16", config.iconColor)}
                strokeWidth={1.5}
              />
            </div>
          </motion.div>
        )}

        {/* Title */}
        <motion.h2
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            "text-2xl md:text-3xl font-bold mb-4",
            config.titleColor
          )}
        >
          {finalTitle}
        </motion.h2>

        {/* Description */}
        <motion.p
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            "text-base md:text-lg leading-relaxed mb-8",
            config.descriptionColor
          )}
        >
          {finalDescription}
        </motion.p>

        {/* Actions */}
        <motion.div
          variants={actionVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center"
        >
          <Button
            variant={primaryAction.variant || ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onClick={primaryAction.onClick}
            className="min-w-[160px] sm:min-w-[180px] px-6 py-3 text-base font-semibold flex items-center justify-center"
          >
            {primaryAction.icon && (
              <primaryAction.icon className="w-5 h-5 mr-2.5 flex-shrink-0" />
            )}
            <span>{primaryAction.label}</span>
          </Button>

          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || ButtonVariant.Outline}
              size={ButtonSize.Lg}
              onClick={secondaryAction.onClick}
              className="min-w-[160px] sm:min-w-[180px] px-6 py-3 text-base font-semibold flex items-center justify-center"
            >
              {secondaryAction.icon && (
                <secondaryAction.icon className="w-5 h-5 mr-2.5 flex-shrink-0" />
              )}
              <span>{secondaryAction.label}</span>
            </Button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Pre-configured error state components for common scenarios
 */

export function NetworkErrorState({
  onRetry,
  onGoHome,
}: {
  onRetry: () => void;
  onGoHome?: () => void;
}) {
  return (
    <ErrorState
      type={ErrorType.Network}
      primaryAction={{
        label: "Try Again",
        onClick: onRetry,
        icon: RefreshCw,
      }}
      secondaryAction={
        onGoHome
          ? {
              label: "Go Home",
              onClick: onGoHome,
              icon: Home,
              variant: ButtonVariant.Outline,
            }
          : undefined
      }
    />
  );
}

export function AuthorizationErrorState({
  onSignIn,
  onGoHome,
}: {
  onSignIn: () => void;
  onGoHome?: () => void;
}) {
  return (
    <ErrorState
      type={ErrorType.Authorization}
      primaryAction={{
        label: "Sign In",
        onClick: onSignIn,
        icon: ShieldAlert,
      }}
      secondaryAction={
        onGoHome
          ? {
              label: "Go Home",
              onClick: onGoHome,
              icon: Home,
              variant: ButtonVariant.Outline,
            }
          : undefined
      }
    />
  );
}

export function ServerErrorState({
  onRetry,
  onGoHome,
}: {
  onRetry: () => void;
  onGoHome?: () => void;
}) {
  return (
    <ErrorState
      type={ErrorType.Server}
      primaryAction={{
        label: "Try Again",
        onClick: onRetry,
        icon: RefreshCw,
      }}
      secondaryAction={
        onGoHome
          ? {
              label: "Go Home",
              onClick: onGoHome,
              icon: Home,
              variant: ButtonVariant.Outline,
            }
          : undefined
      }
    />
  );
}

export function NotFoundErrorState({
  onGoBack,
  onGoHome,
}: {
  onGoBack?: () => void;
  onGoHome: () => void;
}) {
  return (
    <ErrorState
      type={ErrorType.NotFound}
      primaryAction={{
        label: "Go Home",
        onClick: onGoHome,
        icon: Home,
      }}
      secondaryAction={
        onGoBack
          ? {
              label: "Go Back",
              onClick: onGoBack,
              icon: ArrowLeft,
              variant: ButtonVariant.Outline,
            }
          : undefined
      }
    />
  );
}

/**
 * Export error utilities for convenience
 */
export function EmptyStateError({
  title,
  description,
  onCreate,
  onSearch,
  searchTerm,
}: {
  title?: string;
  description?: string;
  onCreate?: () => void;
  onSearch?: () => void;
  searchTerm?: string;
}) {
  return (
    <ErrorState
      type={ErrorType.Empty}
      title={title}
      description={description || (searchTerm ? "No results found for your search." : undefined)}
      primaryAction={
        onCreate
          ? {
              label: "Create New",
              onClick: onCreate,
              icon: RefreshCw,
            }
          : {
              label: "Search",
              onClick: onSearch || (() => {}),
              icon: Search,
            }
      }
    />
  );
}

















