/**
 * Tax calculation functions based on NRS (Nigeria Revenue Service) regulations.
 * Reference: https://www.firs.gov.ng/ (NRS official website)
 * 
 * IMPORTANT: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 * These rates and brackets should be verified against the official NRS website
 * and updated whenever NRS announces changes to tax regulations.
 * 
 * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 */
import { NRS_VAT_RATE, NRS_CIT_RATE, NRS_ITF_TURNOVER_THRESHOLD, NRS_ITF_EMPLOYEE_THRESHOLD } from "../../constants/nrs-constants";
import { PAYE_TAX_BRACKETS_2026_ANNUAL } from "@/lib/constants/tax";
import { AccountType, TaxClassification } from "../utils/enum";

export interface PAYETaxBracket {
  min: number;
  max: number;
  rate: number;
}

/**
 * Personal Income Tax (PAYE) brackets - NRS ANNUAL brackets converted to MONTHLY
 * Source: NRS (Nigeria Revenue Service)
 * Personal Income Tax Act (PITA)
 * 
 * CRITICAL: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 * 
 * NRS Official ANNUAL brackets:
 * - First ₦300,000: 7%
 * - Next ₦300,000: 11%
 * - Next ₦500,000: 15%
 * - Next ₦500,000: 19%
 * - Next ₦1,600,000: 21%
 * - Above ₦3,200,000: 24%
 * 
 * Converted to MONTHLY for payroll calculations:
 */
const PAYE_TAX_BRACKETS_2024: PAYETaxBracket[] = [
  { min: 0, max: 25000, rate: 7 },           // First ₦300,000 annual = ₦25,000 monthly
  { min: 25000, max: 50000, rate: 11 },     // Next ₦300,000 annual = ₦25,000 monthly
  { min: 50000, max: 91666.67, rate: 15 },  // Next ₦500,000 annual = ₦41,666.67 monthly
  { min: 91666.67, max: 133333.33, rate: 19 }, // Next ₦500,000 annual = ₦41,666.67 monthly
  { min: 133333.33, max: 266666.67, rate: 21 }, // Next ₦1,600,000 annual = ₦133,333.33 monthly
  { min: 266666.67, max: Infinity, rate: 24 },  // Above ₦3,200,000 annual = ₦266,666.67 monthly
];

/**
 * Personal Income Tax (PAYE) brackets for 2026 and later
 * Source: Nigeria Tax Act 2025 (effective January 1, 2026)
 * Mercans Statutory Alert - Nigeria Changes to Personal Income Tax September 2025
 * Reference: https://mercans.com/resources/statutory-alerts/nigeria-changes-to-personal-income-tax-september-2025
 * 
 * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 * 
 * Official ANNUAL brackets (2026+):
 * - 0-800,000: 0%
 * - 800,001-3,000,000: 15%
 * - 3,000,001-12,000,000: 18%
 * - 12,000,001-25,000,000: 21%
 * - 25,000,001-50,000,000: 23%
 * - Above 50,000,000: 25%
 * 
 * Converted to MONTHLY for payroll calculations:
 */
const PAYE_TAX_BRACKETS_2026: PAYETaxBracket[] = [
  { min: 0, max: 66666.67, rate: 0 },           // First ₦800,000 annual = ₦66,666.67 monthly (0%)
  { min: 66666.67, max: 250000, rate: 15 },    // Next ₦2,200,000 annual = ₦183,333.33 monthly (15%)
  { min: 250000, max: 1000000, rate: 18 },     // Next ₦9,000,000 annual = ₦750,000 monthly (18%)
  { min: 1000000, max: 2083333.33, rate: 21 }, // Next ₦13,000,000 annual = ₦1,083,333.33 monthly (21%)
  { min: 2083333.33, max: 4166666.67, rate: 23 }, // Next ₦25,000,000 annual = ₦2,083,333.33 monthly (23%)
  { min: 4166666.67, max: Infinity, rate: 25 }, // Above ₦50,000,000 annual = ₦4,166,666.67+ monthly (25%)
];

/**
 * Personal Income Tax exemption thresholds per Nigeria Tax Act 2025
 * Source: Nigeria Tax Act 2025, Fiscal Reforms (https://fiscalreforms.ng/)
 * Reference: https://www.nipc.gov.ng/wp-content/uploads/2025/07/Nigeria-Tax-Act-2025.pdf
 * 
 * 2024: No personal income tax exemption
 * 2026+: ₦800,000 annual exemption threshold for individuals (₦66,666.67 monthly)
 * 
 * CRITICAL: Per Nigeria Tax Act 2025 (effective January 1, 2026):
 * - Full tax exemption for minimum wage earners with annual income ≤ ₦800,000
 * - For others, ₦800,000 is subtracted from taxable income before calculating tax
 * 
 * Source: Mercans Statutory Alert - Nigeria Changes to Personal Income Tax September 2025
 * Reference: https://mercans.com/resources/statutory-alerts/nigeria-changes-to-personal-income-tax-september-2025
 * 
 * IMPORTANT: This exemption applies ONLY to individuals, not companies.
 * Companies are subject to Company Income Tax (CIT) which has different rules.
 * 
 * CRITICAL: Effective January 1, 2026, CRA (Consolidated Relief Allowance) has been
 * replaced by new tax reliefs. The ₦800,000 exemption threshold is the new threshold.
 */
const PAYE_ANNUAL_EXEMPTION_2024 = 0;
const PAYE_ANNUAL_EXEMPTION_2026 = 800000; // Updated per Nigeria Tax Act 2025 (effective January 1, 2026)
const PAYE_MONTHLY_EXEMPTION_2026 = PAYE_ANNUAL_EXEMPTION_2026 / 12;

// Export for use in calculations and display
// Note: This exemption is ONLY for individuals, not companies
export function getAnnualTaxExemption(taxYear?: number, accountType?: AccountType): number {
  // Companies don't get personal income tax exemption
  if (accountType === AccountType.Company) {
    return 0;
  }
  
  const year = taxYear || getTaxYear();
  return year >= 2026 ? PAYE_ANNUAL_EXEMPTION_2026 : PAYE_ANNUAL_EXEMPTION_2024;
}

/**
 * Get the tax year for calculations
 * CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025.
 * Always returns minimum 2026 - never returns 2024 or earlier.
 */
export function getTaxYear(): number {
  const currentDate = new Date();
  // CRITICAL: Always return minimum 2026 - this app does NOT support pre-2026 tax laws
  return Math.max(2026, currentDate.getFullYear());
}

/**
 * Calculate PAYE (Pay As You Earn) tax
 * Source: Nigeria Tax Act 2025, Fiscal Reforms (https://fiscalreforms.ng/)
 * Reference: https://www.nipc.gov.ng/wp-content/uploads/2025/07/Nigeria-Tax-Act-2025.pdf
 * 
 * CRITICAL CHANGES FOR 2026+:
 * - CRA has been REPLACED (no longer deducted from taxable income)
 * - Exemption is now ₦800,000 annual (₦66,666.67 monthly) per Nigeria Tax Act 2025
 * - NHIS is now deductible (included in taxableIncome calculation)
 * 
 * The 2026 exemption (₦800,000 annual) replaces CRA - they are NOT both applied
 * 
 * MINIMUM TAX: For individuals earning less than ₦300,000 annually (₦25,000 monthly),
 * NRS requires minimum tax of 1% of gross income (not taxable income).
 * 
 * @param taxableIncome - Monthly taxable income (after deductions, CRA removed for 2026+)
 * @param grossSalary - Monthly gross salary (required for minimum tax calculation)
 * @param taxYear - Tax year for calculation
 * @returns Monthly PAYE amount (rounded to 2 decimal places)
 */
export function calculatePAYE(taxableIncome: number, grossSalary?: number, taxYear?: number): number {
  if (taxableIncome <= 0) {
    // Apply minimum tax if applicable (for low-income earners)
    if (grossSalary && grossSalary > 0) {
      const annualGross = grossSalary * 12;
      if (annualGross < 300000) {
        // Minimum tax: 1% of gross income for those earning < ₦300,000 annually
        const minimumTax = annualGross * 0.01;
        return Math.round((minimumTax / 12) * 100) / 100;
      }
    }
    return 0;
  }

  const year = taxYear || getTaxYear();
  const brackets = year >= 2026 ? PAYE_TAX_BRACKETS_2026 : PAYE_TAX_BRACKETS_2024;
  
  // CRITICAL FIX: For 2026+, the exemption is built into the tax brackets (0% rate).
  // We apply the tax brackets directly to the taxable income.
  const adjustedTaxableIncome = taxableIncome;
  
  if (adjustedTaxableIncome <= 0) {
    return 0;
  }

  let totalTax = 0;
  let remainingIncome = adjustedTaxableIncome;

  // Apply progressive tax brackets
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const bracketRange = bracket.max === Infinity 
      ? remainingIncome 
      : Math.min(bracket.max - bracket.min, remainingIncome);

    if (bracketRange > 0) {
      const taxInBracket = bracketRange * (bracket.rate / 100);
      totalTax += taxInBracket;
      remainingIncome -= bracketRange;
    }
  }

  // Apply minimum tax rule if applicable
  // CRITICAL: For 2026+, minimum tax rules for individuals have been largely superseded 
  // by the N800k exemption. We do NOT enforce the old "1% of gross if < 300k" rule 
  // as it violates the new exemption threshold principle.
  
  return Math.round(totalTax * 100) / 100;
}

/**
 * Calculate annual Personal Income Tax (PIT) from monthly PAYE
 * Converts monthly PAYE to annual PIT for tax filing purposes
 * 
 * @param monthlyPAYE - Monthly PAYE amount
 * @returns Annual PIT amount (rounded to 2 decimal places)
 */
export function calculateAnnualPITFromPAYE(monthlyPAYE: number): number {
  if (monthlyPAYE <= 0) {
    return 0;
  }
  // Annual PIT = Monthly PAYE × 12
  return Math.round((monthlyPAYE * 12) * 100) / 100;
}

/**
 * Calculate annual Personal Income Tax (PIT) from annual taxable income
 * Uses NRS annual tax brackets directly (not monthly conversion)
 * 
 * CRITICAL FOR 2026+:
 * - Exemption is ₦800,000 annual per Nigeria Tax Act 2025 (effective January 1, 2026)
 * - CRA has been replaced and is no longer applicable
 * 
 * @param annualTaxableIncome - Annual taxable income (after deductions, CRA removed for 2026+)
 * @param taxYear - Tax year for calculation
 * @returns Annual PIT amount (rounded to 2 decimal places)
 */
export function calculateAnnualPIT(
  annualTaxableIncome: number,
  taxYear?: number
): number {
  if (annualTaxableIncome <= 0) {
    return 0;
  }

  const year = taxYear || getTaxYear();
  
  // CRITICAL FIX: For 2026+, the exemption (₦800,000) is built into the tax brackets (0% rate).
  // Therefore, we do NOT subtract it from taxable income before applying the brackets.
  // We apply the tax brackets directly to the full taxable income.
  const adjustedTaxableIncome = annualTaxableIncome;

  if (adjustedTaxableIncome <= 0) {
    return 0;
  }

  // CRITICAL: Tax brackets per Nigeria Tax Act 2025 (effective January 1, 2026)
  // Source: Mercans Statutory Alert - Nigeria Changes to Personal Income Tax September 2025
  // Reference: https://mercans.com/resources/statutory-alerts/nigeria-changes-to-personal-income-tax-september-2025
  // Official rates from Nigeria Tax Act 2025:
  // IMPORTED FROM SHARED CONSTANTS TO ENSURE CONSISTENCY
  const annualBrackets = PAYE_TAX_BRACKETS_2026_ANNUAL;

  let totalTax = 0;
  let remainingIncome = adjustedTaxableIncome;

  for (const bracket of annualBrackets) {
    if (remainingIncome <= 0) break;

    const taxableInBracket = Math.min(
      remainingIncome,
      bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min
    );

    if (taxableInBracket > 0) {
      totalTax += taxableInBracket * (bracket.rate / 100);
      remainingIncome -= taxableInBracket;
    }
  }

  return Math.round(totalTax * 100) / 100;
}

/**
 * Check if a company is exempt from CIT based on turnover and tax year.
 * Source: Nigeria Tax Act 2025
 * 
 * - Pre-2026: Exempt if turnover <= 25M
 * - 2026+: Exempt if turnover <= 50M
 * 
 * @param annualTurnover - Annual turnover of the company
 * @param taxYear - Tax year
 */
export function isCITExempt(annualTurnover: number, taxYear?: number): boolean {
  const year = taxYear || getTaxYear();
  
  if (year >= 2026) {
    return annualTurnover <= 50_000_000;
  } else {
    return annualTurnover <= 25_000_000;
  }
}

/**
 * Calculate Company Income Tax (CIT) for companies.
 * 
 * @param taxableIncome - Annual taxable income (after deductions)
 * @param taxYear - Tax year for calculation
 * @returns CIT amount (rounded to 2 decimal places)
 */
export function calculateCorporateIncomeTax(
  taxableIncome: number,
  taxYear?: number
): number {
  if (taxableIncome <= 0) {
    return 0;
  }

  // Company Income Tax rate in Nigeria: 30% (standard rate)
  // Small companies may have different rates, but for expense deduction purposes,
  // we use the standard rate
  // Company Income Tax rate in Nigeria: 30% (standard rate)
  // Small companies may have different rates, but for expense deduction purposes,
  // we use the standard rate
  const citRate = NRS_CIT_RATE / 100; // 30%
  
  const cit = taxableIncome * citRate;
  return Math.round(cit * 100) / 100;
}

/**
 * Calculate actual tax savings from deductible expenses using real income data.
 * 
 * Formula: Tax(Income) - Tax(Income - DeductibleExpenses)
 * 
 * @param annualIncome - Gross annual income for the tax year
 * @param deductibleExpenses - Total amount of tax-deductible expenses (annual)
 * @param taxYear - Tax year for calculation
 * @param accountType - "individual" or "company" to determine tax calculation method
 * @returns Actual tax savings amount (rounded to 2 decimal places)
 */
export function calculateTaxSavings(
  annualIncome: number,
  deductibleExpenses: number,
  taxYear: number,
  accountType: AccountType = AccountType.Individual
): number {
  if (annualIncome <= 0) {
    return 0;
  }

  if (deductibleExpenses <= 0) {
    return 0;
  }

  if (accountType === AccountType.Company) {
    // For companies: Use Company Income Tax (CIT) - flat 30% rate
    // No personal exemption for companies
    const taxOnOriginalIncome = calculateCorporateIncomeTax(annualIncome, taxYear);
    const taxableIncomeAfterDeductions = Math.max(0, annualIncome - deductibleExpenses);
    const taxAfterDeductions = calculateCorporateIncomeTax(taxableIncomeAfterDeductions, taxYear);
    
    const taxSavings = taxOnOriginalIncome - taxAfterDeductions;
    return Math.round(taxSavings * 100) / 100;
  }

  // For individuals: Use PAYE (Personal Income Tax)
  // Convert annual income to monthly for PAYE calculation (PAYE expects monthly)
  const monthlyIncome = annualIncome / 12;
  const monthlyDeductibleExpenses = deductibleExpenses / 12;

  // Calculate tax on original income
  const taxOnOriginalIncome = calculatePAYE(monthlyIncome, taxYear);

  // Calculate tax on income after deducting expenses
  const taxableIncomeAfterDeductions = Math.max(0, monthlyIncome - monthlyDeductibleExpenses);
  const taxAfterDeductions = calculatePAYE(taxableIncomeAfterDeductions, taxYear);

  // Tax savings = difference
  const monthlyTaxSavings = taxOnOriginalIncome - taxAfterDeductions;
  const annualTaxSavings = monthlyTaxSavings * 12;

  return Math.round(annualTaxSavings * 100) / 100;
}

/**
 * Calculate final tax liability after applying WHT credits
 * Reference: NRS - Federal Inland Revenue Service (https://www.firs.gov.ng/)
 * 
 * WHT deducted from payments serves as an advance payment of income tax and
 * can be used as a tax credit to offset final PIT (for individuals) or CIT (for companies).
 * 
 * @param taxLiability - Calculated tax liability before WHT credits
 * @param whtCredits - Total WHT credits available
 * @returns Final tax liability after WHT credits (rounded to 2 decimal places)
 */
export function calculateTaxAfterWHTCredit(
  taxLiability: number,
  whtCredits: number
): number {
  if (taxLiability <= 0) {
    return 0;
  }

  if (whtCredits <= 0) {
    return Math.round(taxLiability * 100) / 100;
  }

  // WHT credits cannot exceed tax liability (no negative tax)
  const finalTaxLiability = Math.max(0, taxLiability - whtCredits);

  return Math.round(finalTaxLiability * 100) / 100;
}

/**
 * Calculate employee pension contribution (8% of gross salary)
 * Source: Pension Reform Act 2014 (Nigeria)
 * Employee contributes 8%, employer contributes 10%
 */
export function calculatePensionContribution(grossSalary: number): number {
  return Math.round((grossSalary * 0.08) * 100) / 100;
}

/**
 * Calculate employer pension contribution (10% of gross salary)
 * Source: Pension Reform Act 2014 (Nigeria)
 * Employer must contribute 10% in addition to employee's 8%
 */
export function calculateEmployerPensionContribution(grossSalary: number): number {
  return Math.round((grossSalary * 0.10) * 100) / 100;
}

/**
 * Calculate NHF (National Housing Fund) contribution
 * Source: National Housing Fund Act (Nigeria)
 * Rate: 2.5% of gross salary, capped at ₦2,500,000 annual income
 */
export function calculateNHFContribution(grossSalary: number): number {
  const annualIncome = grossSalary * 12;
  if (annualIncome > 2_500_000) {
    const monthlyCap = 2_500_000 / 12;
    return Math.round((monthlyCap * 0.025) * 100) / 100;
  }
  return Math.round((grossSalary * 0.025) * 100) / 100;
}

/**
 * Calculate NHIS (National Health Insurance Scheme) contribution
 * Source: NRS - Federal Inland Revenue Service (https://www.firs.gov.ng/)
 * Rate: 5% of gross salary
 * 
 * IMPORTANT: NHIS is a mandatory statutory deduction for all employees in Nigeria
 */
export function calculateNHISContribution(grossSalary: number): number {
  return Math.round((grossSalary * 0.05) * 100) / 100;
}

/**
 * Calculate Consolidated Relief Allowance (CRA)
 * Source: NRS - Federal Inland Revenue Service (https://www.firs.gov.ng/)
 * 
 * CRA = Higher of:
 *   - ₦200,000 OR 1% of gross income
 *   PLUS
 *   20% of gross income
 * 
 * CRITICAL: CRA has been REPLACED by new tax reliefs effective January 1, 2026
 * per Nigeria Tax Act 2025. This function returns 0 for tax years 2026 and later.
 * 
 * Reference: Fiscal Reforms (https://fiscalreforms.ng/)
 * 
 * @param grossSalary - Monthly gross salary
 * @param taxYear - Tax year (optional, defaults to current year)
 * @returns Monthly CRA amount (rounded to 2 decimal places), or 0 for 2026+
 */
export function calculateCRA(grossSalary: number, taxYear?: number): number {
  const year = taxYear || getTaxYear();
  
  // CRITICAL: CRA replaced by new tax reliefs in 2026
  // Per Nigeria Tax Act 2025, CRA is no longer applicable from 2026
  if (year >= 2026) {
    return 0;
  }
  
  const annualGrossIncome = grossSalary * 12;
  
  // Higher of ₦200,000 or 1% of gross income
  const baseRelief = Math.max(200000, annualGrossIncome * 0.01);
  
  // Plus 20% of gross income
  const additionalRelief = annualGrossIncome * 0.20;
  
  // Total annual CRA
  const annualCRA = baseRelief + additionalRelief;
  
  // Convert to monthly
  const monthlyCRA = annualCRA / 12;
  
  return Math.round(monthlyCRA * 100) / 100;
}

export function calculateDevelopmentLevy(
  assessableProfit: number,
  taxClassification: string,
  taxYear?: number
): number {
  const year = taxYear || getTaxYear();
  
  if (year < 2026) {
    return 0;
  }
  
  if (taxClassification === TaxClassification.SmallCompany) {
    return 0;
  }
  
  // CRITICAL: Use tax year (not current year) to determine Development Levy rate
  // Per Nigeria Tax Act 2025: Rate starts at 4% for 2026, decreasing to 2% by 2030
  // Rate schedule: 2026=4%, 2027=3.5%, 2028=3%, 2029=2.5%, 2030+=2%
  const taxYearForRate = year; // Use the tax year parameter, not current year
  let levyRate = 0.04; // Default for 2026
  
  if (taxYearForRate >= 2030) {
    levyRate = 0.02;
  } else if (taxYearForRate === 2029) {
    levyRate = 0.025;
  } else if (taxYearForRate === 2028) {
    levyRate = 0.03;
  } else if (taxYearForRate === 2027) {
    levyRate = 0.035;
  } else if (taxYearForRate === 2026) {
    levyRate = 0.04;
  }
  
  return Math.round((assessableProfit * levyRate) * 100) / 100;
}

/**
 * Calculate net salary after all deductions
 * Source: NRS - Federal Inland Revenue Service (https://www.firs.gov.ng/)
 * 
 * Net Salary = Gross - Employee Pension - NHF - NHIS - PAYE
 * 
 * Note: Employer pension is NOT deducted from employee's net salary
 */
export function calculateNetSalary(
  grossSalary: number,
  pensionContribution: number,
  nhfContribution: number,
  nhisContribution: number,
  paye: number
): number {
  return Math.round((grossSalary - pensionContribution - nhfContribution - nhisContribution - paye) * 100) / 100;
}

/**
 * Calculate taxable income for PAYE
 * Source: Nigeria Tax Act 2025, Fiscal Reforms (https://fiscalreforms.ng/)
 * Reference: https://www.nipc.gov.ng/wp-content/uploads/2025/07/Nigeria-Tax-Act-2025.pdf
 * 
 * CRITICAL CHANGES FOR 2026+:
 * - CRA (Consolidated Relief Allowance) has been REPLACED - no longer applicable
 * - NHIS is now DEDUCTIBLE (reduces taxable income)
 * 
 * 2024 Formula: Taxable Income = Gross - Pension - NHF - CRA
 * 2026+ Formula: Taxable Income = Gross - Pension - NHF - NHIS
 * 
 * @param grossSalary - Monthly gross salary
 * @param pensionContribution - Employee pension contribution (8%)
 * @param nhfContribution - NHF contribution (2.5%)
 * @param nhisContribution - NHIS contribution (5%) - NOW DEDUCTIBLE for 2026+
 * @param taxYear - Tax year (determines if CRA applies and if NHIS is deductible)
 * @param rentPaid - Annual rent paid (for 2026+ Rent Relief)
 * @returns Monthly taxable income (rounded to 2 decimal places)
 */
export function calculateTaxableIncome(
  grossSalary: number,
  pensionContribution: number,
  nhfContribution: number,
  nhisContribution: number,
  taxYear?: number,
  rentPaid: number = 0
): number {
  const year = taxYear || getTaxYear();
  
  if (year >= 2026) {
    // 2026+ Formula: CRA removed, NHIS now deductible, Rent Relief added
    // Rent Relief = min(20% of Rent, 500,000)
    // Taxable income = Gross - Pension - NHF - NHIS - RentRelief
    const rentRelief = calculateRentRelief(rentPaid);
    const taxableIncome = grossSalary - pensionContribution - nhfContribution - nhisContribution - rentRelief;
    return Math.round(Math.max(0, taxableIncome) * 100) / 100;
  } else {
    // 2024 Formula: CRA applies, NHIS NOT deductible
    // Taxable income = Gross - Pension - NHF - CRA
    const cra = calculateCRA(grossSalary, year);
    const taxableIncome = grossSalary - pensionContribution - nhfContribution - cra;
    return Math.round(Math.max(0, taxableIncome) * 100) / 100;
  }
}

/**
 * Calculate Rent Relief (New for 2026)
 * Source: Nigeria Tax Act 2025
 * Rule: Lower of ₦500,000 or 20% of annual rent paid
 */
export function calculateRentRelief(annualRentPaid: number): number {
  if (!annualRentPaid || annualRentPaid <= 0) return 0;
  const relief = annualRentPaid * 0.20;
  return Math.min(relief, 500_000);
}

/**
 * VAT Exemption Categories per NRS 2026 Tax Reforms
 * Source: NRS - Federal Inland Revenue Service (https://www.firs.gov.ng/)
 * 
 * Essential goods/services that are VAT-exempt from 2026 onwards.
 */
export enum VATExemptionCategory {
  Food = "food",
  Healthcare = "healthcare",
  Education = "education",
  Housing = "housing",
  Transportation = "transportation",
}

/**
 * Check if a category is VAT-exempt per NRS regulations
 * Source: NRS - Federal Inland Revenue Service (https://www.firs.gov.ng/)
 */
export function isVATExempt(category: string, taxYear?: number): boolean {
  const year = taxYear || getTaxYear();
  
  // VAT exemptions for essential goods only apply from 2026 onwards per NRS
  if (year < 2026) {
    return false;
  }
  
  const exemptCategories = [
    VATExemptionCategory.Food,
    VATExemptionCategory.Healthcare,
    VATExemptionCategory.Education,
    VATExemptionCategory.Housing,
    VATExemptionCategory.Transportation,
  ];
  
  return exemptCategories.includes(category.toLowerCase() as VATExemptionCategory);
}

/**
 * Calculate VAT (Value Added Tax)
 * Source: NRS - Federal Inland Revenue Service (https://www.firs.gov.ng/)
 * 
 * Standard VAT rate: 7.5% (as per NRS regulations)
 * Essential goods/services are VAT-exempt from 2026 onwards.
 * 
 * @param amount - Amount before VAT
 * @param vatRate - VAT rate (default 7.5% per NRS - see NRS_VAT_RATE constant)
 * @param category - Category of goods/service (for exemption check)
 * @param taxYear - Tax year for calculation
 * @returns VAT amount (rounded to 2 decimal places)
 */
export function calculateVAT(
  amount: number,
  vatRate: number = NRS_VAT_RATE, // Default uses NRS (Nigeria Revenue Service) standard VAT rate
  category?: string,
  taxYear?: number
): number {
  const year = taxYear || getTaxYear();
  
  // Apply VAT exemptions per NRS (Nigeria Revenue Service) 2026 Tax Reforms
  if (year >= 2026 && category && isVATExempt(category, year)) {
    return 0;
  }
  
  return Math.round((amount * (vatRate / 100)) * 100) / 100;
}

export function calculateTotalWithVAT(
  amount: number,
  vatRate: number = NRS_VAT_RATE,
  category?: string,
  taxYear?: number
): number {
  return Math.round((amount + calculateVAT(amount, vatRate, category, taxYear)) * 100) / 100;
}

/**
 * WHT (Withholding Tax) Types per NRS (Nigeria Revenue Service) Regulations
 * Reference: NRS (Nigeria Revenue Service) (https://www.nrs.gov.ng/)
 * 
 * CRITICAL: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 * This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 */
export enum WHTType {
  ProfessionalServices = "professional_services", // Legal, accounting, consultancy - 5% (Resident) / 10% (Non-Resident)
  TechnicalServices = "technical_services", // Technical/engineering - 5% (Resident) / 10% (Non-Resident)
  ManagementServices = "management_services", // Management/consulting - 5% (Resident) / 10% (Non-Resident)
  OtherServices = "other_services", // Other services - 2% (Resident) / 10% (Non-Resident)
  Dividends = "dividends", // Dividends - 10%
  Interest = "interest", // Interest - 10%
  Royalties = "royalties", // Royalties - 10%
  Rent = "rent", // Rent - 10%
  Commission = "commission", // Commissions - 5% (Resident) / 10% (Non-Resident)
  Construction = "construction", // Construction - 2% (Resident) / 5% (Non-Resident)
  DirectorsFees = "directors_fees", // Directors Fees - 15% (Resident) / 20% (Non-Resident)
}

/**
 * WHT Rates per NRS (Nigeria Revenue Service) Regulations
 * Reference: NRS (Nigeria Revenue Service) - formerly NRS (https://www.firs.gov.ng/)
 * 
 * CRITICAL: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 * This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 * 
 * IMPORTANT: Rates vary based on:
 * - Type of payment
 * - Recipient type (Individual vs Company) - CRITICAL DISTINCTION
 * - Residence status (Resident vs Non-Resident)
 * - Small company exemptions (turnover ≤ ₦50M)
 * 
 * Always verify current rates at: https://www.nrs.gov.ng/
 */
const WHT_RATES: Record<WHTType, { 
  company: { resident: number; nonResident: number }; 
  individual: { resident: number; nonResident: number };
}> = {
  [WHTType.ProfessionalServices]: { 
    company: { resident: 5, nonResident: 10 }, 
    individual: { resident: 5, nonResident: 10 } 
  },
  [WHTType.TechnicalServices]: { 
    company: { resident: 5, nonResident: 10 }, 
    individual: { resident: 5, nonResident: 10 } 
  },
  [WHTType.ManagementServices]: { 
    company: { resident: 5, nonResident: 10 }, 
    individual: { resident: 5, nonResident: 10 } 
  },
  [WHTType.OtherServices]: { 
    company: { resident: 2, nonResident: 10 }, 
    individual: { resident: 2, nonResident: 10 } 
  },
  [WHTType.Dividends]: { 
    company: { resident: 10, nonResident: 10 }, 
    individual: { resident: 10, nonResident: 10 } 
  },
  [WHTType.Interest]: { 
    company: { resident: 10, nonResident: 10 }, 
    individual: { resident: 10, nonResident: 10 } 
  },
  [WHTType.Royalties]: { 
    company: { resident: 10, nonResident: 10 }, 
    individual: { resident: 10, nonResident: 10 } 
  },
  [WHTType.Rent]: { 
    company: { resident: 10, nonResident: 10 }, 
    individual: { resident: 10, nonResident: 10 } 
  },
  [WHTType.Commission]: { 
    company: { resident: 5, nonResident: 10 }, 
    individual: { resident: 5, nonResident: 10 } 
  },
  [WHTType.Construction]: { 
    company: { resident: 2, nonResident: 5 }, 
    individual: { resident: 2, nonResident: 5 }
  },
  [WHTType.DirectorsFees]: {
    company: { resident: 15, nonResident: 20 }, // N/A for companies usually, but defined for safety
    individual: { resident: 15, nonResident: 20 }
  },
};

/**
 * Calculate WHT (Withholding Tax) per NRS (Nigeria Revenue Service) Regulations
 * Reference: NRS (Nigeria Revenue Service) - formerly NRS (https://www.firs.gov.ng/)
 * 
 * CRITICAL: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 * This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 * 
 * WHT is deducted at source from qualifying payments and must be remitted to NRS (Nigeria Revenue Service)
 * by the 21st day of the following month.
 * 
 * WHT serves as an advance payment of income tax and can be used as a tax credit
 * to offset final PIT (for individuals) or CIT (for companies).
 * 
 * Small Company Exemption (2026+):
 * - Small Companies with annual turnover ≤ ₦25M may be exempt from WHT on services
 * - This applies to Companies (CITA), NOT typically to Sole Proprietors (PITA)
 * - Exemption does NOT apply to dividends, interest, royalties, rent
 * - Always verify current NRS (Nigeria Revenue Service) regulations for exact exemption criteria
 * 
 * @param amount - Payment amount before WHT
 * @param whtType - Type of payment (determines WHT rate)
 * @param taxYear - Tax year for calculation (affects exemptions)
 * @param isSmallCompany - Whether payer is a small company (turnover ≤ ₦25M)
 * @param isServicePayment - Whether payment is for services (affects exemption)
 * @param isNonResident - Whether payee is non-resident (default false)
 * @param payeeType - Type of payee (Company or Individual) - determines rate
 * @returns WHT amount (rounded to 2 decimal places)
 */
export function calculateWHT(
  amount: number,
  whtType: WHTType,
  taxYear?: number,
  isSupplierSmallCompany: boolean = false, // UPDATED: Clarified this refers to the SUPPLIER's status
  isServicePayment: boolean = false,
  isNonResident: boolean = false,
  payeeType: AccountType = AccountType.Company // Default to Company (higher rate safety)
): number {
  if (amount <= 0) {
    return 0;
  }

  const year = taxYear || getTaxYear();

  // Small Company Exemption (2026+ regulations)
  // WHT Exemption Threshold is ₦25M (Deduction of Tax at Source Regulations 2024)
  // This is DISTINCT from the 25M VAT and 50M CIT thresholds.
  // Reference: Nigeria Tax Act 2025 / WHT Regulations
  // NOTE: This applies to Incorporated Companies (CITA).
  // Exemption does NOT apply to dividends, interest, royalties, rent
  
  // CRITICAL: Threshold check (25M) must be done by caller before passing isSupplierSmallCompany flag
  // const NRS_WHT_THRESHOLD = 25_000_000; // Moved to caller logic (service.ts) to avoid redundancy 
  // We don't have company turnover here directly, but we rely on the isSupplierSmallCompany flag passed in.
  // HOWEVER, isSupplierSmallCompany is usually based on CIT (50M).
  // Ideally, valid exemption requires checking turnover against 25M.
  // For safety in this calculation (if turnover unknown), we assume provided isSupplierSmallCompany reflects WHT eligibility,
  // BUT in service.ts we must strictly check against 25M before setting the flag.
  // Just in case, let's allow the caller to handle strict turnover checks.
  
  if (year >= 2026 && isSupplierSmallCompany && isServicePayment) {
    const serviceWHTTypes = [
      WHTType.ProfessionalServices,
      WHTType.TechnicalServices,
      WHTType.ManagementServices,
      WHTType.OtherServices,
      WHTType.Commission,
      WHTType.Construction,
    ];

    if (serviceWHTTypes.includes(whtType)) {
      // Exempt from WHT on services (per 2026 NRS (Nigeria Revenue Service) regulations)
      // Note: Always verify current NRS (Nigeria Revenue Service) regulations for exact exemption criteria
      return 0;
    }
  }

  // Get WHT rate for the payment type and payee type
  const typeRates = WHT_RATES[whtType] || WHT_RATES[WHTType.OtherServices];
  
  // Determine if payee is Company or Individual (default to Company if unknown for safety)
  // Note: Business accounts (Sole Props) are treated as Individuals for WHT rate purposes
  const isIndividual = payeeType === AccountType.Individual || payeeType === AccountType.Business;
  const rates = isIndividual ? typeRates.individual : typeRates.company;
  
  const whtRate = isNonResident ? rates.nonResident : rates.resident;

  // Calculate WHT
  const whtAmount = amount * (whtRate / 100);

  return Math.round(whtAmount * 100) / 100;
}

/**
 * Calculate net payment amount after WHT deduction
 * 
 * @param grossAmount - Payment amount before WHT
 * @param whtType - Type of payment
 * @param taxYear - Tax year
 * @param isSmallCompany - Whether payer is small company
 * @param isServicePayment - Whether payment is for services
 * @param isNonResident - Whether payee is non-resident
 * @param payeeType - Type of payee (Company or Individual)
 * @returns Net payment amount after WHT (rounded to 2 decimal places)
 */
export function calculateNetAfterWHT(
  grossAmount: number,
  whtType: WHTType,
  taxYear?: number,
  isSmallCompany: boolean = false,
  isServicePayment: boolean = false,
  isNonResident: boolean = false,
  payeeType: AccountType = AccountType.Company
): number {
  const whtAmount = calculateWHT(
    grossAmount, 
    whtType, 
    taxYear, 
    isSmallCompany, 
    isServicePayment, 
    isNonResident,
    payeeType
  );
  const netAmount = grossAmount - whtAmount;
  return Math.round(netAmount * 100) / 100;
}

/**
 * Get WHT rate for a specific payment type and payee
 * 
 * @param whtType - Type of payment
 * @param isNonResident - Whether payee is non-resident (default false)
 * @param payeeType - Type of payee (Company or Individual)
 * @returns WHT rate as percentage
 */
export function getWHTRate(
  whtType: WHTType, 
  isNonResident: boolean = false,
  payeeType: AccountType = AccountType.Company
): number {
  const typeRates = WHT_RATES[whtType] || WHT_RATES[WHTType.OtherServices];
  
  // Note: Business accounts (Sole Props) are treated as Individuals for WHT rate purposes
  const isIndividual = payeeType === AccountType.Individual || payeeType === AccountType.Business;
  const rates = isIndividual ? typeRates.individual : typeRates.company;
  
  return isNonResident ? rates.nonResident : rates.resident;
}

/**
 * Calculate Industrial Training Fund (ITF) Loop
 * Rate: 1% of Annual Payroll
 * Threshold: Turnover >= 50M OR Employees >= 5
 */
export function calculateITF(
  totalPayroll: number,
  annualTurnover: number,
  totalEmployees: number
): number {
  // ITF Threshold: Turnover >= 50M OR Employees >= 5
  if (annualTurnover >= NRS_ITF_TURNOVER_THRESHOLD || totalEmployees >= NRS_ITF_EMPLOYEE_THRESHOLD) {
    return totalPayroll * 0.01;
  }
  return 0;
}
