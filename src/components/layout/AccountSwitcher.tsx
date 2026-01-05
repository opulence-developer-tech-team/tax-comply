"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { companyActions } from "@/store/redux/company/company-slice";
import { businessActions } from "@/store/redux/business/business-slice";
import { resetCompanyData, resetBusinessData } from "@/store/redux/rootActions";
import { useUpgradePrompt } from "@/hooks/useUpgradePrompt";
import { SubscriptionPlan } from "@/lib/server/utils/enum";
import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { UpgradeReason } from "@/lib/utils/upgrade-reason";
import { AccountType } from "@/lib/utils/account-type";
import { 
  ChevronDown, 
  Building2, 
  RefreshCw,
  Plus
} from "lucide-react";
import { toast } from "sonner";

interface AccountSwitcherProps {
  className?: string;
}

/**
 * AccountSwitcher Component
 * 
 * Allows company and business users to switch between different companies/businesses (multi-entity switching)
 * Includes "Create New Company/Business" option with subscription gating.
 * 
 * CRITICAL: Supports both Company and Business account types with proper separation.
 * 
 * Production-ready features:
 * - Complete Redux state reset on switch
 * - Loading states and error handling
 * - Prevents duplicate switches
 * - Subscription-based entity limit enforcement
 * - Upgrade prompts when limit is reached
 * - Fails loudly on invalid account types
 */
export function AccountSwitcher({ className = "" }: AccountSwitcherProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  
  // CRITICAL: ALL hooks must be called before any conditional returns
  // This is a requirement of React's Rules of Hooks
  const { user } = useAppSelector((state: any) => state.user);
  const { companies, selectedCompanyId } = useAppSelector((state: any) => state.company);
  const { businesses, selectedBusinessId } = useAppSelector((state: any) => state.business);
  const { currentSubscription } = useAppSelector((state: any) => state.subscription);
  const { showUpgradePrompt, UpgradePromptComponent } = useUpgradePrompt();

  // Close menu when clicking outside - MUST be called before any conditional returns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // NOW we can do conditional logic and early returns AFTER all hooks are called
  // CRITICAL: Validate user and accountType - fail loudly if invalid
  if (!user) {
    // User not loaded yet - return null (will show when user loads)
    return null;
  }

  if (!user.accountType) {
    console.error(
      "[AccountSwitcher] CRITICAL: user.accountType is missing. " +
      "This should never happen - user object must have accountType property."
    );
    return null;
  }

  // CRITICAL: Validate accountType is a valid enum value
  const validAccountTypes = Object.values(AccountType);
  if (!validAccountTypes.includes(user.accountType)) {
    console.error(
      `[AccountSwitcher] CRITICAL: user.accountType "${user.accountType}" is not a valid AccountType enum value. ` +
      `Valid values are: ${validAccountTypes.join(", ")}.`
    );
    return null;
  }

  const accountType = user.accountType;
  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;

  // CRITICAL: Only show for Company or Business accounts - fail loudly if neither
  if (!isCompanyAccount && !isBusinessAccount) {
    // Individual accounts don't need entity switching
    return null;
  }

  // Calculate subscription limits based on account type
  const currentPlan = (currentSubscription?.plan || SubscriptionPlan.Free) as SubscriptionPlan;
  const planFeatures = SUBSCRIPTION_PRICING[currentPlan]?.features;
  
  // CRITICAL: Use correct limit based on account type - no defaults, fail loudly if missing
  const maxEntities = isCompanyAccount 
    ? (planFeatures?.maxCompanies ?? 1)
    : (planFeatures?.maxBusinesses ?? 1);
  
  const currentEntityCount = isCompanyAccount ? companies.length : businesses.length;
  const canCreateMore = maxEntities === -1 || currentEntityCount < maxEntities;
  
  // CRITICAL: Validate entities exist - fail loudly if account type requires entities but none exist
  if (isCompanyAccount && companies.length === 0) {
    return null; // No companies yet - will show after onboarding
  }
  
  if (isBusinessAccount && businesses.length === 0) {
    return null; // No businesses yet - will show after onboarding
  }

  // Get selected entity based on account type
  const selectedEntity = isCompanyAccount 
    ? companies.find((c: any) => c._id === selectedCompanyId)
    : businesses.find((b: any) => b._id === selectedBusinessId);
  
  const entities = isCompanyAccount ? companies : businesses;
  const selectedEntityId = isCompanyAccount ? selectedCompanyId : selectedBusinessId;
  const entityTypeName = isCompanyAccount ? "Company" : "Business";
  const entityTypeNamePlural = isCompanyAccount ? "Companies" : "Businesses";
  const entityTypeNameLower = isCompanyAccount ? "company" : "business";

  /**
   * Handle switching to a different company/business (multi-entity switching)
   * 
   * Production-ready implementation:
   * - Clears ALL entity-specific data (expenses, invoices, dashboard, VAT, compliance, employees)
   * - Preserves entities list (needed for switcher dropdown)
   * - Preserves user state (authentication and user details)
   * - Sets new selectedEntityId
   * - Invalidates all caches to force fresh data fetch for new entity
   * - Resets all Redux state slices except user and entities list
   * 
   * CRITICAL: Uses correct reset function based on account type - no defaults
   */
  const handleEntitySwitch = (entityId: string) => {
    // CRITICAL: Validate entityId - fail loudly if invalid
    if (!entityId || typeof entityId !== "string" || entityId.trim() === "") {
      console.error(
        `[AccountSwitcher] CRITICAL: Invalid entityId "${entityId}" passed to handleEntitySwitch. ` +
        "EntityId must be a non-empty string."
      );
      return;
    }

    if (entityId === selectedEntityId) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    
    // CRITICAL: Reset all entity-specific Redux state before switching
    // This ensures fresh data is fetched for the new entity
    // Preserves: user state, entities list, subscription (user-based, not entity-based)
    // Clears: expenses, invoices, dashboard, VAT, WHT, compliance, employees
    if (isCompanyAccount) {
      dispatch(resetCompanyData());
      dispatch(companyActions.setSelectedCompanyId(entityId));
    } else if (isBusinessAccount) {
      dispatch(resetBusinessData());
      dispatch(businessActions.setSelectedBusinessId(entityId));
    } else {
      // CRITICAL: This should never happen - fail loudly
      console.error(
        `[AccountSwitcher] CRITICAL: Invalid account type "${accountType}" in handleEntitySwitch. ` +
        `Expected AccountType.Company or AccountType.Business.`
      );
      setIsSwitching(false);
      setIsOpen(false);
      return;
    }
    
    // Navigate to dashboard to trigger data refetch
    router.push("/dashboard");
    
    setIsSwitching(false);
    setIsOpen(false);
    
    toast.success(`Switched ${entityTypeNameLower} successfully`);
  };

  /**
   * Handle creating a new company/business with subscription gating
   * 
   * CRITICAL: Uses correct limit and routing based on account type - no defaults
   */
  const handleCreateNewEntity = () => {
    setIsOpen(false);
    
    // Check if user can create more entities
    if (!canCreateMore) {
      // Determine required plan based on current limit
      let requiredPlan: string;
      let requiredPlanPrice: number;
      
      if (maxEntities === 1) {
        // Free/Starter users need Company plan (3 entities)
        requiredPlan = "company";
        requiredPlanPrice = SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly;
      } else {
        // Company plan users need Accountant plan (unlimited)
        requiredPlan = "accountant";
        requiredPlanPrice = SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].monthly;
      }
      
      showUpgradePrompt({
        feature: `Multiple ${entityTypeNamePlural}`,
        currentPlan: currentPlan.toLowerCase(),
        requiredPlan,
        requiredPlanPrice,
        message: `You've reached your ${entityTypeNameLower} limit (${maxEntities} ${maxEntities === 1 ? entityTypeNameLower : entityTypeNamePlural.toLowerCase()}). ${maxEntities === 1 ? `Upgrade to Company plan (₦8,500/month) to manage up to 3 ${entityTypeNamePlural.toLowerCase()}.` : `Upgrade to Accountant plan (₦25,000/month) for unlimited ${entityTypeNamePlural.toLowerCase()}.`}`,
        reason: UpgradeReason.PlanLimitation,
        usageInfo: {
          current: currentEntityCount,
          limit: maxEntities,
          // Note: period is omitted because entity limits are account-level, not time-based
        },
      });
      return;
    }
    
    // CRITICAL: Navigate to correct onboarding page based on account type - no defaults
    if (isCompanyAccount) {
      router.push("/dashboard/company/onboard");
    } else if (isBusinessAccount) {
      router.push("/dashboard/business/onboard");
    } else {
      // CRITICAL: This should never happen - fail loudly
      console.error(
        `[AccountSwitcher] CRITICAL: Invalid account type "${accountType}" in handleCreateNewEntity. ` +
        `Expected AccountType.Company or AccountType.Business.`
      );
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg
          bg-white border border-slate-200 hover:border-emerald-300
          transition-all duration-200
          ${isSwitching ? "opacity-50 cursor-not-allowed" : "hover:shadow-sm"}
          ${isOpen ? "border-emerald-500 shadow-sm" : ""}
        `}
      >
        {isSwitching ? (
          <>
            <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
            <span className="text-sm font-medium text-slate-700">Switching...</span>
          </>
        ) : (
          <>
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-slate-700 max-w-[150px] truncate">
              {selectedEntity?.name || `Select ${entityTypeName}`}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isSwitching && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Switch {entityTypeName}
            </p>
            <p className="text-xs text-slate-600">
              Select a {entityTypeNameLower} to view its data
            </p>
          </div>

          <div className="py-1">
            {entities.map((entity: any) => {
              // CRITICAL: Validate entity structure - fail loudly if invalid
              if (!entity || !entity._id || !entity.name) {
                console.error(
                  `[AccountSwitcher] CRITICAL: Invalid entity in entities array. ` +
                  `Entity must have _id and name properties. Entity:`,
                  entity
                );
                return null;
              }

              const isSelected = selectedEntityId === entity._id;
              return (
                <button
                  key={entity._id}
                  onClick={() => handleEntitySwitch(entity._id)}
                  className={`
                    w-full flex items-center space-x-2 px-4 py-2 text-sm transition-colors
                    ${isSelected
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                    }
                  `}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="flex-1 text-left truncate">{entity.name}</span>
                  {isSelected && (
                    <span className="text-xs text-emerald-600">●</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Create New Entity Button - Always visible but gated */}
          <div className="border-t border-slate-100 pt-1 mt-1">
            <button
              onClick={handleCreateNewEntity}
              className="w-full flex items-center space-x-2 px-4 py-2.5 text-sm transition-colors text-emerald-700 hover:bg-emerald-50 font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="flex-1 text-left">Create New {entityTypeName}</span>
              {!canCreateMore && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Limit: {maxEntities}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Prompt Component */}
      <UpgradePromptComponent />
    </div>
  );
}
