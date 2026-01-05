/**
 * Referral utility functions
 * 
 * Handles referral code extraction and tracking from URL parameters
 */

/**
 * Extract referral code from URL search params
 * @param searchParams - URL search params (from useSearchParams or window.location.search)
 * @returns Object with referral code and user ID if present
 */
export function extractReferralCode(searchParams: URLSearchParams | string): {
  referralCode: string | null;
  referralUserId: string | null;
} {
  let params: URLSearchParams;
  
  if (typeof searchParams === "string") {
    params = new URLSearchParams(searchParams);
  } else {
    params = searchParams;
  }
  
  return {
    referralCode: params.get("ref") || params.get("referral") || null,
    referralUserId: params.get("refId") || null,
  };
}

/**
 * Store referral information in localStorage for later use
 * (e.g., when user completes signup)
 */
export function storeReferralInfo(referralCode: string | null, referralUserId: string | null): void {
  if (typeof window === "undefined") return;
  
  try {
    if (referralCode || referralUserId) {
      localStorage.setItem(
        "taxcomply_referral_info",
        JSON.stringify({
          referralCode,
          referralUserId,
          timestamp: Date.now(),
        })
      );
    }
  } catch (error) {
    console.error("Failed to store referral info:", error);
  }
}

/**
 * Get stored referral information
 */
export function getStoredReferralInfo(): {
  referralCode: string | null;
  referralUserId: string | null;
  timestamp: number | null;
} | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem("taxcomply_referral_info");
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return {
      referralCode: parsed.referralCode || null,
      referralUserId: parsed.referralUserId || null,
      timestamp: parsed.timestamp || null,
    };
  } catch (error) {
    console.error("Failed to get referral info:", error);
    return null;
  }
}

/**
 * Clear stored referral information (after successful signup)
 */
export function clearReferralInfo(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem("taxcomply_referral_info");
  } catch (error) {
    console.error("Failed to clear referral info:", error);
  }
}

















