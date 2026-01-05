"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAuthInit } from "@/hooks/useAuthInit";
import { companyActions } from "@/store/redux/company/company-slice";
import { businessActions } from "@/store/redux/business/business-slice";
import { subscriptionActions } from "@/store/redux/subscription/subscription-slice";
import { resetCompanyData } from "@/store/redux/rootActions";
import { AccountSwitcher } from "./AccountSwitcher";
import { DashboardSidebar, type NavigationItem } from "./DashboardSidebar";
import { LoadingState } from "@/components/shared/LoadingState";
import { AccountType } from "@/lib/utils/account-type";
import { HttpMethod } from "@/lib/utils/http-method";
import { LoadingStateSize, SharePromptPosition, ErrorType } from "@/lib/utils/client-enums";
import { ErrorState, NetworkErrorState } from "@/components/shared/ErrorState";
import { SharePrompt } from "@/components/shared/SharePrompt";
import { useEngagementTracking } from "@/hooks/useEngagementTracking";
import { LogoutConfirmationModal } from "@/components/shared/LogoutConfirmationModal";
import { performLogout } from "@/lib/utils/logout";
import {
  LayoutDashboard,
  Building2,
  FileText,
  DollarSign,
  Wallet,
  Users,
  CheckCircle2,
  CreditCard,
  UserPlus,
  Settings,
  Menu,
  LogOut,
  MapPin,
  TrendingDown,
  TrendingUp,
  FileCheck,
  Receipt,
  Calculator,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  // Redux state - companies are stored here after fetch
  const { companies, selectedCompanyId, hasFetched: hasFetchedCompany, error: companyError } = useAppSelector(
    (state: any) => state.company
  );
  
  // Redux state - businesses are stored here after fetch
  const { businesses, selectedBusinessId, hasFetched: hasFetchedBusiness, error: businessError } = useAppSelector(
    (state: any) => state.business
  );
  
  // Use centralized auth initialization hook
  // This handles rehydration, token validation, and provides single source of truth
  const { isInitialized: isAuthInitialized, isAuthenticated, user } = useAuthInit();
  
  const accountType = user?.accountType;
  const isIndividualAccount = accountType === AccountType.Individual;
  const isCompanyAccount = accountType === AccountType.Company;
  const isBusinessAccount = accountType === AccountType.Business;
  
  // Local state for company fetch (useHttp provides isLoading/error)
  // NOTE: Individual and Business accounts don't need company fetch - this will be skipped
  const { isLoading: isFetchingCompanies, error: fetchError, sendHttpRequest: fetchCompanyReq, clearError } = useHttp();
  
  // Local state for business fetch (useHttp provides isLoading/error)
  // NOTE: Individual and Company accounts don't need business fetch - this will be skipped
  const { isLoading: isFetchingBusinesses, error: fetchBusinessError, sendHttpRequest: fetchBusinessReq, clearError: clearBusinessError } = useHttp();
  
  // Subscription fetch (user-based, works for both individual and company accounts)
  const { sendHttpRequest: fetchSubscriptionReq } = useHttp();
  
  // Get subscription state from Redux
  const { currentSubscription, hasFetched: hasFetchedSubscription, isLoading: isLoadingSubscription } = useAppSelector((state: any) => state.subscription);

  // Log component mount and state on every render
  console.log("[DashboardLayout] 🎨 Component render", {
    isAuthInitialized,
    isAuthenticated,
    user: user ? { id: user._id, email: user.email, accountType: user.accountType } : null,
    accountType,
    isIndividualAccount,
    hasFetchedCompany,
    companiesCount: companies.length,
    selectedCompanyId,
    isFetchingCompanies,
    fetchError: fetchError ? (fetchError.message || String(fetchError)).substring(0, 50) : null,
    pathname,
    timestamp: new Date().toISOString(),
  });
  
  // Engagement tracking for share prompt
  const { shouldShow: shouldShowPrompt } = useEngagementTracking({
    minEngagementMinutes: 5,
    dismissalCooldownDays: 7,
    storageKey: "taxcomply_share_prompt_dismissed",
  });
  
  // Handle share prompt visibility
  useEffect(() => {
    if (shouldShowPrompt && user && !isFetchingCompanies) {
      setShowSharePrompt(true);
    }
  }, [shouldShowPrompt, user, isFetchingCompanies]);
  
  // Handle share prompt dismissal
  const handleDismissSharePrompt = useCallback(() => {
    setShowSharePrompt(false);
    
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "taxcomply_share_prompt_dismissed",
          JSON.stringify({
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        console.error("Failed to save dismissal state:", error);
      }
    }
  }, []);
  
  const { sendHttpRequest: logoutReq } = useHttp();

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    
    try {
      // Attempt to call logout API (optional - logout works even if API fails)
      await new Promise<void>((resolve) => {
        logoutReq({
          successRes: () => {
            resolve();
          },
          errorRes: () => {
            // Even if API fails, proceed with logout
            resolve();
            return false; // Don't show error toast
          },
          requestConfig: {
            url: "/auth/logout",
            method: HttpMethod.POST,
          },
        });
      });
    } catch (error) {
      // Ignore API errors - proceed with logout anyway
      console.warn("Logout API call failed, proceeding with local logout:", error);
    }
    
    // Use centralized logout function
    try {
      await performLogout({
        dispatch,
        router: {
          push: router.push.bind(router),
          replace: router.replace?.bind(router),
        },
        currentPathname: pathname || undefined,
        saveRedirectPath: true, // Save redirect path for session restoration
        redirectPath: "/sign-in",
        isAdmin: false,
      });
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // Navigation items
  const allNavigationItems: NavigationItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, showFor: [AccountType.Company, AccountType.Individual, AccountType.Business] },
    { name: "Expenses", href: "/dashboard/expenses", icon: TrendingDown, showFor: [AccountType.Individual, AccountType.Company] }, // Expenses for Individual and Company accounts
    { name: "Expenses", href: "/dashboard/business/expenses", icon: TrendingDown, showFor: [AccountType.Business] }, // Expenses for Business accounts
    { name: "Income", href: "/dashboard/income", icon: TrendingUp, showFor: [AccountType.Individual] }, // Income management for individual accounts
    { name: "Remittances", href: "/dashboard/pit/remittances", icon: Receipt, showFor: [AccountType.Individual] }, // PIT remittances for individual accounts (separate page)
    // CRITICAL: Business accounts no longer need separate remittances page - remittances are managed directly on PIT page
    { name: "Company", href: "/dashboard/company", icon: Building2, showFor: [AccountType.Company] },
    { name: "Business", href: "/dashboard/business", icon: Building2, showFor: [AccountType.Business] },
    { name: "Invoices", href: "/dashboard/invoices", icon: FileText, showFor: [AccountType.Company] }, // Invoices for Company accounts
    { name: "Invoices", href: "/dashboard/business/invoices", icon: FileText, showFor: [AccountType.Business] }, // Invoices for Business accounts
    { name: "Value Added Tax", href: "/dashboard/vat", icon: DollarSign, showFor: [AccountType.Company] }, // VAT for Company accounts
    { name: "Value Added Tax", href: "/dashboard/business/vat", icon: DollarSign, showFor: [AccountType.Business] }, // VAT for Business accounts
    { name: "Withholding Tax", href: "/dashboard/wht", icon: Receipt, showFor: [AccountType.Company] }, // WHT for Company accounts
    { name: "Withholding Tax", href: "/dashboard/business/wht", icon: Receipt, showFor: [AccountType.Business] }, // WHT for Business accounts
    { name: "Company Income Tax", href: "/dashboard/cit", icon: Building2, showFor: [AccountType.Company] }, // Company Income Tax - ONLY for Company accounts (Business uses PIT)
    { name: "Personal Income Tax", href: "/dashboard/pit", icon: Calculator, showFor: [AccountType.Individual] }, // Personal Income Tax for individual accounts
    { name: "Personal Income Tax", href: "/dashboard/business/pit", icon: Calculator, showFor: [AccountType.Business] }, // Personal Income Tax for business accounts (sole proprietorships use PIT, not CIT)
    { name: "Payroll", href: "/dashboard/payroll", icon: Wallet, showFor: [AccountType.Company] }, // Payroll for Company accounts
    { name: "Payroll", href: "/dashboard/business/payroll", icon: Wallet, showFor: [AccountType.Business] }, // Payroll for Business accounts
    { name: "Employees", href: "/dashboard/employees", icon: Users, showFor: [AccountType.Company] }, // Employees for Company accounts
    { name: "Employees", href: "/dashboard/business/employees", icon: Users, showFor: [AccountType.Business] }, // Employees for Business accounts
    { name: "Tax Filing", href: "/dashboard/tax-filing", icon: FileCheck, showFor: [AccountType.Company, AccountType.Individual] }, // Tax Filing for Individual and Company accounts
    { name: "Tax Filing", href: "/dashboard/business/tax-filing", icon: FileCheck, showFor: [AccountType.Business] }, // Tax Filing for Business accounts
    { name: "Tax Status", href: "/dashboard/compliance", icon: CheckCircle2, showFor: [AccountType.Company] }, // Compliance for Company accounts
    { name: "Tax Status", href: "/dashboard/business/compliance", icon: CheckCircle2, showFor: [AccountType.Business] }, // Compliance for Business accounts
    { name: "Referrals", href: "/dashboard/referrals", icon: UserPlus, showFor: [AccountType.Company, AccountType.Individual, AccountType.Business] },
    { name: "Subscription", href: "/dashboard/subscription", icon: CreditCard, showFor: [AccountType.Company, AccountType.Individual, AccountType.Business] },
    { name: "Settings", href: "/dashboard/settings", icon: Settings, showFor: [AccountType.Company, AccountType.Individual, AccountType.Business] },
  ];

  const navigation = allNavigationItems.filter(item => item.showFor.includes(accountType));

  /**
   * Fetch companies for the authenticated user
   * 
   * CRITICAL: This must complete BEFORE rendering children or navigating.
   * 
   * State Management:
   * - Success (200): setCompanies() → hasFetched = true, companies = data
   * - No Company (404): setCompanies([]) → hasFetched = true, companies = []
   * - Errors (Network/500): Keep hasFetched = false, show error UI with retry
   * 
   * Only mark as fetched on successful response (200) or explicit "not found" (404).
   * Do NOT mark as fetched on transient errors - user can retry.
   */
  const fetchCompanies = useCallback(() => {
    console.log("[DashboardLayout] 🚀 fetchCompanies called", {
      accountType,
      isIndividualAccount,
      isFetchingCompanies,
      timestamp: new Date().toISOString(),
    });

    // Guard: Only fetch for company accounts
    // Individual accounts don't need companies - skip entirely
    if (isIndividualAccount || accountType !== "company") {
      console.log("[DashboardLayout] ⛔ fetchCompanies: Not company account, aborting", {
        accountType,
        isIndividualAccount,
      });
      return;
    }
    
    // FIXED: Removed isFetchingCompanies guard here - let the HTTP layer handle duplicates
    // The useHttp hook will prevent duplicate concurrent requests
    
    // Clear any previous errors before fetching
    clearError();
    
    // CRITICAL: Set loading state in Redux so child components (like dashboard page) know we're fetching
    // This prevents infinite loading states in child components
    dispatch(companyActions.setLoading(true));
    
    console.log("[DashboardLayout] 📡 fetchCompanies: Starting HTTP request to /company/list");
    
    fetchCompanyReq({
      successRes: (response: any) => {
        const responseData = response?.data?.data || {};
        const companiesList = responseData.companies || responseData || []; // Support both old and new format
        const subscription = responseData.subscription || null;
        
        console.log("[DashboardLayout] ✅ fetchCompanies: Success", {
          count: companiesList.length,
          companies: companiesList.map((c: any) => ({ id: c._id, name: c.name })),
          hasSubscription: !!subscription,
          subscriptionPlan: subscription?.plan,
          timestamp: new Date().toISOString(),
        });
        
        // Success: Mark as fetched and set companies
        // setCompanies automatically sets hasFetched = true and isLoading = false
        dispatch(companyActions.setCompanies(companiesList));
        
        // CRITICAL: Subscription is now in its own slice (user-based, not company-based)
        // If subscription comes with company list, store it in subscription slice
        // But we also fetch it separately to ensure it works for individual accounts
        if (subscription) {
          dispatch(subscriptionActions.setCurrentSubscription(subscription));
        }
        
        console.log("[DashboardLayout] ✅ fetchCompanies: Redux state updated (hasFetched = true)");
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status;
        const errorDescription = errorResponse?.data?.description || "";
        console.log("[DashboardLayout] ❌ fetchCompanies: Error", {
          status,
          message: errorDescription,
          timestamp: new Date().toISOString(),
        });
        
        // 403 = Account type mismatch (permanent error - user is Individual, not Company)
        // 404 = User not found or other permanent error (should not happen, but handle gracefully)
        // Mark as fetched with error state to prevent infinite retries
        if (status === 403 || status === 404) {
          const errorMessage = errorDescription || (status === 403 
            ? "This feature is only available for Company accounts" 
            : "User not found or account error");
          console.log("[DashboardLayout] 🛑 fetchCompanies: Permanent error (403/404), marking as fetched with error to prevent retries", {
            status,
            errorMessage,
          });
          // CRITICAL: Set companies first (sets hasFetched=true, but clears error)
          // Then set error after (Redux actions are synchronous, so this works)
          dispatch(companyActions.setCompanies([]));
          dispatch(companyActions.setError(errorMessage));
          return true; // Suppress error toast - we'll show ErrorState instead
        }
        
        // Network errors, 500, etc. = Transient errors
        // Set error state and clear loading (DO NOT mark as fetched to allow retry)
        console.log("[DashboardLayout] ⚠️  fetchCompanies: Transient error, setting error state (hasFetched remains false to allow retry)");
        dispatch(companyActions.setError(
          errorDescription || "Failed to load companies"
        ));
        return true; // Suppress error toast - we'll show ErrorState instead
      },
      requestConfig: {
        url: "/company/list",
        method: HttpMethod.GET,
      },
    });
    // FIXED: Removed isFetchingCompanies from deps - it was causing the callback to recreate unnecessarily
    // The useHttp hook handles duplicate prevention internally
  }, [accountType, isIndividualAccount, dispatch, fetchCompanyReq, clearError, isFetchingCompanies]);

  /**
   * Fetch businesses for the authenticated user
   * 
   * CRITICAL: This must complete BEFORE rendering children or navigating.
   * 
   * State Management:
   * - Success (200): setBusinesses() → hasFetched = true, businesses = data
   * - No Business (404): setBusinesses([]) → hasFetched = true, businesses = []
   * - Errors (Network/500): Keep hasFetched = false, show error UI with retry
   * 
   * Only mark as fetched on successful response (200) or explicit "not found" (404).
   * Do NOT mark as fetched on transient errors - user can retry.
   */
  const fetchBusinesses = useCallback(() => {
    console.log("[DashboardLayout] 🚀 fetchBusinesses called", {
      accountType,
      isBusinessAccount,
      isFetchingBusinesses,
      timestamp: new Date().toISOString(),
    });

    // Guard: Only fetch for business accounts
    // Individual and Company accounts don't need businesses - skip entirely
    if (!isBusinessAccount || accountType !== AccountType.Business) {
      console.log("[DashboardLayout] ⛔ fetchBusinesses: Not business account, aborting", {
        accountType,
        isBusinessAccount,
      });
      return;
    }
    
    // Clear any previous errors before fetching
    clearBusinessError();
    
    // CRITICAL: Set loading state in Redux so child components know we're fetching
    dispatch(businessActions.setLoading(true));
    
    console.log("[DashboardLayout] 📡 fetchBusinesses: Starting HTTP request to /business/list");
    
    fetchBusinessReq({
      successRes: (response: any) => {
        const responseData = response?.data?.data || {};
        const businessesList = responseData.businesses || responseData || [];
        const subscription = responseData.subscription || null;
        
        console.log("[DashboardLayout] ✅ fetchBusinesses: Success", {
          count: businessesList.length,
          businesses: businessesList.map((b: any) => ({ id: b._id, name: b.name })),
          hasSubscription: !!subscription,
          subscriptionPlan: subscription?.plan,
          timestamp: new Date().toISOString(),
        });
        
        // Success: Mark as fetched and set businesses
        dispatch(businessActions.setBusinesses(businessesList));
        
        // Store subscription if provided
        if (subscription) {
          dispatch(subscriptionActions.setCurrentSubscription(subscription));
        }
        
        console.log("[DashboardLayout] ✅ fetchBusinesses: Redux state updated (hasFetched = true)");
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status;
        const errorDescription = errorResponse?.data?.description || "";
        console.log("[DashboardLayout] ❌ fetchBusinesses: Error", {
          status,
          message: errorDescription,
          timestamp: new Date().toISOString(),
        });
        
        // 403 = Account type mismatch (permanent error - user is not Business)
        // 404 = User not found or no businesses (permanent error - should not happen, but handle gracefully)
        // Mark as fetched with error state to prevent infinite retries
        if (status === 403 || status === 404) {
          const errorMessage = errorDescription || (status === 403 
            ? "This feature is only available for Business accounts" 
            : "User not found or account error");
          console.log("[DashboardLayout] 🛑 fetchBusinesses: Permanent error (403/404), marking as fetched with error to prevent retries", {
            status,
            errorMessage,
          });
          // CRITICAL: Set businesses first (sets hasFetched=true, but clears error)
          // Then set error after (Redux actions are synchronous, so this works)
          dispatch(businessActions.setBusinesses([]));
          dispatch(businessActions.setError({
            message: errorMessage,
            type: status === 403 ? ErrorType.Authorization : ErrorType.NotFound,
            status,
            description: "Please check your account verification status."
          }));
          return true; // Suppress error toast - we'll show ErrorState instead
        }
        
        // Network errors, 500, etc. = Transient errors
        // Set error state and clear loading (DO NOT mark as fetched to allow retry)
        console.log("[DashboardLayout] ⚠️  fetchBusinesses: Transient error, setting error state (hasFetched remains false to allow retry)");
        dispatch(businessActions.setError({
          message: errorDescription || "Failed to load businesses",
          type: ErrorType.Network, // Default to network/server error for transient issues
          status,
          description: "Please check your internet connection and try again."
        }));
        return true; // Suppress error toast - we'll show ErrorState instead
      },
      requestConfig: {
        url: "/business/list",
        method: HttpMethod.GET,
      },
    });
  }, [accountType, isBusinessAccount, dispatch, fetchBusinessReq, clearBusinessError, isFetchingBusinesses]);

  /**
   * Fetch subscription (user-based, works for both individual, company, and business accounts)
   * 
   * CRITICAL: Subscriptions are user-based, not company-based.
   * This must be fetched separately to ensure it works for individual accounts.
   */
  const fetchSubscription = useCallback(() => {
    console.log("[DashboardLayout] 🚀 fetchSubscription called", {
      accountType,
      isIndividualAccount,
      timestamp: new Date().toISOString(),
    });

    // Clear any previous errors
    dispatch(subscriptionActions.setLoading(true));
    
    console.log("[DashboardLayout] 📡 fetchSubscription: Starting HTTP request to /subscription");
    
    fetchSubscriptionReq({
      successRes: (response: any) => {
        const subscription = response?.data?.data || null;
        
        console.log("[DashboardLayout] ✅ fetchSubscription: Success", {
          hasSubscription: !!subscription,
          subscriptionPlan: subscription?.plan,
          timestamp: new Date().toISOString(),
        });
        
        // Store subscription in subscription slice
        dispatch(subscriptionActions.setCurrentSubscription(subscription));
      },
      errorRes: (errorResponse: any) => {
        const status = errorResponse?.status;
        console.log("[DashboardLayout] ❌ fetchSubscription: Error", {
          status,
          message: errorResponse?.data?.description,
          timestamp: new Date().toISOString(),
        });
        
        // On error, set subscription to null (defaults to Free plan)
        dispatch(subscriptionActions.setCurrentSubscription(null));
        dispatch(subscriptionActions.setError(errorResponse?.data?.description || "Failed to fetch subscription"));
      },
      requestConfig: {
        url: "/subscription", // User-based subscription endpoint
        method: HttpMethod.GET,
      },
    });
  }, [dispatch, fetchSubscriptionReq, accountType, isIndividualAccount]);

  /**
   * Fetch companies on mount/reload
   * 
   * FIXED ROOT CAUSES:
   * 1. Removed dependency on user state changes (user is already hydrated by PersistGate)
   * 2. Removed isFetchingCompanies guard (was causing deadlocks)
   * 3. Simplified dependencies to prevent infinite loops
   * 
   * On page reload:
   * 1. PersistGate rehydrates user BEFORE component renders
   * 2. Component mounts with user already available (no state transition)
   * 3. Effect runs once on mount
   * 4. Checks if we need to fetch → fetches if needed
   */
  useEffect(() => {
    console.log("[DashboardLayout] 🔍 Fetch effect running", {
      isAuthInitialized,
      isAuthenticated,
      user: user ? { id: user._id, email: user.email, accountType: user.accountType } : null,
      accountType,
      isIndividualAccount,
      hasFetchedCompany,
      companiesCount: companies.length,
      isFetchingCompanies,
      fetchError: fetchError ? (fetchError.message || String(fetchError)).substring(0, 50) : null,
    });

    // Wait for auth initialization to complete (rehydration + token validation)
    if (!isAuthInitialized) {
      console.log("[DashboardLayout] ⏳ Auth not initialized, waiting...");
      return;
    }
    
    // If not authenticated, don't fetch companies
    if (!isAuthenticated || !user) {
      console.log("[DashboardLayout] ❌ Not authenticated, skipping fetch", {
        isAuthenticated,
        hasUser: !!user,
      });
      return;
    }
    
    // Fetch companies for company accounts
    if (isCompanyAccount && accountType === AccountType.Company) {
      // CRITICAL: Only fetch if not already fetched AND no error exists (prevents infinite loops on 500 errors)
      // If there's a permanent error (403/404), don't retry to prevent infinite loops
      // If there's a transient error (500), don't auto-retry - user can use retry button
      // CRITICAL: Check for both Redux error (companyError) and HTTP error (fetchError)
      const hasError = companyError || fetchError;
      // Only fetch if: not fetched AND no error AND not already fetching
      // OR: fetched but no companies and no error (edge case - should not happen, but handle gracefully)
      const needsFetch = (!hasFetchedCompany && !isFetchingCompanies && !hasError) || 
                         (hasFetchedCompany && !hasError && companies.length === 0 && !isFetchingCompanies);
      if (needsFetch) {
        console.log("[DashboardLayout] ✅ Triggering fetchCompanies()");
        fetchCompanies();
      } else if (hasError && hasFetchedCompany) {
        console.log("[DashboardLayout] 🛑 Not fetching companies - permanent error detected", {
          error: (companyError || fetchError)?.substring(0, 50),
          hasFetchedCompany,
        });
      } else if (hasError && !hasFetchedCompany) {
        console.log("[DashboardLayout] 🛑 Not fetching companies - transient error detected, preventing infinite retry loop", {
          error: (companyError || fetchError)?.substring(0, 50),
        });
      }
    }
    
    // Fetch businesses for business accounts
    // CRITICAL: Only fetch if not already fetched AND no error exists (prevents infinite loops on 500 errors)
    // If there's a permanent error (403/404), don't retry to prevent infinite loops
    // If there's a transient error (500), don't auto-retry - user can use retry button
    if (isBusinessAccount && accountType === AccountType.Business) {
      // CRITICAL: Check for both Redux error (businessError) and HTTP error (fetchBusinessError)
      const hasError = businessError || fetchBusinessError;
      const needsFetch = !hasFetchedBusiness && !isFetchingBusinesses && !hasError;
      if (needsFetch) {
        console.log("[DashboardLayout] ✅ Triggering fetchBusinesses()");
        fetchBusinesses();
      } else if (hasError && hasFetchedBusiness) {
        console.log("[DashboardLayout] 🛑 Not fetching businesses - permanent error detected", {
          error: (businessError || fetchBusinessError)?.substring(0, 50),
          hasFetchedBusiness,
        });
      } else if (hasError && !hasFetchedBusiness) {
        console.log("[DashboardLayout] 🛑 Not fetching businesses - transient error detected, preventing infinite retry loop", {
          error: (businessError || fetchBusinessError)?.substring(0, 50),
        });
      }
    }
    
    // Individual accounts don't need companies or businesses - skip entirely
    if (isIndividualAccount) {
      console.log("[DashboardLayout] ⏭️  Individual account, skipping company/business fetch", {
        accountType,
      });
    }
    // Depend on auth initialization status and user
    // fetchCompanies and fetchBusinesses are stable (useCallback), safe to include
    // CRITICAL: Include hasFetched flags and lengths to detect state changes
  }, [isAuthInitialized, isAuthenticated, user, accountType, isIndividualAccount, isCompanyAccount, isBusinessAccount, hasFetchedCompany, companies.length, companyError, hasFetchedBusiness, businesses.length, businessError, isFetchingCompanies, isFetchingBusinesses, fetchCompanies, fetchBusinesses, fetchError, fetchBusinessError]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fetch subscription on mount/reload
   * 
   * CRITICAL: Subscriptions are user-based, not company-based.
   * This works for both individual and company accounts.
   */
  useEffect(() => {
    // Wait for auth initialization to complete
    if (!isAuthInitialized) {
      return;
    }
    
    // If not authenticated, don't fetch subscription
    if (!isAuthenticated || !user) {
      return;
    }
    
    // CRITICAL: Check if we need to fetch subscription
    // Prevent race conditions: don't fetch if already fetched OR already loading
    if (!hasFetchedSubscription && !isLoadingSubscription) {
      console.log("[DashboardLayout] ✅ Triggering fetchSubscription()");
      fetchSubscription();
    }
  }, [isAuthInitialized, isAuthenticated, user, hasFetchedSubscription, isLoadingSubscription, fetchSubscription]);

  const handleAccountSwitch = useCallback((companyId: string) => {
    console.log("[DashboardLayout] 🔄 Switching company", {
      from: selectedCompanyId,
      to: companyId,
    });
    
    // CRITICAL: Reset all company-specific Redux state before switching
    // This ensures fresh data is fetched for the new company
    // Preserves: user state, companies list, subscription (user-based, not company-based)
    // Clears: expenses, invoices, dashboard, VAT, WHT, compliance, employees
    dispatch(resetCompanyData());
    
    // Set the new selected company ID
    dispatch(companyActions.setSelectedCompanyId(companyId));
    
    console.log("[DashboardLayout] ✅ Company switched, all company data cleared");
  }, [dispatch, selectedCompanyId]);

  const handleBusinessSwitch = useCallback((businessId: string) => {
    console.log("[DashboardLayout] 🔄 Switching business", {
      from: selectedBusinessId,
      to: businessId,
    });
    
    // CRITICAL: Reset all business-specific Redux state before switching
    // This ensures fresh data is fetched for the new business
    // Similar to company switching
    dispatch(resetCompanyData()); // Reuse same reset logic (clears shared data)
    
    // Set the new selected business ID
    dispatch(businessActions.setSelectedBusinessId(businessId));
    
    console.log("[DashboardLayout] ✅ Business switched, all business data cleared");
  }, [dispatch, selectedBusinessId]);

  /**
   * Navigation Logic: Redirect to onboarding when company/business does not exist
   * 
   * CRITICAL: Block access to ALL pages except onboarding when no company/business exists.
   * Users cannot access expenses, invoices, VAT, WHT, CIT, payroll, etc. without a company/business.
   * 
   * Conditions (ALL must be true):
   * 1. Account type is company or business
   * 2. Fetch completed successfully (hasFetched = true)
   * 3. No permanent error occurred (businessError/companyError = null)
   * 4. No companies/businesses exist (length = 0)
   * 5. Not currently loading
   * 6. Not already on onboarding page (prevents redirect loops)
   * 
   * CRITICAL: Do NOT redirect on errors - show error UI instead
   * CRITICAL: Redirect from ANY page (expenses, invoices, VAT, etc.) - no exceptions except onboarding
   */
  useEffect(() => {
    // Skip redirect logic for individual accounts - they don't need companies or businesses
    if (isIndividualAccount) {
      return;
    }
    
    // Company account onboarding redirect
    // CRITICAL: Redirect from ANY page if no companies exist (except onboarding page itself)
    const shouldRedirectToCompanyOnboarding = 
      accountType === AccountType.Company &&
      hasFetchedCompany &&
      !companyError &&
      companies.length === 0 &&
      !isFetchingCompanies &&
      pathname !== "/dashboard/company/onboard";

    if (shouldRedirectToCompanyOnboarding) {
      console.log("[DashboardLayout] 🚫 No companies found - redirecting to onboarding from:", pathname);
      router.replace("/dashboard/company/onboard");
      return; // Prevent both redirects from happening
    }
    
    // Business account onboarding redirect
    // CRITICAL: Redirect from ANY page if no businesses exist (except onboarding page itself)
    const shouldRedirectToBusinessOnboarding = 
      accountType === AccountType.Business &&
      hasFetchedBusiness &&
      !businessError &&
      businesses.length === 0 &&
      !isFetchingBusinesses &&
      pathname !== "/dashboard/business/onboard";

    if (shouldRedirectToBusinessOnboarding) {
      console.log("[DashboardLayout] 🚫 No businesses found - redirecting to onboarding from:", pathname);
      router.replace("/dashboard/business/onboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType, hasFetchedCompany, companyError, companies.length, isFetchingCompanies, hasFetchedBusiness, businessError, businesses.length, isFetchingBusinesses, pathname, router]);

  /**
   * Retry handler for company fetch errors
   * 
   * Flow:
   * 1. Clear error state (from useHttp)
   * 2. Invalidate cache (reset hasFetched = false in Redux)
   * 3. Trigger fetch
   */
  const handleRetryCompanyFetch = useCallback(() => {
    clearError();
    dispatch(companyActions.invalidateCache());
    fetchCompanies();
  }, [dispatch, fetchCompanies, clearError]);

  /**
   * Retry handler for business fetch errors
   * 
   * Flow:
   * 1. Clear error state (from useHttp)
   * 2. Invalidate cache (reset hasFetched = false in Redux)
   * 3. Trigger fetch
   */
  const handleRetryBusinessFetch = useCallback(() => {
    clearBusinessError();
    dispatch(businessActions.invalidateCache());
    fetchBusinesses();
  }, [dispatch, fetchBusinesses, clearBusinessError]);

  /**
   * CRITICAL: Auto-select first company if companies exist but no company is selected
   * 
   * This handles edge cases where:
   * 1. Companies are fetched but selectedCompanyId is somehow null
   * 2. Company is created and added but selectedCompanyId isn't set yet
   * 3. State inconsistency after logout/login or state reset
   * 
   * This ensures selectedCompanyId is ALWAYS set when companies exist.
   * Redux updates are synchronous, so this will trigger a re-render with selectedCompanyId set.
   */
  useEffect(() => {
    // Skip for individual accounts - they don't need companies
    if (isIndividualAccount) {
      return;
    }
    
    if (
      accountType === AccountType.Company &&
      hasFetchedCompany &&
      !fetchError &&
      companies.length > 0 &&
      !selectedCompanyId &&
      !isFetchingCompanies
    ) {
      // Force select first company - this should be handled by setCompanies/addCompany, but guard against edge cases
      // This is a synchronous Redux update, so selectedCompanyId will be set immediately
      dispatch(companyActions.setSelectedCompanyId(companies[0]._id));
    }
  }, [accountType, hasFetchedCompany, fetchError, companies, selectedCompanyId, isFetchingCompanies, dispatch]);

  /**
   * CRITICAL: Auto-select first business if businesses exist but no business is selected
   * 
   * This handles edge cases where:
   * 1. Businesses are fetched but selectedBusinessId is somehow null
   * 2. Business is created and added but selectedBusinessId isn't set yet
   * 3. State inconsistency after logout/login or state reset
   * 
   * This ensures selectedBusinessId is ALWAYS set when businesses exist.
   * Redux updates are synchronous, so this will trigger a re-render with selectedBusinessId set.
   */
  useEffect(() => {
    // Skip for non-business accounts - they don't need businesses
    if (!isBusinessAccount || accountType !== AccountType.Business) {
      return;
    }
    
    if (
      accountType === AccountType.Business &&
      hasFetchedBusiness &&
      !fetchBusinessError &&
      businesses.length > 0 &&
      !selectedBusinessId &&
      !isFetchingBusinesses
    ) {
      // Force select first business - this should be handled by setBusinesses/addBusiness, but guard against edge cases
      // This is a synchronous Redux update, so selectedBusinessId will be set immediately
      dispatch(businessActions.setSelectedBusinessId(businesses[0]._id));
    }
  }, [accountType, isBusinessAccount, hasFetchedBusiness, fetchBusinessError, businesses, selectedBusinessId, isFetchingBusinesses, dispatch]);

  /**
   * Render Logic: Clear separation of states
   * 
   * State Machine:
   * - LOADING: isFetchingCompanies && !hasFetchedCompany
   * - ERROR: fetchError && !isFetchingCompanies && !hasFetchedCompany
   * - EMPTY (Redirect): hasFetchedCompany && !fetchError && companies.length === 0
   * - READY: hasFetchedCompany && !fetchError && (companies.length === 0 OR selectedCompanyId !== null)
   * 
   * CRITICAL: Block rendering until fetch completes AND company selection is ready.
   * For company accounts with companies, we MUST have selectedCompanyId before rendering children.
   * This prevents race conditions where child components try to use selectedCompanyId before it's set.
   */

  // ERROR STATE: Show error UI (only for company accounts, only if fetch failed)
  // Individual accounts skip this - they don't need companies
  // Check both fetchError (transient errors) and companyError (permanent errors from Redux)
  const hasCompanyError = fetchError || companyError;
  if (!isIndividualAccount && accountType === AccountType.Company && hasCompanyError && !isFetchingCompanies) {
    // For permanent errors (hasFetchedCompany = true), show error without retry
    // For transient errors (hasFetchedCompany = false), show error with retry
    if (hasFetchedCompany && companyError) {
      // Permanent error - show error message, no retry
      // If user not found, redirect to login; otherwise show error
      const isUserNotFound = companyError?.toLowerCase().includes("user not found") || companyError?.toLowerCase().includes("not found");
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <ErrorState 
            title={isUserNotFound ? "Authentication Required" : "Unable to Load Companies"}
            description={companyError || "An error occurred while loading your companies. Please contact support if you believe this is an error."}
            primaryAction={{
              label: "Login",
              onClick: () => router.push("/sign-in"),
            }}
          />
        </div>
      );
    } else if (!hasFetchedCompany && fetchError) {
      // Transient error - show error with retry
      return (
        <div className="min-h-screen bg-gray-50">
          <NetworkErrorState
            onRetry={handleRetryCompanyFetch}
          />
        </div>
      );
    }
  }

  // ERROR STATE: Show error UI (only for business accounts, only if fetch failed)
  // Individual and Company accounts skip this - they don't need businesses
  // Check both fetchBusinessError (transient errors) and businessError (permanent errors from Redux)
  const hasBusinessError = fetchBusinessError || businessError;
  if (!isIndividualAccount && accountType === AccountType.Business && hasBusinessError && !isFetchingBusinesses) {
    // For permanent errors (hasFetchedBusiness = true), show error without retry
    // For transient errors (hasFetchedBusiness = false), show error with retry
    if (hasFetchedBusiness && businessError) {
      // Permanent error - show error message, no retry
      // If user not found, redirect to login; otherwise show error
      const isUserNotFound = businessError?.toLowerCase().includes("user not found") || businessError?.toLowerCase().includes("not found");
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <ErrorState 
            title={isUserNotFound ? "Authentication Required" : "Unable to Load Businesses"}
            description={businessError || "An error occurred while loading your businesses. Please contact support if you believe this is an error."}
            primaryAction={{
              label: "Login",
              onClick: () => router.push("/sign-in"),
            }}
          />
        </div>
      );
    } else if (!hasFetchedBusiness && fetchBusinessError) {
      // Transient error - show error with retry
      return (
        <div className="min-h-screen bg-gray-50">
          <NetworkErrorState
            onRetry={handleRetryBusinessFetch}
          />
        </div>
      );
    }
  }

  // LOADING STATE: Show loading when actively fetching and haven't fetched yet
  // Only for company accounts - individual accounts skip this entirely
  // Block all navigation and child rendering until fetch completes
  // Use same background color to prevent flicker
  if (!isIndividualAccount && accountType === AccountType.Company && isFetchingCompanies && !hasFetchedCompany) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Loading company information..." size={LoadingStateSize.Md} />
      </div>
    );
  }

  // LOADING STATE: Show loading when actively fetching businesses and haven't fetched yet
  // Only for business accounts - individual and company accounts skip this entirely
  // Block all navigation and child rendering until fetch completes
  if (!isIndividualAccount && accountType === AccountType.Business && isFetchingBusinesses && !hasFetchedBusiness) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Loading business information..." size={LoadingStateSize.Md} />
      </div>
    );
  }

  // REDIRECT BLOCKER: If we are redirecting to onboarding (no companies), block children
  // This prevents child components from rendering and throwing errors about missing company
  if (
    !isIndividualAccount &&
    accountType === AccountType.Company &&
    hasFetchedCompany &&
    !companyError &&
    companies.length === 0 &&
    !isFetchingCompanies &&
    pathname !== "/dashboard/company/onboard"
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Redirecting to onboarding..." size={LoadingStateSize.Md} />
      </div>
    );
  }

  // REDIRECT BLOCKER: Business account onboarding
  if (
    !isIndividualAccount &&
    accountType === AccountType.Business &&
    hasFetchedBusiness &&
    !businessError &&
    businesses.length === 0 &&
    !isFetchingBusinesses &&
    pathname !== "/dashboard/business/onboard"
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Redirecting to onboarding..." size={LoadingStateSize.Md} />
      </div>
    );
  }

  /**
   * CRITICAL GUARD: Block rendering if company account has companies but no selectedCompanyId
   * 
   * This prevents race conditions where:
   * 1. Company is created and added to Redux
   * 2. Navigation happens immediately
   * 3. Child component renders before selectedCompanyId is set
   * 
   * Redux updates are synchronous, but React re-renders are async.
   * This guard ensures we wait for the re-render cycle to complete.
   * 
   * The useEffect above will fix this state by dispatching setSelectedCompanyId.
   * Since Redux updates are synchronous, the next render will have selectedCompanyId set.
   * We block rendering here to prevent child components from accessing null selectedCompanyId.
   * 
   * This is especially critical for company-specific routes that require selectedCompanyId.
   * Without this guard, pages like /dashboard/wht would try to use selectedCompanyId before it's set.
   */
  // CRITICAL: Individual accounts skip this - they don't need companies/businesses or selectedCompanyId/selectedBusinessId
  if (
    !isIndividualAccount &&
    accountType === AccountType.Company &&
    hasFetchedCompany &&
    !fetchError &&
    companies.length > 0 &&
    !selectedCompanyId &&
    !isFetchingCompanies
  ) {
    // Show loading while useEffect fixes the state (will trigger re-render with selectedCompanyId set)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Initializing company..." />
      </div>
    );
  }
  
  // Similar guard for business accounts
  if (
    !isIndividualAccount &&
    accountType === AccountType.Business &&
    hasFetchedBusiness &&
    !fetchBusinessError &&
    businesses.length > 0 &&
    !selectedBusinessId &&
    !isFetchingBusinesses
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Initializing business..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        accountType={accountType}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onCompanySwitch={handleAccountSwitch}
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
        onBusinessSwitch={handleBusinessSwitch}
        navigationItems={navigation}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Header - Sticky inside main content */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center min-w-0 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 lg:hidden flex-shrink-0"
                aria-label="Open menu"
                type="button"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="ml-4 lg:ml-0 min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-md flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold bg-gradient-to-r from-emerald-700 to-emerald-600 bg-clip-text text-transparent truncate">TaxComply</h2>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              <AccountSwitcher />
              
              {user?.email && (
                <div className="hidden sm:block min-w-0">
                  <span className="text-sm text-gray-500 truncate">{user.email}</span>
                </div>
              )}
              
              <div className="hidden md:flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">Nigeria</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                type="button"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
      
      {/* Share Prompt */}
      {user && (
        <SharePrompt
          isVisible={showSharePrompt}
          onDismiss={handleDismissSharePrompt}
          referralCode={user._id?.toString()}
          userId={user._id?.toString()}
          signupUrl="/sign-up"
          position={SharePromptPosition.BottomRight}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => !isLoggingOut && setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
      />
    </div>
  );
}
