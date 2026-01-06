"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ShareModal } from "./ShareModal";
import { SharePromptPosition, ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";
import { toast } from "sonner";

interface SharePromptProps {
  /** Whether to show the prompt */
  isVisible: boolean;
  /** Callback when user dismisses the prompt */
  onDismiss: () => void;
  /** Optional referral code/token */
  referralCode?: string;
  /** Optional user ID for tracking */
  userId?: string;
  /** Custom signup URL (defaults to /sign-up) */
  signupUrl?: string;
  /** Position of the prompt */
  position?: SharePromptPosition;
}

/**
 * SharePrompt Component
 * 
 * A non-intrusive, dismissible share prompt that encourages users to refer others.
 * Matches the luxury emerald design system and provides native sharing with fallbacks.
 * 
 * Features:
 * - Smooth animations with framer-motion
 * - Native Web Share API with fallbacks
 * - Dismissible with localStorage persistence
 * - Responsive design (mobile & desktop)
 * - Accessible (ARIA labels, keyboard navigation)
 * - Performance optimized (portal rendering, minimal re-renders)
 */
export function SharePrompt({
  isVisible,
  onDismiss,
  referralCode,
  userId,
  signupUrl = "/sign-up",
  position = SharePromptPosition.BottomRight,
}: SharePromptProps) {
  const [mounted, setMounted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  /**
   * Generate the signup link with optional referral code
   */
  const getShareUrl = (): string => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = new URL(signupUrl, baseUrl);
    
    if (referralCode) {
      url.searchParams.set("ref", referralCode);
    }
    
    if (userId) {
      url.searchParams.set("refId", userId);
    }
    
    return url.toString();
  };

  /**
   * Handle share button click
   */
  const handleShare = async () => {
    const shareUrl = getShareUrl();
    const shareTitle = 'Simplify Your Taxes with TaxComply NG';
    const shareText = "Stop struggling with NRS deadlines! 🛡️ I use TaxComply NG to automate my Personal Income Tax, VAT, and Withholding Tax effortlessly. It's the smartest way to stay compliant and save money in Nigeria. Sign up with my link:";

    // Track share event (optional)
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "share_clicked", {
        method: "share_prompt",
        content_type: "referral",
      });
    }

    // Try native share API first (mobile & modern desktop)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        // Track successful native share
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "share_success", {
            method: "native",
          });
        }
        return;
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
        }
        // Fall through logic not needed here if native dialog was closed
      }
    } else {
        // Fallback: Copy to clipboard if sharing isn't native
        const fullMessage = `${shareTitle}\n\n${shareText} ${shareUrl}`;
        await navigator.clipboard.writeText(fullMessage);
        
        // Show simplified toast since we don't have the toast implementation imported yet.
        // But ReferralLinkCard uses 'sonner', so we should probably import it or just alert/console
        // The user says "Should be same", so I should import toast from sonner.
        // Let's assume toast is available via import { toast } from "sonner";
        toast.success("Message & Link copied!", { description: "Paste it on WhatsApp, Twitter, or Email." });
    }
    
    // We do NOT show the custom modal anymore based on "Should be same as ReferralLinkCard" request which uses copy fallback.
    // setShowShareModal(true); 
  };

  /**
   * Handle dismiss
   */
  const handleDismiss = () => {
    // Track dismissal
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "share_prompt_dismissed");
    }
    onDismiss();
  };

  /**
   * Position classes based on position prop
   * Mobile: Always fixed at bottom
   * Desktop: Respects position prop
   */
  const positionClasses = {
    [SharePromptPosition.BottomRight]: "md:bottom-6 md:right-6 bottom-0 left-0 right-0 md:left-auto",
    [SharePromptPosition.BottomLeft]: "md:bottom-6 md:left-6 bottom-0 left-0 right-0 md:right-auto",
    [SharePromptPosition.TopRight]: "md:top-6 md:right-6 bottom-0 left-0 right-0 md:left-auto",
    [SharePromptPosition.TopLeft]: "md:top-6 md:left-6 bottom-0 left-0 right-0 md:right-auto",
  };

  if (!mounted || !isVisible) return null;

  // Mobile-specific animation variants (slide up) vs Desktop (fade/scale)
  const isMobile = window.innerWidth < 768;

  const variants = isMobile ? {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" }
  } : {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 }
  };

  const promptContent = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={isMobile ? {
              type: "spring",
              damping: 30,
              stiffness: 400,
              mass: 0.8 // Lightweight feel
            } : {
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1], // Desktop: Custom elegant easing
            }}
            // Mobile Drag-to-Dismiss Props
            drag={isMobile ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={(e, { offset, velocity }) => {
                const swipeThreshold = 50;
                const swipeVelocityThreshold = 500;
                if (offset.y > swipeThreshold || velocity.y > swipeVelocityThreshold) {
                    handleDismiss();
                }
            }}
          className={cn(
            "fixed z-[90] w-full md:max-w-sm md:w-auto",
            positionClasses[position]
          )}
          role="dialog"
          aria-labelledby="share-prompt-title"
          aria-describedby="share-prompt-description"
        >
          {/* Luxury Card Design - Sheet on mobile, Card on desktop */}
          <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:shadow-2xl border-t-2 md:border-2 border-emerald-200/60 overflow-hidden md:ring-4 md:ring-emerald-50/50">
            {/* Mobile Drag Handle */}
            <div className="md:hidden w-full flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* Decorative gradient header */}
            <div className="relative bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-white p-4 border-b border-emerald-200/60">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/30 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center ring-2 ring-emerald-200/50">
                    <Users className="w-5 h-5 text-emerald-700" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3
                      id="share-prompt-title"
                      className="text-base font-bold text-slate-900 mb-1"
                    >
                      Know someone who needs help with taxes?
                    </h3>
                    <p
                      id="share-prompt-description"
                      className="text-sm text-slate-600 leading-relaxed"
                    >
                      Share TaxComply NG and help others simplify their tax compliance journey.
                    </p>
                  </div>
                </div>
                
                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-1.5 hover:bg-white/80 rounded-lg transition-colors text-slate-500 hover:text-slate-900 ml-2"
                  aria-label="Dismiss share prompt"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-4 space-y-3 pb-8 md:pb-4">
              <Button
                onClick={handleShare}
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                className="w-full text-base font-semibold shadow-lg shadow-emerald-500/20"
                aria-label="Share signup link"
              >
                <Share2 className="w-5 h-5 mr-3" />
                Share Signup Link
              </Button>
              
              <button
                onClick={handleDismiss}
                className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors text-center py-2"
              >
                Maybe later
              </button>
            </div>

            {/* Subtle decorative element */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 opacity-20" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(promptContent, document.body)}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={getShareUrl()}
        shareText="I've been using TaxComply NG for my tax compliance needs. It's made managing my company taxes so much easier! Check it out:"
        shareTitle="TaxComply NG - Simplify Your Tax Compliance"
      />
    </>
  );
}

