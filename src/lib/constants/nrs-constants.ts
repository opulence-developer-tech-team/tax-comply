/**
 * NRS (Nigeria Revenue Service) Tax Constants
 * Reference: https://www.nrs.gov.ng/
 * 
 * IMPORTANT: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 * These constants should be verified against the official NRS website
 * and updated whenever NRS announces changes to tax regulations.
 * 
 * Last Verified: 2026-01-01
 * 
 * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
 */

/**
 * Standard VAT (Value Added Tax) Rate
 * Source: NRS (Nigeria Revenue Service) - formerly NRS
 * Standard rate: 7.5% (effective from 2020)
 */
export const NRS_VAT_RATE = 7.5;

/**
 * VAT (Value Added Tax) Turnover Threshold
 * Threshold: ₦25,000,000 (Twenty-Five Million Naira)
 * Reference: Nigeria Tax Act 2025 / VAT Act
 * CRITICAL: Despite the CIT "Small Company" threshold being ₦50M,
 * the verified VAT registration threshold remains at ₦25M.
 * Do NOT increase this to 50M unless explicitly mandated by future amendments.
 */
export const NRS_VAT_TURNOVER_THRESHOLD_2026 = 25_000_000;

/**
 * CIT (Company Income Tax) Small Company Threshold
 * Companies with turnover below this are taxed at 0%
 * Threshold: ₦50,000,000 (Fifty Million Naira)
 * Reference: Nigeria Tax Act 2025 (CIT Section)
 */
export const NRS_CIT_SMALL_COMPANY_THRESHOLD_2026 = 50_000_000;

/**
 * WHT (Withholding Tax) Exemption Threshold
 * Small businesses with turnover below this are exempt from suffering WHT deductions
 * Threshold: ₦25,000,000 (Twenty-Five Million Naira)
 * Reference: Deduction of Tax at Source (Withholding) Regulations 2024
 * NOTE: This is DISTINCT from the CIT/VAT 25M threshold.
 */
export const NRS_WHT_EXEMPTION_THRESHOLD_2026 = 25_000_000;

/**
 * VAT Filing Deadlines per NRS Regulations
 * VAT returns must be filed monthly by the 21st day of the following month
 */
export const NRS_VAT_DEADLINE_DAY = 21;

/**
 * PAYE (Pay-As-You-Earn) Remittance Deadlines per NRS Regulations
 * PAYE deductions must be remitted monthly by the 10th day of the following month
 */
export const NRS_PAYE_DEADLINE_DAY = 10;

/**
 * WHT (Withholding Tax) Remittance Deadlines per NRS Regulations
 * WHT deductions must be remitted monthly by the 21st day of the following month
 * Same deadline as VAT returns
 * Reference: NRS Withholding Tax Regulations - https://www.nrs.gov.ng/
 */
export const NRS_WHT_DEADLINE_DAY = 21;

/**
 * Company Income Tax (CIT) Filing Deadline per NRS Regulations
 * CIT returns must be filed annually by June 30th of the following year
 */
export const NRS_CIT_DEADLINE_MONTH = 5; // June (0-indexed: 5 = June)
export const NRS_CIT_DEADLINE_DAY = 30;

/**
 * Company Income Tax Rate per NRS Regulations
 * Standard CIT rate: 30% (flat rate for all companies)
 */
export const NRS_CIT_RATE = 30;

/**
 * Personal Income Tax (PIT) Filing Deadline per NRS Regulations
 * PIT returns (Form A) must be filed annually by March 31st of the following year
 */
export const NRS_PIT_DEADLINE_MONTH = 2; // March (0-indexed: 2 = March)
export const NRS_PIT_DEADLINE_DAY = 31;

/**
 * Compliance Thresholds (Application Logic - NOT NRS Regulations)
 * 
 * These thresholds are internal application logic for compliance alerts.
 * They are NOT official NRS regulations, but rather indicators that may
 * warrant review:
 * 
 * - HIGH_VAT_PAYABLE_THRESHOLD: Trigger alert when net VAT payable exceeds this amount
 *   This is an application logic threshold to flag potentially significant VAT liabilities
 *   for review. It does NOT represent a NRS regulation.
 */
export const COMPLIANCE_HIGH_VAT_PAYABLE_THRESHOLD = 100000; // ₦100,000

/**
 * Compliance Score Thresholds (Application Logic - NOT NRS Regulations)
 * 
 * These score thresholds are internal application logic for compliance status classification.
 * They are NOT official NRS regulations:
 * 
 * - COMPLIANT_SCORE: Score >= 80 indicates good compliance
 * - AT_RISK_SCORE: Score >= 60 but < 80 indicates compliance risks
 * - NON_COMPLIANT_SCORE: Score < 60 indicates compliance issues
 */
export const COMPLIANCE_SCORE_COMPLIANT = 80;
export const COMPLIANCE_SCORE_AT_RISK = 60;

/**
 * ITF (Industrial Training Fund) Thresholds
 * Reference: Industrial Training Fund Amendment Act 2011 / NTA 2025 Harmony
 * Employers are liable if they have:
 * - 5 or more employees OR
 * - Turnover of ₦50M and above
 */
export const NRS_ITF_TURNOVER_THRESHOLD = 50_000_000;
export const NRS_ITF_EMPLOYEE_THRESHOLD = 5;







