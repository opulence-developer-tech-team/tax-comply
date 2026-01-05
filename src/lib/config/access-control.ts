
import { AccountType } from "@/lib/utils/account-type";

/**
 * Access Control Configuration
 * 
 * Strict enforcement of screen access based on account type.
 * NO defaults. NO guessing. Fail loudly.
 */

// 1. Dashboard Mapping
// Strictly maps an account type to its dedicated dashboard URL.
export const DASHBOARD_MAPPING: Record<AccountType, string> = {
  [AccountType.Individual]: "/dashboard",
  [AccountType.Company]: "/dashboard",
  [AccountType.Business]: "/dashboard",
};

/**
 * Validates if the mapping exists for the given type.
 * Fails LOUDLY if mapping is missing.
 */
export function getDashboardForType(type: AccountType): string {
  const path = DASHBOARD_MAPPING[type];
  if (!path) {
    throw new Error(`CRITICAL: No dashboard mapping found for account type: ${type}`);
  }
  return path;
}

// 2. Route Permissions
// Strictly defines which account types can access a specific route segment.
// We use the first segment after /dashboard/ as the key.
// e.g. /dashboard/individual/... -> key: "individual"
export const ROUTE_PERMISSIONS: Record<string, AccountType[]> = {
  // 1. Core Dashboards (Explicit)
  "individual": [AccountType.Individual],
  "company": [AccountType.Company],
  "business": [AccountType.Business],

  // 2. Shared Routes
  "referrals": [AccountType.Individual, AccountType.Company, AccountType.Business],
  "subscription": [AccountType.Individual, AccountType.Company, AccountType.Business],
  "settings": [AccountType.Individual, AccountType.Company, AccountType.Business],

  // 3. Individual & Company Shared (Business uses nested /dashboard/business/...)
  "expenses": [AccountType.Individual, AccountType.Company],
  "tax-filing": [AccountType.Individual, AccountType.Company],

  // 4. Individual Specific
  "income": [AccountType.Individual],
  "pit": [AccountType.Individual], // Review: If Business uses PIT, is it under /dashboard/business/pit? Yes.

  // 5. Company Specific (Business uses nested /dashboard/business/...)
  "invoices": [AccountType.Company],
  "vat": [AccountType.Company],
  "wht": [AccountType.Company],
  "cit": [AccountType.Company],
  "payroll": [AccountType.Company],
  "employees": [AccountType.Company],
  "compliance": [AccountType.Company],
};

/**
 * Checks if the account type is allowed for the given segment.
 * Fails LOUDLY if permissions are not explicitly defined.
 */
export function isAccessAllowed(segment: string, type: AccountType): boolean {
  // If we are at root /dashboard, we handle it separately (usually redirect)
  if (!segment) return true;

  const allowedTypes = ROUTE_PERMISSIONS[segment];
  
  // FAIL LOUDLY if permission is not defined for this route
  if (!allowedTypes) {
    // If it's a known shared route, we might want to allow it, 
    // but per requirements "Every screen must explicitly declare".
    // For now, if it's not in the map, it's FORBIDDEN (or configuration error).
    throw new Error(`CRITICAL: Access control configuration missing for route segment: ${segment}`);
  }

  return allowedTypes.includes(type);
}
