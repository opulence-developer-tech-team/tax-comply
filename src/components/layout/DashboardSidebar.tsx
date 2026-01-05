"use client";

import React, { useState, useCallback, useRef, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  X,
  ChevronDown,
  LucideIcon,
} from "lucide-react"; // User icon removed - no longer needed
import { AccountType } from "@/lib/utils/account-type";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Company {
  _id: string;
  name: string;
}

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  showFor: AccountType[];
}

export interface User {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accountType: AccountType;
  companies: Company[];
  selectedCompanyId: string | null;
  onCompanySwitch: (companyId: string) => void;
  businesses?: Company[]; // Reuse Company interface for businesses
  selectedBusinessId?: string | null;
  onBusinessSwitch?: (businessId: string) => void;
  navigationItems: NavigationItem[];
  className?: string;
}

// ============================================================================
// COMPONENT - DashboardSidebar
// ============================================================================

export const DashboardSidebar = memo(function DashboardSidebar({
  isOpen,
  onClose,
  user,
  accountType,
  companies,
  selectedCompanyId,
  onCompanySwitch,
  businesses = [],
  selectedBusinessId = null,
  onBusinessSwitch,
  navigationItems,
  className = "",
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ==========================================================================
  // CLICK OUTSIDE HANDLER
  // ==========================================================================
  
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [accountMenuOpen]);

  // ==========================================================================
  // KEYBOARD NAVIGATION
  // ==========================================================================
  
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (accountMenuOpen) {
          setAccountMenuOpen(false);
          buttonRef.current?.focus();
        } else if (isOpen) {
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [accountMenuOpen, isOpen, onClose]);

  // ==========================================================================
  // COMPANY/BUSINESS SELECTION HANDLER
  // ==========================================================================
  
  const handleCompanySelect = useCallback(
    (companyId: string) => {
      onCompanySwitch(companyId);
      setAccountMenuOpen(false);
      buttonRef.current?.focus();
    },
    [onCompanySwitch]
  );

  const handleEntitySelect = useCallback(
    (entityId: string) => {
      if (accountType === AccountType.Business && onBusinessSwitch) {
        onBusinessSwitch(entityId);
      } else {
        onCompanySwitch(entityId);
      }
      setAccountMenuOpen(false);
      buttonRef.current?.focus();
    },
    [accountType, onBusinessSwitch, onCompanySwitch]
  );

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  
  const selectedCompany = companies.find(
    (c) => c._id === selectedCompanyId
  );
  const selectedBusiness = businesses.find(
    (b) => b._id === selectedBusinessId
  );
  const hasMultipleCompanies = accountType === AccountType.Company && companies.length > 1;
  const hasMultipleBusinesses = accountType === AccountType.Business && businesses.length > 1;
  const entityToShow = accountType === AccountType.Business ? businesses : companies;
  const selectedEntity = accountType === AccountType.Business ? selectedBusiness : selectedCompany;
  const selectedEntityId = accountType === AccountType.Business ? selectedBusinessId : selectedCompanyId;
  const hasMultipleEntities = accountType === AccountType.Business ? hasMultipleBusinesses : hasMultipleCompanies;
  const onEntitySwitch = accountType === AccountType.Business ? onBusinessSwitch : onCompanySwitch;

  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  return (
    <>
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-50 lg:hidden"
          >
            <motion.div
              variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/25 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              variants={{ closed: { x: "-100%" }, open: { x: 0 } }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col"
            >
          {/* Mobile Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-md flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                {selectedEntity ? (
                  <span className="text-sm font-semibold bg-gradient-to-r from-emerald-700 to-emerald-600 bg-clip-text text-transparent">
                    {selectedEntity.name}
                  </span>
                ) : (
                  <span className="text-sm font-semibold bg-gradient-to-r from-emerald-700 to-emerald-600 bg-clip-text text-transparent">TaxComply</span>
                )}
                <span className="text-xs text-gray-500">Dashboard</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600"
              aria-label="Close sidebar"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Sidebar Content */}
          <nav className="flex-1 overflow-y-auto pb-4">
            {/* Company/Business Switcher */}
            {hasMultipleEntities && (
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="relative" ref={dropdownRef}>
                  <button
                    ref={buttonRef}
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-200"
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="listbox"
                    type="button"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="truncate text-left">
                        {selectedEntity?.name || (accountType === AccountType.Business ? "Select Business" : "Select Company")}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[300] max-h-60 overflow-y-auto">
                      {entityToShow.map((entity) => {
                        const isSelected = selectedEntityId === entity._id;
                        return (
                          <button
                            key={entity._id}
                            onClick={() => handleEntitySelect(entity._id)}
                            className={`
                              w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                              ${isSelected
                                ? 'bg-gray-100 text-gray-900 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                              }
                            `}
                            role="option"
                            aria-selected={isSelected}
                            type="button"
                          >
                            <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-gray-600' : 'text-gray-400'}`} />
                            <span className="truncate">{entity.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <div className="px-4 py-3">
              <div className="flex flex-col gap-1">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const IconComponent = item.icon;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center px-4 py-3 text-base font-medium transition-colors ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <IconComponent className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:flex lg:w-64 lg:flex-col ${className}`}>
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
          {/* Desktop Sidebar Header */}
          <div className="flex items-center h-16 px-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-md flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                {selectedEntity ? (
                  <span className="text-sm font-semibold bg-gradient-to-r from-emerald-700 to-emerald-600 bg-clip-text text-transparent truncate" title={selectedEntity.name}>
                    {selectedEntity.name}
                  </span>
                ) : (
                  <span className="text-sm font-semibold bg-gradient-to-r from-emerald-700 to-emerald-600 bg-clip-text text-transparent">TaxComply</span>
                )}
                <span className="text-xs text-gray-500">Dashboard</span>
              </div>
            </div>
          </div>

          {/* Desktop Sidebar Content */}
          <nav className="flex-1 overflow-y-auto pb-4">
            {/* Company/Business Switcher */}
            {hasMultipleEntities && (
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="relative" ref={dropdownRef}>
                  <button
                    ref={buttonRef}
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors border border-gray-200"
                    aria-expanded={accountMenuOpen}
                    aria-haspopup="listbox"
                    type="button"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
                      <span className="truncate text-left">
                        {selectedEntity?.name || (accountType === AccountType.Business ? "Select Business" : "Select Company")}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {accountMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[300] max-h-60 overflow-y-auto">
                      {entityToShow.map((entity) => {
                        const isSelected = selectedEntityId === entity._id;
                        return (
                          <button
                            key={entity._id}
                            onClick={() => handleEntitySelect(entity._id)}
                            className={`
                              w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                              ${isSelected
                                ? 'bg-gray-100 text-gray-900 font-medium'
                                : 'text-gray-700 hover:bg-gray-50'
                              }
                            `}
                            role="option"
                            aria-selected={isSelected}
                            type="button"
                          >
                            <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-gray-600' : 'text-gray-400'}`} />
                            <span className="truncate">{entity.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Menu */}
            <div className="px-4 py-3">
              <div className="flex flex-col gap-1">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const IconComponent = item.icon;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center px-4 py-3 text-base font-medium transition-colors ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border-r-2 border-emerald-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <IconComponent className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
});

DashboardSidebar.displayName = "DashboardSidebar";
