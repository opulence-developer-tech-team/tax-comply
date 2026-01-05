"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * Configuration for engagement tracking
 */
export interface EngagementConfig {
  /** Minimum time in minutes before showing prompt */
  minEngagementMinutes: number;
  /** Time in days before showing prompt again after dismissal */
  dismissalCooldownDays: number;
  /** Storage key for dismissal state */
  storageKey?: string;
  /** Pages/routes to exclude from tracking */
  excludedPaths?: string[];
  /** Pages/routes that are considered critical flows */
  criticalFlows?: string[];
}

const DEFAULT_CONFIG: EngagementConfig = {
  minEngagementMinutes: 5, // Show after 5 minutes of engagement
  dismissalCooldownDays: 7, // Show again after 7 days
  storageKey: "share_prompt_dismissed",
  excludedPaths: ["/sign-in", "/sign-up", "/verify-email", "/admin"],
  criticalFlows: [
    "/dashboard/company/onboard",
    "/dashboard/subscription",
    "/dashboard/invoices/create",
    "/dashboard/expenses/create",
  ],
};

/**
 * Hook to track user engagement time and determine when to show share prompt
 * 
 * Features:
 * - Tracks active time (not just page load time)
 * - Respects dismissal state with cooldown period
 * - Excludes critical flows and excluded paths
 * - Handles page navigation and tab visibility
 * - Production-ready with proper cleanup
 */
export function useEngagementTracking(config: Partial<EngagementConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const pathname = usePathname();
  
  const [shouldShow, setShouldShow] = useState(false);
  const [engagementMinutes, setEngagementMinutes] = useState(0);
  
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  /**
   * Check if current path should be excluded from tracking
   */
  const isExcludedPath = useCallback(() => {
    if (!pathname) return true;
    
    // Check excluded paths
    if (finalConfig.excludedPaths?.some(path => pathname.startsWith(path))) {
      return true;
    }
    
    // Check critical flows - don't show during critical flows
    if (finalConfig.criticalFlows?.some(path => pathname.startsWith(path))) {
      return true;
    }
    
    return false;
  }, [pathname, finalConfig.excludedPaths, finalConfig.criticalFlows]);

  /**
   * Check if prompt was dismissed and cooldown period has passed
   * Returns true if it's OK to show (no dismissal OR cooldown has passed)
   */
  const checkDismissalState = useCallback((): boolean => {
    if (typeof window === "undefined") return true; // Allow showing if window not available
    
    try {
      const dismissedData = localStorage.getItem(finalConfig.storageKey || "share_prompt_dismissed");
      if (!dismissedData) return true; // No dismissal = OK to show
      
      const { timestamp } = JSON.parse(dismissedData);
      const daysSinceDismissal = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
      const cooldownDays = finalConfig.dismissalCooldownDays || 7;
      
      // If cooldown period has passed, OK to show again
      return daysSinceDismissal >= cooldownDays;
    } catch (error) {
      // If there's an error reading storage, allow showing (fail open)
      console.warn("Error checking dismissal state:", error);
      return true;
    }
  }, [finalConfig.storageKey, finalConfig.dismissalCooldownDays]);

  /**
   * Start tracking engagement time
   */
  const startTracking = useCallback(() => {
    if (isExcludedPath()) {
      // Reset tracking if we're on an excluded path
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      startTimeRef.current = null;
      accumulatedTimeRef.current = 0;
      setEngagementMinutes(0);
      return;
    }

    // If not already tracking, start
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    // Update last active time
    lastActiveRef.current = Date.now();

    // Set up interval to track active time
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastActive = (now - lastActiveRef.current) / 1000 / 60; // minutes
        
        // If user has been inactive for more than 2 minutes, pause tracking
        if (timeSinceLastActive > 2) {
          // User is inactive, don't accumulate time
          return;
        }

        // Accumulate active time
        if (startTimeRef.current) {
          const sessionTime = (now - startTimeRef.current) / 1000 / 60; // minutes
          const totalMinutes = accumulatedTimeRef.current + sessionTime;
          
          setEngagementMinutes(Math.floor(totalMinutes));
          
          // Check if we should show the prompt
          if (
            totalMinutes >= (finalConfig.minEngagementMinutes || 5) &&
            checkDismissalState() &&
            !isExcludedPath()
          ) {
            setShouldShow(true);
          }
        }
      }, 30000); // Check every 30 seconds
    }
  }, [isExcludedPath, checkDismissalState, finalConfig.minEngagementMinutes]);

  /**
   * Stop tracking (when user navigates away or becomes inactive)
   */
  const stopTracking = useCallback(() => {
    if (startTimeRef.current) {
      // Save accumulated time before stopping
      const sessionTime = (Date.now() - startTimeRef.current) / 1000 / 60;
      accumulatedTimeRef.current += sessionTime;
      startTimeRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Handle visibility change (tab switch, minimize, etc.)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, stop tracking
        stopTracking();
      } else {
        // Tab is visible, resume tracking
        lastActiveRef.current = Date.now();
        startTracking();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [startTracking, stopTracking]);

  /**
   * Handle user activity (mouse move, scroll, click, etc.)
   */
  useEffect(() => {
    const handleActivity = () => {
      lastActiveRef.current = Date.now();
      if (!document.hidden && !isExcludedPath()) {
        startTracking();
      }
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [startTracking, isExcludedPath]);

  /**
   * Start tracking on mount and pathname change
   */
  useEffect(() => {
    // Reset state when pathname changes
    setShouldShow(false);
    stopTracking();
    
    // Small delay to ensure page is loaded
    const timeout = setTimeout(() => {
      if (!isExcludedPath() && !document.hidden) {
        startTracking();
      }
    }, 1000);

    return () => {
      clearTimeout(timeout);
      stopTracking();
    };
  }, [pathname, startTracking, stopTracking, isExcludedPath]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    shouldShow,
    engagementMinutes,
    isExcludedPath: isExcludedPath(),
  };
}

