"use client";

import { motion } from "framer-motion";
import { DashboardHeader } from "./DashboardHeader";
import { ComplianceStatusCard } from "./ComplianceStatusCard";
import { VATSummaryCard } from "./VATSummaryCard";
import { InvoicesCard } from "./InvoicesCard";
import { PayrollCard } from "./PayrollCard";
import { QuickActionsCard } from "./QuickActionsCard";
import { NextStepCard } from "@/components/shared/NextStepCard";
import type { DashboardData } from "@/store/redux/dashboard/dashboard-slice";
import { AccountType } from "@/lib/utils/account-type";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/**
 * Business Account Dashboard Content
 * 
 * Production-ready component for business account (sole proprietorship) dashboard.
 * Displays compliance, VAT, invoices, and payroll metrics.
 * 
 * CRITICAL: Business accounts (sole proprietorships) use PIT (Personal Income Tax), NOT CIT (Company Income Tax).
 * This dashboard shows business-focused metrics while maintaining proper separation from Company accounts.
 * 
 * Features:
 * - Business-focused metrics and KPIs
 * - Compliance status monitoring
 * - VAT, invoices, and payroll summaries
 * - Quick actions for common business tasks
 * - Smooth animations and transitions
 * 
 * @param dashboardData - Business dashboard data from API
 */
interface BusinessDashboardContentProps {
  dashboardData: DashboardData | null;
}

export function BusinessDashboardContent({ dashboardData }: BusinessDashboardContentProps) {
  // CRITICAL: Validate props - fail loudly if invalid
  if (dashboardData === undefined) {
    throw new Error(
      "BusinessDashboardContent: dashboardData prop is required. " +
      "Pass null if no data is available, but never undefined."
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <DashboardHeader />

      {/* Compliance Status Card - For business accounts */}
      {dashboardData?.complianceStatus && (
        <ComplianceStatusCard 
          complianceStatus={dashboardData.complianceStatus} 
          accountType={AccountType.Business}
        />
      )}

      {/* Business Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <VATSummaryCard vatData={dashboardData?.currentMonthVAT || null} />
        <InvoicesCard totalInvoices={dashboardData?.totalInvoices || 0} accountType={AccountType.Business} />
        <PayrollCard payrollData={dashboardData?.currentMonthPayroll || null} accountType={AccountType.Business} />
      </div>

      <QuickActionsCard />

      <NextStepCard
        title="Start Here: Record Your Earnings"
        description="Track money you make by creating invoices. This helps us know which tax category you fall into."
        href="/dashboard/business/invoices"
        actionLabel="Record Earnings"
      />
    </motion.div>
  );
}



