"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  name?: string;
  value?: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function SearchableSelect({
  label,
  name,
  value,
  options,
  onChange,
  onBlur,
  error,
  helperText,
  required,
  disabled,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Find selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search term
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dropdown position when opening or scrolling
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 8, // 8px spacing, getBoundingClientRect is viewport-relative (perfect for fixed positioning)
            left: rect.left,
            width: rect.width,
          });
        }
      };

      // Initial position
      updatePosition();

      // Update on scroll/resize to keep dropdown aligned with trigger
      window.addEventListener("scroll", updatePosition, true); // Use capture phase to catch all scrolls
      window.addEventListener("resize", updatePosition);

      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
        if (onBlur) onBlur();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onBlur]);

  // Handle option selection
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
    if (onBlur) onBlur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    } else if (e.key === "Enter" && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          name={name}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "w-full px-4 py-3 border rounded-lg shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
            "transition-all duration-200",
            "bg-white",
            "flex items-center justify-between",
            error
              ? "border-red-400 bg-red-50 focus:ring-red-500 focus:border-red-500"
              : "border-slate-300 hover:border-emerald-400 hover:border-2",
            disabled && "bg-slate-50 text-slate-500 cursor-not-allowed hover:border-slate-300",
            isOpen && !error && "border-emerald-500 border-2"
          )}
        >
          <span className={cn(
            "text-left truncate",
            !selectedOption && "text-slate-400"
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2",
              isOpen && "transform rotate-180 text-emerald-600"
            )}
          />
        </button>

        {/* Dropdown - Rendered via Portal to avoid overflow clipping */}
        {mounted && dropdownPosition && createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setIsOpen(false)}
                />
                
                {/* Dropdown Content */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="fixed z-[9999] bg-white border-2 border-emerald-100 rounded-lg shadow-xl overflow-hidden"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                    maxHeight: "calc(100vh - " + (dropdownPosition.top + 16) + "px)", // Prevent going off-screen
                  }}
                >
                {/* Search Input */}
                <div className="p-3 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/50 to-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-600" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={searchPlaceholder}
                      className={cn(
                        "w-full pl-10 pr-8 py-2.5 border rounded-lg",
                        "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
                        "text-sm text-slate-900 placeholder-slate-400",
                        "bg-white border-emerald-200"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {searchTerm && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchTerm("");
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-emerald-50 rounded"
                      >
                        <X className="w-4 h-4 text-emerald-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Options List */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredOptions.length > 0 ? (
                    <div className="p-1">
                      {filteredOptions.map((option) => {
                        const isSelected = option.value === value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSelect(option.value)}
                            className={cn(
                              "w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-150",
                              "flex items-center justify-between",
                              "hover:bg-emerald-50 hover:text-emerald-900",
                              isSelected && "bg-emerald-50 text-emerald-900 font-medium"
                            )}
                          >
                            <span className="truncate">{option.label}</span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      <p>No banks found</p>
                      <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                  )}
                </div>

                {/* Footer with count */}
                {filteredOptions.length > 0 && (
                  <div className="px-4 py-2 border-t border-emerald-100 bg-emerald-50/30">
                    <p className="text-xs text-emerald-700 font-medium">
                      {filteredOptions.length} {filteredOptions.length === 1 ? "bank" : "banks"} found
                    </p>
                  </div>
                )}
              </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center">
          <span className="mr-1">⚠</span>
          {error}
        </p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{helperText}</p>
      )}
    </div>
  );
}

