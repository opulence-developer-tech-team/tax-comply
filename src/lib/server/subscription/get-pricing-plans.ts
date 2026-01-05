import { SUBSCRIPTION_PRICING } from "@/lib/constants/subscription";
import { SubscriptionPlan } from "../utils/enum";

/**
 * SINGLE SOURCE OF TRUTH for subscription plan descriptions
 * 
 * This file contains all plan descriptions, features, and marketing copy.
 * All other files should reference this file to ensure consistency.
 */

export interface PlanDescription {
  name: string;
  plan: SubscriptionPlan;
  monthly: number;
  yearly: number;
  discountMonthly: number;
  discountYearly: number;
  description: string;
  features: string[];
  gradient: string;
  border: string;
}

export async function getPricingPlans(): Promise<PlanDescription[]> {
  // Helper to format numeric values (-1 -> "Unlimited")
  const fmt = (val: number) => val === -1 ? "Unlimited" : val.toLocaleString();
  
  // Helper to check boolean flags safely
  const has = (plan: SubscriptionPlan, key: keyof typeof SUBSCRIPTION_PRICING[SubscriptionPlan.Premium]["features"]) => 
    (SUBSCRIPTION_PRICING[plan].features as any)[key] === true;

  const plans: PlanDescription[] = [
    {
      name: "Free",
      plan: SubscriptionPlan.Free,
      monthly: SUBSCRIPTION_PRICING[SubscriptionPlan.Free].monthly,
      yearly: SUBSCRIPTION_PRICING[SubscriptionPlan.Free].yearly,
      discountMonthly: 0,
      discountYearly: 0,
      description: "", 
      features: [
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Free].features.invoicesPerMonth)} NRS-compliant invoices`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Free].features.maxCompanies)} company or business accounts`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Free].features.expensesPerMonth)} expense records & categories`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Free].features.incomeSources)} Income Sources`,
        has(SubscriptionPlan.Free, "vatTracking") ? "VAT Automation" : "",
        has(SubscriptionPlan.Free, "whtTracking") ? "WHT Management" : "",
        has(SubscriptionPlan.Free, "payroll") ? "Payroll Management" : "",
        has(SubscriptionPlan.Free, "exports") ? "Export Data" : "",
        has(SubscriptionPlan.Free, "watermark") ? "Watermarked Invoices" : "No Watermark",
        has(SubscriptionPlan.Free, "multipleCompanies") ? "Multiple Companies Management" : "",
        has(SubscriptionPlan.Free, "whiteLabel") ? "White-Labeling" : "",
        has(SubscriptionPlan.Free, "allFeatures") ? "Access to All Features" : "",
        has(SubscriptionPlan.Free, "allPages") ? "Full Platform Access" : "",
        has(SubscriptionPlan.Free, "expenseTracking") ? "Advanced Expense Tracking" : "",
        has(SubscriptionPlan.Free, "realTimeTaxCalculation") ? "Real-time Tax Calculation" : "",
        has(SubscriptionPlan.Free, "monthlyProfitTracking") ? "Monthly Profit Tracking" : "",
        has(SubscriptionPlan.Free, "individualAccounts") ? "Individual Account Support" : "",
        has(SubscriptionPlan.Free, "multipleAccounts") ? "Multiple Accounts Support" : "",
        has(SubscriptionPlan.Free, "advancedReporting") ? "Advanced Reporting" : "",
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Free].features.expenseCategories)} Expense Categories`,
        has(SubscriptionPlan.Free, "pitTracking") ? "PIT Tracking" : "",
        has(SubscriptionPlan.Free, "pitReturns") ? "PIT Returns" : "",
        has(SubscriptionPlan.Free, "pitRemittance") ? "PIT Remittance" : "",
        has(SubscriptionPlan.Free, "citTracking") ? "CIT Tracking" : "",
        has(SubscriptionPlan.Free, "citRemittance") ? "CIT Remittance" : "",
        has(SubscriptionPlan.Free, "vatRemittance") ? "VAT Remittance" : "",
        "TIN Registration Guide",
      ].filter(Boolean), // Remove empty strings
      gradient: "from-slate-50 to-white",
      border: "border-slate-200",
    },
    {
      name: "Starter",
      plan: SubscriptionPlan.Starter,
      monthly: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].monthly,
      yearly: SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].yearly,
      discountMonthly: 15000, 
      discountYearly: 150000,
      description: "",
      features: [
        // "Perfect for: Individuals, Freelancers Sole Proprietors and Business",
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].features.invoicesPerMonth)} NRS-compliant invoices`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].features.maxCompanies)} company or business accounts`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].features.expensesPerMonth)} expense records & categories`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].features.incomeSources)} Income Sources`,
        has(SubscriptionPlan.Starter, "vatTracking") ? "VAT Automation" : "",
        has(SubscriptionPlan.Starter, "whtTracking") ? "WHT Management" : "",
        has(SubscriptionPlan.Starter, "payroll") ? "Payroll Management" : "",
        has(SubscriptionPlan.Starter, "exports") ? "Export Data" : "",
        has(SubscriptionPlan.Starter, "watermark") ? "Watermarked Invoices" : "No Watermark",
        has(SubscriptionPlan.Starter, "multipleCompanies") ? "Multiple Companies Management" : "",
        has(SubscriptionPlan.Starter, "whiteLabel") ? "White-Labeling" : "",
        has(SubscriptionPlan.Starter, "allFeatures") ? "Access to All Features" : "",
        has(SubscriptionPlan.Starter, "allPages") ? "Full Platform Access" : "",
        has(SubscriptionPlan.Starter, "expenseTracking") ? "Advanced Expense Tracking" : "",
        has(SubscriptionPlan.Starter, "realTimeTaxCalculation") ? "Real-time Tax Calculation" : "",
        has(SubscriptionPlan.Starter, "monthlyProfitTracking") ? "Monthly Profit Tracking" : "",
        has(SubscriptionPlan.Starter, "individualAccounts") ? "Individual Account Support" : "",
        has(SubscriptionPlan.Starter, "multipleAccounts") ? "Multiple Accounts Support" : "",
        has(SubscriptionPlan.Starter, "advancedReporting") ? "Advanced Reporting" : "",
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Starter].features.expenseCategories)} Expense Categories`,
        has(SubscriptionPlan.Starter, "pitTracking") ? "PIT Tracking" : "",
        has(SubscriptionPlan.Starter, "pitReturns") ? "PIT Returns" : "",
        has(SubscriptionPlan.Starter, "pitRemittance") ? "PIT Remittance" : "",
        has(SubscriptionPlan.Starter, "citTracking") ? "CIT Tracking" : "",
        has(SubscriptionPlan.Starter, "citRemittance") ? "CIT Remittance" : "",
        has(SubscriptionPlan.Starter, "vatRemittance") ? "VAT Remittance" : "",
        "Financial Statements for Banks/NRS",
        "Priority Support",
      ].filter(Boolean),
      gradient: "from-emerald-50 to-white",
      border: "border-emerald-200",
    },
    {
      name: "Standard",
      plan: SubscriptionPlan.Standard,
      monthly: SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].monthly,
      yearly: SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].yearly,
      discountMonthly: 45000,
      discountYearly: 450000,
      description: "",
      features: [
        // "Perfect for: Limited Liability Companies, Sole Proprietors and Business",
        "Everything in Starter plan",
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].features.invoicesPerMonth)} NRS-compliant invoices`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].features.maxCompanies)} company or business accounts`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].features.expensesPerMonth)} expense records & categories`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].features.incomeSources)} Income Sources`,
        has(SubscriptionPlan.Standard, "vatTracking") ? "VAT Automation" : "",
        has(SubscriptionPlan.Standard, "whtTracking") ? "WHT Management" : "",
        has(SubscriptionPlan.Standard, "payroll") ? "Payroll Management" : "",
        has(SubscriptionPlan.Standard, "exports") ? "Export Data" : "",
        has(SubscriptionPlan.Standard, "watermark") ? "Watermarked Invoices" : "No Watermark",
        has(SubscriptionPlan.Standard, "multipleCompanies") ? "Multiple Companies Management" : "",
        has(SubscriptionPlan.Standard, "whiteLabel") ? "White-Labeling" : "",
        has(SubscriptionPlan.Standard, "allFeatures") ? "Access to All Features" : "",
        has(SubscriptionPlan.Standard, "allPages") ? "Full Platform Access" : "",
        has(SubscriptionPlan.Standard, "expenseTracking") ? "Advanced Expense Tracking" : "",
        has(SubscriptionPlan.Standard, "realTimeTaxCalculation") ? "Real-time Tax Calculation" : "",
        has(SubscriptionPlan.Standard, "monthlyProfitTracking") ? "Monthly Profit Tracking" : "",
        has(SubscriptionPlan.Standard, "individualAccounts") ? "Individual Account Support" : "",
        has(SubscriptionPlan.Standard, "advancedReporting") ? "Advanced Reporting" : "",
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Standard].features.expenseCategories)} Expense Categories`,
        has(SubscriptionPlan.Standard, "pitTracking") ? "PIT Tracking" : "",
        has(SubscriptionPlan.Standard, "pitReturns") ? "PIT Returns" : "",
        has(SubscriptionPlan.Standard, "pitRemittance") ? "PIT Remittance" : "",
        has(SubscriptionPlan.Standard, "citTracking") ? "CIT Tracking" : "",
        has(SubscriptionPlan.Standard, "citRemittance") ? "CIT Remittance" : "",
        has(SubscriptionPlan.Standard, "vatRemittance") ? "VAT Remittance" : "",
        "Small Company (0% Tax) Validation",
        "Annual Returns & CAC Filing Support",
        "Audit-Ready Financial Reports",
      ].filter(Boolean),
      gradient: "from-blue-50 to-white",
      border: "border-blue-200",
    },
    {
      name: "Premium",
      plan: SubscriptionPlan.Premium,
      monthly: SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].monthly,
      yearly: SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].yearly,
      discountMonthly: 150000,
      discountYearly: 1500000,
      description: "",
      features: [
        "Everything in Standard plan",
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].features.maxCompanies)} company or business accounts`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].features.expensesPerMonth)} expense records & categories`,
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].features.incomeSources)} Income Sources`,
        has(SubscriptionPlan.Premium, "vatTracking") ? "VAT Automation" : "",
        has(SubscriptionPlan.Premium, "whtTracking") ? "WHT Management" : "",
        has(SubscriptionPlan.Premium, "payroll") ? "Payroll Management" : "",
        has(SubscriptionPlan.Premium, "exports") ? "Export Data" : "",
        has(SubscriptionPlan.Premium, "watermark") ? "Watermarked Invoices" : "No Watermark",
        has(SubscriptionPlan.Premium, "multipleCompanies") ? "Multiple Companies Management" : "",
        has(SubscriptionPlan.Premium, "whiteLabel") ? "White-Labeling" : "",
        has(SubscriptionPlan.Premium, "allFeatures") ? "Access to All Features" : "",
        has(SubscriptionPlan.Premium, "allPages") ? "Full Platform Access" : "",
        has(SubscriptionPlan.Premium, "expenseTracking") ? "Advanced Expense Tracking" : "",
        has(SubscriptionPlan.Premium, "realTimeTaxCalculation") ? "Real-time Tax Calculation" : "",
        has(SubscriptionPlan.Premium, "monthlyProfitTracking") ? "Monthly Profit Tracking" : "",
        has(SubscriptionPlan.Premium, "individualAccounts") ? "Individual Account Support" : "",
        has(SubscriptionPlan.Premium, "multipleAccounts") ? "Multiple Accounts Support" : "",
        has(SubscriptionPlan.Premium, "advancedReporting") ? "Advanced Reporting" : "",
        `${fmt(SUBSCRIPTION_PRICING[SubscriptionPlan.Premium].features.expenseCategories)} Expense Categories`,
        has(SubscriptionPlan.Premium, "pitTracking") ? "PIT Tracking" : "",
        has(SubscriptionPlan.Premium, "pitReturns") ? "PIT Returns" : "",
        has(SubscriptionPlan.Premium, "pitRemittance") ? "PIT Remittance" : "",
        has(SubscriptionPlan.Premium, "citTracking") ? "CIT Tracking" : "",
        has(SubscriptionPlan.Premium, "citRemittance") ? "CIT Remittance" : "",
        has(SubscriptionPlan.Premium, "vatRemittance") ? "VAT Remittance" : "",
        "Tax filing: All tax types",
        "Individual, Company & Business account support",
      ].filter(Boolean),
      gradient: "from-purple-50 to-white",
      border: "border-purple-200",
    },
  ];

  return plans;
}
