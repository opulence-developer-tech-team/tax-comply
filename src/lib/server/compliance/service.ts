import { Types } from "mongoose";
import { ComplianceStatus, RemittanceStatus, SubscriptionPlan, AccountType } from "../utils/enum";
import { AlertSeverity } from "../utils/alert-severity";
import { ComplianceAlertType } from "../../utils/client-enums";
import Company from "../company/entity";
import Business from "../business/entity";
import { VATSummary } from "../vat/entity";
import { payrollService } from "../payroll/service";
import Invoice from "../invoice/entity";
import { InvoiceStatus } from "../utils/enum";
import { logger } from "../utils/logger";
import { subscriptionService, SUBSCRIPTION_PRICING } from "../subscription/service";
import { WHTRemittance } from "../wht/entity";
import {
  NRS_VAT_DEADLINE_DAY,
  NRS_PAYE_DEADLINE_DAY,
  NRS_WHT_DEADLINE_DAY,
  NRS_CIT_DEADLINE_MONTH,
  NRS_CIT_DEADLINE_DAY,
  NRS_PIT_DEADLINE_MONTH,
  NRS_PIT_DEADLINE_DAY,
  COMPLIANCE_HIGH_VAT_PAYABLE_THRESHOLD,
  COMPLIANCE_SCORE_COMPLIANT,
  COMPLIANCE_SCORE_AT_RISK,
  NRS_VAT_TURNOVER_THRESHOLD_2026,
  NRS_WHT_EXEMPTION_THRESHOLD_2026,
} from "../../constants/nrs-constants";

export interface ComplianceAlert {
  type: ComplianceAlertType;
  severity: AlertSeverity;
  message: string;
  actionRequired: string;
}

export interface ComplianceStatusData {
  status: ComplianceStatus;
  score: number; 
  alerts: ComplianceAlert[];
  lastChecked: Date;
}

/**
 * Compliance Service
 * 
 * IMPORTANT: Compliance scoring and thresholds are INTERNAL APPLICATION LOGIC,
 * NOT official NRS regulations. These scores indicate internal compliance health
 * and risk levels, but do NOT represent official NRS compliance status.
 * 
 * Tax deadlines and rates referenced here ARE based on NRS regulations
 * and should be verified against: https://www.firs.gov.ng/
 * 
 * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 * NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 */
class ComplianceService {
  /**
   * Calculate compliance status for a company
   * 
   * Note: The compliance score is internal application logic, not a NRS regulation.
   * It helps identify areas requiring attention but does NOT represent official
   * NRS compliance status.
   */
  async calculateComplianceStatus(companyId: Types.ObjectId): Promise<ComplianceStatusData> {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const alerts: ComplianceAlert[] = [];
    let score = 100;

    if (!company.tin || company.tin.trim() === "") {
      alerts.push({
        type: ComplianceAlertType.MissingTIN,
        severity: AlertSeverity.High,
        message: "Tax Identification Number (TIN) is missing",
        actionRequired: "Go to Company → Edit company profile → Enter your TIN. TIN is required for all tax filings and compliance with NRS (Nigeria Revenue Service) regulations.",
      });
      score -= 20;
    }

    if (!company.cacNumber || company.cacNumber.trim() === "") {
      alerts.push({
        type: ComplianceAlertType.MissingCAC,
        severity: AlertSeverity.Medium,
        message: "CAC number is missing",
        actionRequired: "Go to Company → Edit company profile → Enter your CAC number (if registered). CAC registration is required for companies in Nigeria.",
      });
      score -= 10;
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const invoiceCount = await Invoice.countDocuments({
      companyId,
      issueDate: { $gte: currentMonthStart },
      status: { $ne: "cancelled" },
    });

    // CRITICAL: Calculate Annual Turnover for Company Compliance Checks
    // 2026 Act: Turnover > 25M triggers VAT Registration requirements
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    // Aggregate turnover from PAID invoices (same logic as Business check)
    const turnoverResult = await Invoice.aggregate([
        { 
          $match: { 
            companyId: companyId, 
            status: InvoiceStatus.Paid,
            issueDate: { $gte: startOfYear, $lte: endOfYear }
          } 
        },
        { $group: { _id: null, total: { $sum: "$subtotal" } } }
    ]);
    const annualTurnover = turnoverResult.length > 0 ? turnoverResult[0].total : 0;

    if (invoiceCount === 0) {
      alerts.push({
        type: ComplianceAlertType.MissingInvoice,
        severity: AlertSeverity.Low,
        message: "No invoices created this month",
        actionRequired: "Go to Invoices → Create invoice → Add your sales transactions. Invoices are required for VAT tracking and tax compliance.",
      });
      score -= 5;
    }

    const currentVATSummary = await VATSummary.findOne({
      companyId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    if (currentVATSummary) {
      if (currentVATSummary.outputVAT > 0 && currentVATSummary.inputVAT === 0) {
        alerts.push({
          type: ComplianceAlertType.VatMismatch,
          severity: AlertSeverity.Medium,
          message: "Output VAT recorded but no input VAT. Ensure you're tracking purchase VAT.",
          actionRequired: "Go to Expenses → Add expense → Enter your purchase invoices with VAT. The system will automatically calculate and record input VAT to reduce your VAT payable.",
        });
        score -= 15;
      }

      // Application logic threshold (NOT an NRS regulation) - flags high VAT payable for review
      if (currentVATSummary.netVAT > COMPLIANCE_HIGH_VAT_PAYABLE_THRESHOLD) {
        alerts.push({
          type: ComplianceAlertType.VatMismatch,
          severity: AlertSeverity.High,
          message: `High VAT payable: ₦${currentVATSummary.netVAT.toLocaleString()}. Review your VAT records.`,
          actionRequired: "Go to Expenses → Add all purchase invoices with VAT. Missing input VAT increases your VAT payable. Record all company purchases to claim input VAT credits.",
        });
        score -= 10;
      }
    } else if (annualTurnover > NRS_VAT_TURNOVER_THRESHOLD_2026) {
        // Case 2: Ghost Non-Filer Detection (Turnover > 25M but NO VAT Record)
        // CRITICAL: Using verified NTA 2025 threshold (25M)
        // This block is a placeholder for more detailed logic that would involve
        // `hasVatRecord`, `turnover`, `hasRecentTransactions`, `issues`, `ComplianceIssueType`, `ComplianceSeverity`, `ComplianceStatus.Pending`
        // which are not defined in this context.
        // For now, we'll keep the original alert structure but update the message and comment.
        alerts.push({
          type: ComplianceAlertType.TaxDeadline, // Use TaxDeadline as generic type for critical missing filing
          severity: AlertSeverity.Critical,
          message: `Turnover exceeds ₦${(NRS_VAT_TURNOVER_THRESHOLD_2026 / 1_000_000).toLocaleString()}M (VAT Threshold) but no VAT record found for this month.`,
          actionRequired: "You are legally required to file VAT. Go to Expenses/Invoices immediately to record VAT transactions or consult a tax professional.",
        });
        score -= 30; // Severe penalty for potential evasion
    }

    const currentPayrollSchedule = await payrollService.getPayrollSchedule(
      companyId,
      now.getMonth() + 1,
      now.getFullYear(),
      AccountType.Company
    );

    if (currentPayrollSchedule && (currentPayrollSchedule.totalPAYE || 0) > 0) {
      if (currentPayrollSchedule.status === "draft") {
        alerts.push({
          type: ComplianceAlertType.PayrollIssue,
          severity: AlertSeverity.Medium,
          message: "Payroll for this month is still in draft. Remit PAYE to NRS (Nigeria Revenue Service).",
          actionRequired: "Go to Payroll → Review this month's schedule → File PAYE Remittance → Generate remittance document → Remit to NRS (Nigeria Revenue Service). PAYE must be remitted by the 10th of the following month.",
        });
        score -= 10;
      }
    }

    // Check WHT remittance compliance
    const currentWHTRemittance = await WHTRemittance.findOne({
      companyId,
      remittanceMonth: now.getMonth() + 1,
      remittanceYear: now.getFullYear(),
    });

    if (currentWHTRemittance && currentWHTRemittance.totalWHTAmount > 0) {
      if (currentWHTRemittance.status === RemittanceStatus.Overdue) {
        alerts.push({
          type: ComplianceAlertType.WhtRemittance,
          severity: AlertSeverity.Critical,
          message: "WHT remittance is overdue. Remit immediately to avoid penalties.",
          actionRequired: "Go to WHT → Remittances → Mark as remitted → Enter remittance details. Overdue WHT remittances may incur NRS (Nigeria Revenue Service) penalties.",
        });
        score -= 25;
      } else if (currentWHTRemittance.status === RemittanceStatus.Pending) {
        const daysUntilDeadline = Math.ceil(
          (currentWHTRemittance.remittanceDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDeadline <= 7) {
          alerts.push({
            type: ComplianceAlertType.WhtRemittance,
            severity: daysUntilDeadline <= 3 ? AlertSeverity.Critical : AlertSeverity.High,
            message: `WHT remittance deadline in ${daysUntilDeadline} day(s)`,
            actionRequired: `Go to WHT → Remittances → Mark as remitted → Enter remittance details. WHT must be remitted by the 21st of the following month to avoid penalties.`,
          });
          score -= daysUntilDeadline <= 3 ? 20 : 10;
        }
      }
    }

    const taxDeadlines = this.getUpcomingTaxDeadlines(now, AccountType.Company);
    if (taxDeadlines.length > 0) {
      const nearestDeadline = taxDeadlines[0];
      const daysUntilDeadline = Math.ceil(
        (nearestDeadline.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline <= 7) {
        alerts.push({
          type: ComplianceAlertType.TaxDeadline,
          severity: daysUntilDeadline <= 3 ? AlertSeverity.Critical : AlertSeverity.High,
          message: `${nearestDeadline.name} deadline in ${daysUntilDeadline} day(s)`,
          actionRequired: nearestDeadline.action,
        });
        score -= daysUntilDeadline <= 3 ? 20 : 10;
      }
    }

    // Compliance score thresholds are application logic (NOT NRS regulations)
    // They indicate internal compliance health, not official NRS compliance status
    let status: ComplianceStatus;
    if (score >= COMPLIANCE_SCORE_COMPLIANT) {
      status = ComplianceStatus.Compliant;
    } else if (score >= COMPLIANCE_SCORE_AT_RISK) {
      status = ComplianceStatus.AtRisk;
    } else {
      status = ComplianceStatus.NonCompliant;
    }

    await Company.findByIdAndUpdate(companyId, {
      complianceStatus: status,
      lastComplianceCheck: new Date(),
    });

    return {
      status,
      score: Math.max(0, score),
      alerts: alerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      lastChecked: new Date(),
    };
  }

  /**
   * Get upcoming tax filing deadlines per NRS regulations
   * Reference: https://www.firs.gov.ng/
   * 
   * - VAT Returns: 21st of following month (per NRS regulations)
   * - PAYE Remittance: 10th of following month (per NRS regulations)
   * - CIT Returns: June 30th annually (per NRS regulations)
   * 
   * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
   * NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
   */
  getUpcomingTaxDeadlines(currentDate: Date, accountType: AccountType): Array<{ name: string; date: Date; action: string }> {
    const deadlines: Array<{ name: string; date: Date; action: string }> = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // VAT deadline: 21st of following month (per NRS regulations)
    // Example: January's VAT return is due February 21st
    // Always calculate for the following month, not current month
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const vatDeadline = new Date(nextMonthYear, nextMonth, NRS_VAT_DEADLINE_DAY);
    deadlines.push({
      name: "VAT Return",
      date: vatDeadline,
      action: "Go to Tax Filing → VAT Return → Download PDF → File with NRS (Nigeria Revenue Service). VAT returns are due by the 21st of the following month.",
    });

    // PAYE deadline: 10th of following month (per NRS regulations)
    // Example: January's PAYE remittance is due February 10th
    // Always calculate for the following month, not current month
    const payeDeadline = new Date(nextMonthYear, nextMonth, NRS_PAYE_DEADLINE_DAY);
    deadlines.push({
      name: "PAYE Remittance",
      date: payeDeadline,
      action: "Go to Payroll → Review this month's schedule → File PAYE Remittance → Generate remittance document → Remit to NRS (Nigeria Revenue Service). PAYE must be remitted by the 10th of the following month.",
    });

    // CIT (Company Income Tax) - Only for Companies
    if (accountType === AccountType.Company) {
      const citDeadline = new Date(year, NRS_CIT_DEADLINE_MONTH, NRS_CIT_DEADLINE_DAY);
      if (citDeadline >= currentDate) {
        deadlines.push({
          name: "Company Income Tax Return",
          date: citDeadline,
          action: "Go to Tax Filing → CIT Return → Download PDF → File with NRS (Nigeria Revenue Service). Annual CIT returns are due by June 30th each year.",
        });
      } else {
        const nextYearDeadline = new Date(year + 1, NRS_CIT_DEADLINE_MONTH, NRS_CIT_DEADLINE_DAY);
        deadlines.push({
          name: "Company Income Tax Return",
          date: nextYearDeadline,
          action: "Go to Tax Filing → CIT Return → Download PDF → File with NRS (Nigeria Revenue Service). Annual CIT returns are due by June 30th each year.",
        });
      }
    }

    // PIT (Personal Income Tax) - Only for Businesses (Sole Proprietorships)
    if (accountType === AccountType.Business) {
      const pitDeadline = new Date(year, NRS_PIT_DEADLINE_MONTH, NRS_PIT_DEADLINE_DAY);
      if (pitDeadline >= currentDate) {
        deadlines.push({
          name: "PIT Annual Return (Form A)",
          date: pitDeadline,
          action: "Go to Tax Filing → PIT Return → Download PDF → File with NRS (Nigeria Revenue Service). Annual PIT returns are due by March 31st each year.",
        });
      } else {
        const nextYearDeadline = new Date(year + 1, NRS_PIT_DEADLINE_MONTH, NRS_PIT_DEADLINE_DAY);
        deadlines.push({
          name: "PIT Annual Return (Form A)",
          date: nextYearDeadline,
          action: "Go to Tax Filing → PIT Return → Download PDF → File with NRS (Nigeria Revenue Service). Annual PIT returns are due by March 31st each year.",
        });
      }
    }

    return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async getComplianceDashboard(companyId: Types.ObjectId, userId?: Types.ObjectId) {
    const complianceStatus = await this.calculateComplianceStatus(companyId);
    const taxDeadlines = this.getUpcomingTaxDeadlines(new Date(), AccountType.Company);

    const now = new Date();
    const vatSummary = await VATSummary.findOne({
      companyId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    // Count ALL invoices for the company, regardless of status (including cancelled)
    const invoiceCount = await Invoice.countDocuments({
      companyId,
    });

    // Check subscription plan to determine if payroll data should be included
    // Payroll is only available on Company and Accountant plans
    // Subscriptions are user-based - use provided userId or get from company owner
    const ownerId = userId || (await Company.findById(companyId))?.ownerId;
    if (!ownerId) {
      return { currentMonthPayroll: null };
    }
    const subscription = await subscriptionService.getSubscription(ownerId);
    const plan = subscription?.plan || SubscriptionPlan.Free;
    const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
    const hasPayrollAccess = planFeatures?.payroll === true;

    // Only fetch payroll data if user has payroll access
    // CRITICAL: Totals are calculated on-the-fly from Payroll records
    let payrollSchedule = null;
    if (hasPayrollAccess) {
      payrollSchedule = await payrollService.getPayrollSchedule(
        companyId,
        now.getMonth() + 1,
        now.getFullYear(),
        AccountType.Company
      );
    }

    return {
      complianceStatus,
      taxDeadlines,
      currentMonthVAT: vatSummary,
      currentMonthPayroll: payrollSchedule,
      totalInvoices: invoiceCount,
    };
  }

  /**
   * Calculate compliance status for a business (sole proprietorship)
   * Similar to company compliance but adapted for business entities
   */
  async calculateComplianceStatusForBusiness(businessId: Types.ObjectId): Promise<ComplianceStatusData> {
    const business = await Business.findById(businessId);
    if (!business) {
      throw new Error("Business not found");
    }

    const alerts: ComplianceAlert[] = [];
    let score = 100;

    if (!business.tin || business.tin.trim() === "") {
      alerts.push({
        type: ComplianceAlertType.MissingTIN,
        severity: AlertSeverity.High,
        message: "Tax Identification Number (TIN) is missing",
        actionRequired: "Go to Business → Edit business profile → Enter your TIN. TIN is required for all tax filings and compliance with NRS (Nigeria Revenue Service) regulations.",
      });
      score -= 20;
    }

    // For businesses, check business registration number instead of CAC
    if (business.isRegistered && (!business.businessRegistrationNumber || business.businessRegistrationNumber.trim() === "")) {
      alerts.push({
        type: ComplianceAlertType.MissingCAC,
        severity: AlertSeverity.Medium,
        message: "Business registration number is missing",
        actionRequired: "Go to Business → Edit business profile → Enter your business registration number (if registered).",
      });
      score -= 10;
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // CRITICAL: Invoice compliance check
    const invoiceCount = await Invoice.countDocuments({
      companyId: businessId, // Invoice uses companyId as generic entityId
      issueDate: { $gte: currentMonthStart },
      status: { $ne: "cancelled" },
    });

    if (invoiceCount === 0) {
      alerts.push({
        type: ComplianceAlertType.MissingInvoice,
        severity: AlertSeverity.Low,
        message: "No invoices created this month",
        actionRequired: "Go to Invoices → Create invoice → Add your sales transactions. Invoices are required for turnover tracking and tax compliance.",
      });
      score -= 5;
    }

    // CRITICAL: Calculate Annual Turnover for Compliance Checks
    // 2026 Act: Turnover > 25M triggers VAT Registration
    // 2026 Act/2024 Regs: Turnover > 25M triggers WHT Compliance
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    // Aggregate turnover from PAID invoices
    // Use companyId field as Invoice model uses it as generic entityId
    const turnoverResult = await Invoice.aggregate([
        { 
          $match: { 
            companyId: businessId, 
            status: InvoiceStatus.Paid,
            issueDate: { $gte: startOfYear, $lte: endOfYear }
          } 
        },
        { $group: { _id: null, total: { $sum: "$subtotal" } } }
    ]);
    const annualTurnover = turnoverResult.length > 0 ? turnoverResult[0].total : 0;

    // CRITICAL: VAT Compliance Check
    // Businesses with turnover > 25M must track VAT
    const currentVATSummary = await VATSummary.findOne({
      businessId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    // Case 1: Active VAT tracking checks (mismatch, high payable)
    if (currentVATSummary) {
      if (currentVATSummary.outputVAT > 0 && currentVATSummary.inputVAT === 0) {
        alerts.push({
          type: ComplianceAlertType.VatMismatch,
          severity: AlertSeverity.Medium,
          message: "Output VAT recorded but no input VAT. Ensure you're tracking purchase VAT.",
          actionRequired: "Go to Expenses → Add expense → Enter your purchase invoices with VAT. The system will automatically calculate and record input VAT to reduce your VAT payable.",
        });
        score -= 15;
      }

      if (currentVATSummary.netVAT > COMPLIANCE_HIGH_VAT_PAYABLE_THRESHOLD) {
        alerts.push({
          type: ComplianceAlertType.VatMismatch,
          severity: AlertSeverity.High,
          message: `High VAT payable: ₦${currentVATSummary.netVAT.toLocaleString()}. Review your VAT records.`,
          actionRequired: "Go to Expenses → Add all purchase invoices with VAT. Missing input VAT increases your VAT payable.",
        });
        score -= 10;
      }
    } 
        // Case 2: Ghost Non-Filer Detection (Turnover > 25M but NO VAT Record)
        // CRITICAL: Using verified NTA 2025 threshold (25M)
        if (
          !currentVATSummary && 
          annualTurnover >= NRS_VAT_TURNOVER_THRESHOLD_2026 && 
          invoiceCount > 0 // Assuming invoiceCount > 0 implies recent transactions
        ) {
          alerts.push({
            type: ComplianceAlertType.TaxDeadline, // Using TaxDeadline as generic type for critical missing filing
            severity: AlertSeverity.Critical, // High severity as they are liable
            message: `Turnover exceeds ₦${(NRS_VAT_TURNOVER_THRESHOLD_2026 / 1_000_000).toLocaleString()}M (VAT Threshold) but no VAT record found for this month.`,
            actionRequired: "You are legally required to file VAT. Go to Expenses/Invoices immediately to record VAT transactions or consult a tax professional.",
            // penaltyRisk: "Failure to file VAT can attract a fine of ₦50,000 for the first month and ₦25,000 for subsequent months.", // This is not part of ComplianceAlert type
            // impact: "High", // This is not part of ComplianceAlert type
            // status: ComplianceStatus.Pending // This is not part of ComplianceAlert type
          });
          score -= 30; // Severe penalty for potential evasion
        }

    // CRITICAL: Payroll Compliance Check
    // Businesses acting as agents for PAYE must remit
    const currentPayrollSchedule = await payrollService.getPayrollSchedule(
      businessId,
      now.getMonth() + 1,
      now.getFullYear(),
      AccountType.Business
    );

    if (currentPayrollSchedule && (currentPayrollSchedule.totalPAYE || 0) > 0) {
      if (currentPayrollSchedule.status === "draft") {
        alerts.push({
          type: ComplianceAlertType.PayrollIssue,
          severity: AlertSeverity.Medium,
          message: "Payroll for this month is still in draft. Remit PAYE to NRS (Nigeria Revenue Service).",
          actionRequired: "Go to Payroll → Review this month's schedule → File PAYE Remittance → Generate remittance document → Remit to NRS (Nigeria Revenue Service). PAYE must be remitted by the 10th of the following month.",
        });
        score -= 10;
      }
    }
    
    // CRITICAL: WHT Remittance Check
    const currentWHTRemittance = await WHTRemittance.findOne({
      businessId, 
      remittanceMonth: now.getMonth() + 1,
      remittanceYear: now.getFullYear(),
    });

    // Case 1: Active WHT Remittance checks
    if (currentWHTRemittance && currentWHTRemittance.totalWHTAmount > 0) {
      // ... existing check logic ...
    }
    // Case 2: WHT Threshold Warning (Turnover > 25M)
    // If turnover > 25M, they are NO LONGER WHT EXEMPT.
    // If they have no WHT records, we should warn them to check if they had qualifying expenses.
    // This is a "Warning" (Medium) not "Critical" because they might legitimately not have had WHT-able expenses this month.
    else if (annualTurnover > NRS_WHT_EXEMPTION_THRESHOLD_2026 && !currentWHTRemittance) {
         alerts.push({
          type: ComplianceAlertType.WhtRemittance,
          severity: AlertSeverity.Medium,
          message: `Annual Turnover exceeds ₦25M. You are NOT exempt from deducting WHT.`,
          actionRequired: "Verify if you made any payments to vendors/landlords this month. If so, you must deduct and remit WHT.",
        });
        // Small score deduction as a warning
        score -= 5;
    }

    if (currentWHTRemittance && currentWHTRemittance.totalWHTAmount > 0) {
      if (currentWHTRemittance.status === RemittanceStatus.Overdue) {
        alerts.push({
          type: ComplianceAlertType.WhtRemittance,
          severity: AlertSeverity.Critical,
          message: "WHT remittance is overdue. Remit immediately to avoid penalties.",
          actionRequired: "Go to WHT → Remittances → Mark as remitted → Enter remittance details. Overdue WHT remittances may incur NRS (Nigeria Revenue Service) penalties.",
        });
        score -= 25;
      } else if (currentWHTRemittance.status === RemittanceStatus.Pending) {
        const daysUntilDeadline = Math.ceil(
          (currentWHTRemittance.remittanceDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDeadline <= 7) {
          alerts.push({
            type: ComplianceAlertType.WhtRemittance,
            severity: daysUntilDeadline <= 3 ? AlertSeverity.Critical : AlertSeverity.High,
            message: `WHT remittance deadline in ${daysUntilDeadline} day(s)`,
            actionRequired: `Go to WHT → Remittances → Mark as remitted → Enter remittance details. WHT must be remitted by the 21st of the following month.`,
          });
          score -= daysUntilDeadline <= 3 ? 20 : 10;
        }
      }
    }

    // Compliance score thresholds are application logic (NOT NRS regulations)
    let status: ComplianceStatus;
    if (score >= COMPLIANCE_SCORE_COMPLIANT) {
      status = ComplianceStatus.Compliant;
    } else if (score >= COMPLIANCE_SCORE_AT_RISK) {
      status = ComplianceStatus.AtRisk;
    } else {
      status = ComplianceStatus.NonCompliant;
    }

    await Business.findByIdAndUpdate(businessId, {
      complianceStatus: status,
      lastComplianceCheck: new Date(),
    });

    return {
      status,
      score: Math.max(0, score),
      alerts: alerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      lastChecked: new Date(),
    };
  }

  async getComplianceDashboardForBusiness(businessId: Types.ObjectId, userId?: Types.ObjectId) {
    const complianceStatus = await this.calculateComplianceStatusForBusiness(businessId);
    const taxDeadlines = this.getUpcomingTaxDeadlines(new Date(), AccountType.Business);

    const now = new Date();
    
    // CRITICAL: Fetch VAT Summary for Business (using businessId)
    // Supports 2026 Act requirement for businesses with >= 25M turnover to track VAT
    const vatSummary = await VATSummary.findOne({
      businessId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    // CRITICAL: Invoices for Business (uses companyId field as generic entityId)
    // Count ALL invoices for the business, regardless of status (including cancelled)
    const invoiceCount = await Invoice.countDocuments({
      companyId: businessId, // Invoice model uses companyId as generic entityId
    });

    // Check subscription plan to determine if payroll data should be included
    // Payroll is only available on Business/Company plans that include it
    const ownerId = userId || (await Business.findById(businessId))?.ownerId;
    
    // Default to null if no owner found (shouldn't happen for valid business)
    let payrollSchedule = null;
    
    if (ownerId) {
      const subscription = await subscriptionService.getSubscription(ownerId);
      const plan = subscription?.plan || SubscriptionPlan.Free;
      const planFeatures = SUBSCRIPTION_PRICING[plan]?.features;
      const hasPayrollAccess = planFeatures?.payroll === true;

      // Only fetch payroll data if user has payroll access
      if (hasPayrollAccess) {
        payrollSchedule = await payrollService.getPayrollSchedule(
          businessId,
          now.getMonth() + 1,
          now.getFullYear(),
          AccountType.Business
        );
      }
    }

    return {
      complianceStatus,
      taxDeadlines,
      currentMonthVAT: vatSummary,
      currentMonthPayroll: payrollSchedule,
      totalInvoices: invoiceCount,
    };
  }
}

export const complianceService = new ComplianceService();





