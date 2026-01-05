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
 * Company Account Dashboard Content
 * 
 * Production-ready component for company account dashboard.
 * Displays compliance, VAT, invoices, and payroll metrics.
 * 
 * Features:
 * - Company-focused metrics and KPIs
 * - Compliance status monitoring
 * - VAT, invoices, and payroll summaries
 * - Quick actions for common company tasks
 * - Smooth animations and transitions
 * 
 * @param dashboardData - Company dashboard data from API
 */
interface CompanyDashboardContentProps {
  dashboardData: DashboardData | null;
}

export function CompanyDashboardContent({ dashboardData }: CompanyDashboardContentProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <DashboardHeader />

      {/* Compliance Status Card - Only for company accounts */}
      {dashboardData?.complianceStatus && (
        <ComplianceStatusCard 
          complianceStatus={dashboardData.complianceStatus} 
          accountType={AccountType.Company}
        />
      )}

      {/* Company Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <VATSummaryCard vatData={dashboardData?.currentMonthVAT || null} />
        <InvoicesCard totalInvoices={dashboardData?.totalInvoices || 0} accountType={AccountType.Company} />
        <PayrollCard payrollData={dashboardData?.currentMonthPayroll || null} accountType={AccountType.Company} />
      </div>

      <QuickActionsCard />

      <NextStepCard
        title="Start Here: Create an Invoice"
        description="Record money usually coming in. This is the first step to calculating your company's tax properly."
        href="/dashboard/invoices"
        actionLabel="Create Invoice"
      />
    </motion.div>
  );
}

