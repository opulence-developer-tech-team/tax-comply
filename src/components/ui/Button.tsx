import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { InlineFlutterwaveLoader } from "@/components/shared/FlutterwaveLoader";

import { ButtonVariant, ButtonSize, LoaderState, LoaderSize } from "@/lib/utils/client-enums";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  children: React.ReactNode;
}

/**
 * Production-ready Button component with intelligent loading state handling.
 * 
 * Features:
 * - Preserves children structure during loading (text, icons remain visible)
 * - Intelligently adds spinner before content
 * - Handles React children of any type (string, element, array, fragment)
 * - Accessible with proper ARIA attributes
 * - Smooth transitions and animations
 * - Consistent styling across variants
 */
export function Button({
  variant = ButtonVariant.Primary,
  size = ButtonSize.Md,
  loading = false,
  success = false,
  error = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const [loaderState, setLoaderState] = useState<LoaderState>(LoaderState.Loading);
  const [showSuccess, setShowSuccess] = useState(false);

  // Determine loader state based on props
  useEffect(() => {
    if (error) {
      setLoaderState(LoaderState.Error);
      setShowSuccess(false);
    } else if (success && !loading) {
      setLoaderState(LoaderState.Success);
      setShowSuccess(true);
      // Reset after animation completes
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setLoaderState(LoaderState.Loading);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (loading) {
      setLoaderState(LoaderState.Loading);
      setShowSuccess(false);
    } else {
      setLoaderState(LoaderState.Loading);
      setShowSuccess(false);
    }
  }, [loading, success, error]);
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";
  
  const variants: Record<ButtonVariant, string> = {
    [ButtonVariant.Primary]: "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800 focus:ring-emerald-500 shadow-lg hover:shadow-xl active:scale-[0.98]",
    [ButtonVariant.Secondary]: "bg-slate-600 text-white hover:bg-slate-700 focus:ring-slate-500 shadow-md hover:shadow-lg active:scale-[0.98]",
    [ButtonVariant.Outline]: "border-2 border-emerald-700 text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-500 active:scale-[0.98]",
    [ButtonVariant.Danger]: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg active:scale-[0.98]",
    [ButtonVariant.Ghost]: "text-slate-700 hover:bg-slate-100 focus:ring-slate-500 active:scale-[0.98]",
  };

  const sizes: Record<ButtonSize, string> = {
    [ButtonSize.Sm]: "px-3 py-1.5 text-sm gap-1.5",
    [ButtonSize.Md]: "px-4 py-2 text-base gap-2",
    [ButtonSize.Lg]: "px-6 py-3 text-lg gap-2.5",
  };

  // Render children with loading spinner intelligently inserted
  const renderContent = () => {
    // Only show loader when loading, success, or error
    const showLoader = loading || showSuccess || error;
    
    if (!showLoader) {
      return children;
    }

    // Determine loader size based on button size for better visibility
    // Slightly larger for better visibility on buttons
    const loaderSize = size === ButtonSize.Sm ? LoaderSize.Sm : size === ButtonSize.Lg ? LoaderSize.Md : size === ButtonSize.Md ? LoaderSize.Sm : LoaderSize.Sm;

    // If children is a simple string/number, add loader before it
    if (typeof children === "string" || typeof children === "number") {
      return (
        <>
          <InlineFlutterwaveLoader 
            size={loaderSize} 
            state={loaderState}
            variant={variant}
            className="shrink-0" 
          />
          <span>{children}</span>
        </>
      );
    }

    // If children is a React element
    if (React.isValidElement(children)) {
      const childProps = children.props as any;
      
      // If it's a fragment, add loader before fragment
      if (children.type === React.Fragment) {
        return (
          <>
            <InlineFlutterwaveLoader 
              size={loaderSize} 
              state={loaderState}
              variant={variant}
              className="shrink-0" 
            />
            {children}
          </>
        );
      }

      // If element has children, insert loader before them
      if (childProps && childProps.children !== undefined) {
        return React.cloneElement(children, {
          ...childProps,
          children: (
            <>
              <InlineFlutterwaveLoader 
                size={loaderSize} 
                state={loaderState}
                variant={variant}
                className="shrink-0" 
              />
              {childProps.children}
            </>
          ),
        } as any);
      }

      // Single element without children - add loader before
      return (
        <>
          <InlineFlutterwaveLoader 
            size={loaderSize} 
            state={loaderState}
            variant={variant}
            className="shrink-0" 
          />
          {children}
        </>
      );
    }

    // Array of children (most common case: [<Icon />, "Text"])
    // Insert loader at the beginning of the array
    if (Array.isArray(children)) {
      return (
        <>
          <InlineFlutterwaveLoader 
            size={loaderSize} 
            state={loaderState}
            variant={variant}
            className="shrink-0" 
          />
          {children}
        </>
      );
    }

    // Fallback: just show loader (shouldn't happen in practice)
    return <InlineFlutterwaveLoader size={loaderSize} state={loaderState} variant={variant} className="shrink-0" />;
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading || showSuccess}
      aria-busy={loading}
      aria-disabled={disabled || loading || showSuccess}
      {...props}
    >
      {renderContent()}
    </button>
  );
}

