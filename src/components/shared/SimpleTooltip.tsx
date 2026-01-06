"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";

/**
 * SimpleTooltip Component
 * 
 * A reusable tooltip component that uses fixed positioning to escape overflow containers.
 * Perfect for explaining values, terms, and concepts to users.
 * 
 * @example
 * <SimpleTooltip
 *   content={
 *     <div>
 *       <p className="font-semibold mb-1">What is this?</p>
 *       <p>This is an explanation...</p>
 *     </div>
 *   }
 * >
 *   <HelpCircle className="w-4 h-4" />
 * </SimpleTooltip>
 */
interface SimpleTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  /**
   * Optional custom width for the tooltip (default: w-72)
   */
  width?: string;
  /**
   * Optional custom max width for responsive behavior (default: max-w-[90vw])
   */
  maxWidth?: string;
}

export function SimpleTooltip({ 
  children, 
  content,
  width = "w-72",
  maxWidth = "max-w-[90vw]",
}: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // CRITICAL: For fixed positioning, use viewport coordinates directly
      // getBoundingClientRect() returns viewport-relative coordinates
      // Fixed positioning is also viewport-relative, so no scroll offset needed
      setPosition({
        top: rect.bottom + 8, // 8px gap below trigger
        left: rect.left + rect.width / 2, // Center horizontally
      });
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();
      
      // Close on click outside (Critical for mobile)
      const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
          setIsVisible(false);
        }
      };

      // CRITICAL: Use capture phase (true) to catch all scroll events
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside); // For iOS responsiveness

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
        document.removeEventListener("click", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [isVisible, updatePosition]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={(e) => {
          e.stopPropagation();
          updatePosition();
          setIsVisible(true);
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          setIsVisible(false);
        }}
        onFocus={() => {
          updatePosition();
          setIsVisible(true);
        }}
        onBlur={() => setIsVisible(false)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault(); // Prevent ghost clicks
          updatePosition();
          // Mobile Support: Force open on click to prevent focus/hover conflicts
          // Closing is handled by the document click-outside listener
          setIsVisible(true);
        }}
        className="relative inline-block cursor-help z-10"
        role="button"
        tabIndex={0}
        aria-label="Show explanation"
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="fixed pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: "translateX(-50%)",
            zIndex: 99999,
          }}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          <div className={`bg-slate-900 text-white text-xs rounded-lg py-2 px-3 ${width} shadow-xl pointer-events-auto ${maxWidth}`}>
            {content}
            <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900"></div>
          </div>
        </div>
      )}
    </>
  );
}






