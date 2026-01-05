/**
 * Tax Constants - Shared between Frontend and Backend
 * 
 * CRITICAL: These values must match NRS (Nigeria Revenue Service) regulations effective from 2026.
 * NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
 * 
 * For usage, import from: src/lib/constants/nrs-constants.ts
 * For frontend usage, import from this file: src/lib/constants/tax.ts
 * 
 * Reference: https://www.firs.gov.ng/ (NRS official website)
 * Nigeria Tax Act 2025: https://www.nipc.gov.ng/wp-content/uploads/2025/07/Nigeria-Tax-Act-2025.pdf
 * Last Verified: 2026-01-01 (for 2026 tax laws)
 */

/**
 * Standard VAT (Value Added Tax) Rate per NRS (Nigeria Revenue Service) regulations
 * Standard rate: 7.5% (effective from 2020, unchanged in 2026)
 * Reference: Nigeria Tax Act 2025, effective from 2026
 */
export const VAT_RATE = 7.5;

/**
 * VAT Rate as decimal (0.075) for calculations
 */
export const VAT_RATE_DECIMAL = VAT_RATE / 100;

export interface TaxBracket {
    min: number;
    max: number;
    rate: number;
    label?: string;
}

/**
 * Annual Personal Income Tax (PIT) Brackets for 2026+
 * Source: Nigeria Tax Act 2025 (effective January 1, 2026)
 * 
 * CRITICAL: The first ₦800,000 is tax-free (0% rate).
 */
export const PAYE_TAX_BRACKETS_2026_ANNUAL: TaxBracket[] = [
    { min: 0, max: 800000, rate: 0, label: "First ₦800,000" },           // First ₦800,000: 0% (full exemption)
    { min: 800000, max: 3000000, rate: 15, label: "Next ₦2,200,000" },   // Next ₦2,200,000: 15%
    { min: 3000000, max: 12000000, rate: 18, label: "Next ₦9,000,000" }, // Next ₦9,000,000: 18%
    { min: 12000000, max: 25000000, rate: 21, label: "Next ₦13,000,000" }, // Next ₦13,000,000: 21%
    { min: 25000000, max: 50000000, rate: 23, label: "Next ₦25,000,000" }, // Next ₦25,000,000: 23%
    { min: 50000000, max: Infinity, rate: 25, label: "Above ₦50,000,000" }, // Above ₦50,000,000: 25%
];
