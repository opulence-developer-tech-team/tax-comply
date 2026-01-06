/**
 * Root Actions - Centralized action creators for resetting all Redux state
 * 
 * Use these actions when switching accounts, logging out, or needing to
 * completely reset the application state.
 */

import { companyActions } from "./company/company-slice";
import { businessActions } from "./business/business-slice";
import { expensesActions } from "./expenses/expenses-slice";
import { invoicesActions } from "./invoices/invoices-slice";
import { dashboardActions } from "./dashboard/dashboard-slice";
import { vatActions } from "./vat/vat-slice";
import { whtActions } from "./wht/wht-slice";
import { citActions } from "./cit/cit-slice";
import { complianceActions } from "./compliance/compliance-slice";
import { employeesActions } from "./employees/employees-slice";
import { referralsActions } from "./referrals/referrals-slice";
import { subscriptionActions } from "./subscription/subscription-slice";
import { userActions } from "./user/user-slice";
import { adminActions } from "./admin/admin-slice";
import { pitActions } from "./pit/pit-slice";
import { incomeActions } from "./income/income-slice";
import { payrollActions } from "./payroll/payroll-slice";

/**
 * Reset all Redux state slices (except user)
 * 
 * Use this when:
 * - Logging out (clears everything including companies)
 * - Switching between account types (individual <-> company)
 * - Clearing all application state before account switch
 * 
 * Note: userActions.clearUser() should be called separately for logout
 * to maintain auth state until after redirect
 * 
 * WARNING: This clears the companies array. For company switching,
 * use resetCompanyData() instead to preserve the companies list.
 * 
 * @example
 * dispatch(resetAllState());
 */
export const resetAllState = () => {
  return (dispatch: any) => {
    // Reset all slices in correct order
    dispatch(companyActions.clearCompanies());
    dispatch(businessActions.clearBusinesses());
    dispatch(expensesActions.clearExpenses());
    dispatch(invoicesActions.clearInvoices());
    dispatch(dashboardActions.clearDashboard());
    dispatch(vatActions.clearVAT());
    dispatch(whtActions.clearWHT());
    dispatch(complianceActions.clearCompliance());
    dispatch(employeesActions.clearEmployees());
    dispatch(referralsActions.clearReferralData());
    dispatch(subscriptionActions.clearSubscription());
    dispatch(pitActions.clearPIT());
    dispatch(incomeActions.clearIncome());
    dispatch(payrollActions.clearPayrollSchedules());
    dispatch(citActions.clearCIT());
    
    // CRITICAL: Clear auth state last
    dispatch(userActions.clearUser());
    dispatch(adminActions.clearAdmin());
  };
};

/**
 * Reset all company-specific data (but preserve companies list, user, and subscription)
 * 
 * Use this when switching between companies to clear old company data
 * while preserving the companies list needed for the switcher.
 * 
 * CRITICAL: Subscription is NOT cleared because it's user-based, not company-based.
 * The same subscription applies to all companies owned by the user.
 * 
 * This is the CORRECT function to use for company switching.
 * 
 * @example
 * dispatch(resetCompanyData());
 * dispatch(companyActions.setSelectedCompanyId(newCompanyId));
 */
export const resetCompanyData = () => {
  return (dispatch: any) => {
    // Clear all company-specific data slices
    // NOTE: We do NOT call clearCompanies() because it clears the companies array
    // NOTE: We do NOT clear subscription because it's user-based (applies to all companies)
    dispatch(expensesActions.clearExpenses());
    dispatch(invoicesActions.clearInvoices());
    dispatch(dashboardActions.clearDashboard());
    dispatch(vatActions.clearVAT());
    dispatch(whtActions.clearWHT());
    dispatch(complianceActions.clearCompliance());
    dispatch(employeesActions.clearEmployees());
    dispatch(pitActions.clearPIT());
    dispatch(incomeActions.clearIncome());
    dispatch(payrollActions.clearPayrollSchedules());
    dispatch(citActions.clearCIT());
  };
};

/**
 * Reset all business-specific data (but preserve businesses list, user, and subscription)
 * 
 * Use this when switching between businesses to clear old business data
 * while preserving the businesses list needed for the switcher.
 * 
 * CRITICAL: Subscription is NOT cleared because it's user-based, not business-based.
 * The same subscription applies to all businesses owned by the user.
 * 
 * This is the CORRECT function to use for business switching.
 * 
 * @example
 * dispatch(resetBusinessData());
 * dispatch(businessActions.setSelectedBusinessId(newBusinessId));
 */
export const resetBusinessData = () => {
  return (dispatch: any) => {
    // Clear all business-specific data slices
    // NOTE: We do NOT call clearBusinesses() because it clears the businesses array
    // NOTE: We do NOT clear subscription because it's user-based (applies to all businesses)
    dispatch(expensesActions.clearExpenses());
    dispatch(invoicesActions.clearInvoices());
    dispatch(dashboardActions.clearDashboard());
    dispatch(vatActions.clearVAT());
    dispatch(whtActions.clearWHT());
    dispatch(complianceActions.clearCompliance());
    dispatch(employeesActions.clearEmployees());
    dispatch(pitActions.clearPIT());
    dispatch(incomeActions.clearIncome());
    dispatch(payrollActions.clearPayrollSchedules());
    dispatch(citActions.clearCIT());
  };
};

/**
 * Reset all cached data (but keep user, companies list, and company selection)
 * 
 * Use this when switching between companies to refresh data without clearing it
 * 
 * @example
 * dispatch(resetAllCaches());
 */
export const resetAllCaches = () => {
  return (dispatch: any) => {
    dispatch(companyActions.invalidateCache());
    dispatch(expensesActions.invalidateCache());
    dispatch(invoicesActions.invalidateCache());
    dispatch(dashboardActions.invalidateCache());
    dispatch(vatActions.invalidateCache());
    dispatch(whtActions.invalidateCache());
    dispatch(citActions.invalidateCache());
    dispatch(complianceActions.invalidateCache());
    dispatch(employeesActions.invalidateCache());
  };
};

