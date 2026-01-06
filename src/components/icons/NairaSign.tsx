import React, { forwardRef } from "react";
import { LucideProps } from "lucide-react";

export const NairaSign = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        ref={ref}
        {...props}
      >
        <line x1="4" x2="20" y1="7" y2="7" />
        <line x1="4" x2="20" y1="17" y2="17" />
        <path d="M6 4v16" />
        <path d="M18 4v16" />
        <path d="M6 4l12 16" />
      </svg>
    );
  }
);

NairaSign.displayName = "NairaSign";
