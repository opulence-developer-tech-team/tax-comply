"use client";

import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import expensesReducer from "./expenses/expenses-slice";
import invoicesReducer from "./invoices/invoices-slice";
import dashboardReducer from "./dashboard/dashboard-slice";
import companyReducer from "./company/company-slice";
import businessReducer from "./business/business-slice";
import userReducer from "./user/user-slice";
import vatReducer from "./vat/vat-slice";
import whtReducer from "./wht/wht-slice";
import pitReducer from "./pit/pit-slice";
import citReducer from "./cit/cit-slice";
import incomeReducer from "./income/income-slice";
import complianceReducer from "./compliance/compliance-slice";
import employeesReducer from "./employees/employees-slice";
import adminReducer from "./admin/admin-slice";
import referralsReducer from "./referrals/referrals-slice";
import subscriptionReducer from "./subscription/subscription-slice";
import payrollReducer from "./payroll/payroll-slice";

/**
 * Create noop storage for SSR
 * 
 * Redux-persist requires a storage engine that implements:
 * - getItem(key: string): Promise<string | null>
 * - setItem(key: string, value: string): Promise<void>
 * - removeItem(key: string): Promise<void>
 * 
 * On the server, we provide a noop implementation that:
 * - Returns null for getItem (no persisted state on server)
 * - Does nothing for setItem/removeItem (can't persist on server)
 */
const createNoopStorage = () => {
  return {
    getItem(_key: string): Promise<string | null> {
      return Promise.resolve(null);
    },
    setItem(_key: string, _value: string): Promise<void> {
      return Promise.resolve();
    },
    removeItem(_key: string): Promise<void> {
      return Promise.resolve();
    },
  };
};

/**
 * Get storage engine for redux-persist
 * 
 * Uses localStorage on client, noop storage on server.
 * 
 * CRITICAL: This must be a function that's called lazily, not at module load time,
 * to prevent redux-persist from trying to access localStorage during SSR.
 */
const getStorage = () => {
  // Check if we're in a browser environment
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return createNoopStorage();
  }
  
  // Client-side: use actual localStorage storage
  // Import at runtime to avoid SSR issues
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("redux-persist/lib/storage").default;
  } catch (error) {
    // Fallback to noop if import fails
    console.warn("Failed to load redux-persist storage:", error);
    return createNoopStorage();
  }
};

// Create storage lazily - only when actually needed
const safeStorage = getStorage();

// Persist configuration for user state only
const userPersistConfig = {
  key: "user",
  storage: safeStorage,
  // Persist user data, authentication state, and hasFetched flag
  // hasFetched is needed to prevent RouteGuard from showing loading state after rehydration
  whitelist: ["user", "isAuthenticated", "hasFetched"],
};

// Persist configuration for admin state
const adminPersistConfig = {
  key: "admin",
  storage: safeStorage,
  whitelist: ["user", "isAuthenticated", "hasFetched"],
};

// Persist the reducers
const persistedUserReducer = persistReducer(userPersistConfig, userReducer.reducer);
const persistedAdminReducer = persistReducer(adminPersistConfig, adminReducer.reducer);

// Root reducer
// Note: Expenses, Invoices, Dashboard, Company, Business, VAT, WHT, PIT, CIT, Income, Compliance, Employees, Payroll, Referrals, and Subscription are NOT persisted - they're fetched fresh from the server
// User and Admin data IS persisted in localStorage to maintain auth state across refreshes
const rootReducer = combineReducers({
  expenses: expensesReducer.reducer, // Not persisted - fetched fresh from server
  invoices: invoicesReducer.reducer, // Not persisted - fetched fresh from server
  dashboard: dashboardReducer.reducer, // Not persisted - fetched fresh from server
  company: companyReducer.reducer, // Not persisted - fetched fresh from server
  business: businessReducer.reducer, // Not persisted - fetched fresh from server
  vat: vatReducer.reducer, // Not persisted - fetched fresh from server
  wht: whtReducer.reducer, // Not persisted - fetched fresh from server
  pit: pitReducer.reducer, // Not persisted - fetched fresh from server
  cit: citReducer.reducer, // Not persisted - fetched fresh from server
  income: incomeReducer.reducer, // Not persisted - fetched fresh from server
  compliance: complianceReducer.reducer, // Not persisted - fetched fresh from server
  employees: employeesReducer.reducer, // Not persisted - fetched fresh from server
  payroll: payrollReducer.reducer, // Not persisted - fetched fresh from server
  referrals: referralsReducer, // Not persisted - fetched fresh from server
  subscription: subscriptionReducer.reducer, // Not persisted - fetched fresh from server (user-based, works for both individual and company accounts)
  user: persistedUserReducer, // User auth state - PERSISTED in localStorage
  admin: persistedAdminReducer, // Admin auth state - PERSISTED in localStorage (separate from user)
});

// Configure store with production-ready settings
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in actions (dates, etc.)
        // Also ignore all redux-persist actions including PURGE
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/PURGE",
          "persist/PAUSE",
          "persist/FLUSH",
        ],
        ignoredActionPaths: [
          "meta.arg",
          "payload.timestamp",
          "payload.result", // Ignore purge result which contains functions
        ],
      },
      // Disable immutable check in production for better performance
      immutableCheck: process.env.NODE_ENV !== "production",
    }),
  // Only enable DevTools in development
  devTools: process.env.NODE_ENV !== "production",
});

// Create persistor for redux-persist
export const persistor = persistStore(store);

// TypeScript types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;





