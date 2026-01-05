"use client";

import { useRouter } from "next/navigation";
import { useAppSelector } from "@/hooks/useAppSelector";
import { setReviewIntent, clearReviewIntent } from "@/lib/utils/review-redirect";

/**
 * Hook to handle guest review flow
 * 
 * Usage:
 * 1. Call `handleGuestReviewAttempt()` when guest tries to write review
 * 2. This will store review intent and redirect to signup
 * 3. After signup and email verification, user will be redirected to review
 * 4. After review submission, call `handleReviewComplete()` to navigate to dashboard
 * 
 * Example:
 * ```tsx
 * const { handleGuestReviewAttempt, handleReviewComplete } = useGuestReviewFlow();
 * 
 * const onSubmitReview = async (reviewData) => {
 *   if (!isAuthenticated) {
 *     handleGuestReviewAttempt(reviewData);
 *     return;
 *   }
 *   // Submit review...
 *   handleReviewComplete();
 * };
 * ```
 */
export function useGuestReviewFlow() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.user);

  /**
   * Handle guest user attempting to write a review
   * Stores review intent and redirects to signup
   */
  const handleGuestReviewAttempt = (reviewData?: any, source?: string) => {
    if (isAuthenticated) {
      // User is already authenticated, don't redirect
      return false;
    }

    // Store review intent for after signup
    setReviewIntent(source || "write_review_page", reviewData);

    // Redirect to signup with a flag to indicate review intent
    router.push("/sign-up?from=review");
    return true;
  };

  /**
   * Handle review completion
   * Clears review intent and navigates to dashboard
   */
  const handleReviewComplete = () => {
    clearReviewIntent();
    router.push("/dashboard");
  };

  /**
   * Check if user has pending review (after signup)
   */
  const hasPendingReview = () => {
    if (typeof window === "undefined") return false;
    try {
      const pendingReview = sessionStorage.getItem("pending_review_data");
      return pendingReview !== null;
    } catch {
      return false;
    }
  };

  /**
   * Get pending review data (if exists)
   */
  const getPendingReviewData = () => {
    if (typeof window === "undefined") return null;
    try {
      const pendingReview = sessionStorage.getItem("pending_review_data");
      if (!pendingReview) return null;
      return JSON.parse(pendingReview);
    } catch {
      return null;
    }
  };

  /**
   * Clear pending review data
   */
  const clearPendingReviewData = () => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem("pending_review_data");
      sessionStorage.removeItem("pending_review_source");
    } catch {
      // Ignore errors
    }
  };

  return {
    handleGuestReviewAttempt,
    handleReviewComplete,
    hasPendingReview,
    getPendingReviewData,
    clearPendingReviewData,
    isAuthenticated,
  };
}








