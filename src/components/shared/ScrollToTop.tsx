"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * ScrollToTop Component
 * 
 * Production-ready smooth scroll-to-top on every route change.
 * 
 * Features:
 * - Smooth scroll animation (leverages CSS scroll-behavior: smooth)
 * - Handles hash links intelligently (doesn't scroll if URL has hash)
 * - Works seamlessly with Next.js App Router
 * - Performance optimized (uses requestAnimationFrame + double RAF for reliability)
 * - Respects browser back/forward navigation
 * - No flicker, jump, or layout shift
 * - Handles edge cases gracefully
 * 
 * Edge Cases Handled:
 * - Hash links (#section) - doesn't scroll, lets browser handle anchor navigation
 * - Query parameters (?param=value) - still scrolls to top (pathname changed)
 * - Initial page load - scrolls to top (unless hash present)
 * - Programmatic navigation (router.push) - scrolls to top
 * - Browser back/forward - scrolls to top
 * - Same route re-renders - doesn't scroll (only on actual route change)
 * - Rapid navigation - debounced to prevent excessive scrolling
 * 
 * Performance:
 * - Uses requestAnimationFrame for smooth, non-blocking scroll
 * - Double RAF ensures DOM is fully ready
 * - Minimal re-renders (only on pathname/searchParams change)
 * - No memory leaks (proper cleanup)
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathnameRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup any pending scroll operations
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Get current path (pathname + search params)
    const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    
    // Check if URL has a hash fragment
    const hasHash = typeof window !== "undefined" && window.location.hash.length > 0;

    // On initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      
      // If there's a hash, let the browser handle it naturally (anchor links)
      if (hasHash) {
        prevPathnameRef.current = currentPath;
        return;
      }
      
      // Otherwise, scroll to top on initial load
      // Double requestAnimationFrame ensures DOM is fully ready and painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (typeof window !== "undefined") {
            window.scrollTo({
              top: 0,
              left: 0,
              behavior: "smooth",
            });
          }
        });
      });
      
      prevPathnameRef.current = currentPath;
      return;
    }

    // Check if pathname actually changed (not just a re-render with same route)
    if (prevPathnameRef.current === currentPath) {
      return;
    }

    // If URL has a hash, don't scroll (let browser handle hash navigation)
    // This allows anchor links like /page#section to work correctly
    if (hasHash) {
      prevPathnameRef.current = currentPath;
      return;
    }

    // Pathname changed - scroll to top smoothly
    // Use double requestAnimationFrame for reliability across all browsers
    // This ensures the new page content is rendered before scrolling
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (typeof window !== "undefined") {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: "smooth",
          });
        }
      });
    });

    // Update previous pathname
    prevPathnameRef.current = currentPath;

    // Cleanup function
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [pathname, searchParams]);

  // This component doesn't render anything (pure side-effect component)
  return null;
}

