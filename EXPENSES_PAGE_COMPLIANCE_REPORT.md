# Expenses Page - Compliance Report
## Review Date: December 30, 2025

### Executive Summary

**Compliance Status:** ✅ **MOSTLY COMPLIANT** (with minor informational display issue)

After comprehensive review of the expenses page (`expenses/page.tsx`) against the Nigeria Tax Act 2025 policy document, the implementation is **mostly compliant**. The page is a data management interface that correctly handles expense CRUD operations and invalidates tax caches appropriately. However, there is a minor issue with tax savings estimates that display simplified rates without proper disclaimers.

---

## Compliance Verification

### ✅ 1. CIT Rate Classification Logic - **COMPLIANT** (N/A)

**Status:** N/A - Page does not perform CIT rate classification

The expenses page is a data management interface for expenses. It does not calculate or classify companies for CIT purposes. CIT classification is handled server-side when calculating CIT summaries.

---

### ✅ 2. Taxable Profit vs Turnover Usage - **COMPLIANT** (N/A)

**Status:** N/A - Page does not calculate taxable profit

The expenses page manages expense data only. It does not calculate company tax or taxable profit. Taxable profit calculations are handled server-side in CIT calculation services.

---

### ✅ 3. VAT Handling - **COMPLIANT**

**Status:** ✅ **COMPLIANT**

**Implementation:**
- Expenses page correctly tracks VAT separately from expense amounts
- VAT is not included in expense amounts used for tax calculations
- `ExpenseFormModal` calculates VAT for display purposes (7.5% for companies) but this is informational only
- Server-side logic correctly excludes VAT from CIT and PIT calculations

**Code Verified:**
- `expenses/page.tsx`: No VAT calculations - just expense management
- `ExpenseFormModal.tsx:165-176`: VAT calculation is for display/estimate only, doesn't affect tax calculations
- Server-side: Expenses exclude VAT from tax calculations (verified in previous reviews)

---

### ✅ 4. WHT Treatment and Offsets - **COMPLIANT** (N/A)

**Status:** N/A - Page does not handle WHT offsets

The expenses page manages expense data only. WHT handling is managed separately (in WHT pages) and is applied to tax calculations server-side.

---

### ✅ 5. Client vs Server Calculation Responsibilities - **COMPLIANT**

**Status:** ✅ **COMPLIANT** (with minor informational display issue)

**Server-Side Calculations (All Tax Logic):**
- PIT calculation: `src/lib/server/pit/service.ts:updatePITSummary()`
- CIT calculation: `src/lib/server/cit/calculation.ts:calculateCITSummary()`
- Expense summaries: `src/lib/server/expense/service.ts:getExpenseSummary()`

**Client-Side (Display Only):**
- `expenses/page.tsx`: Manages expense data (CRUD operations)
- `ExpenseFormModal`: Contains `calculateTax()` function that estimates VAT (7.5%) or tax savings (20% for individuals) - **informational display only**
- `TaxCalculationPreview`: Shows estimated tax savings using simplified rates - **informational display only**

**No Client-Side Tax Calculations:**
- ✅ No actual tax rate calculations on client
- ✅ No exemption calculations on client
- ✅ No WHT offset calculations on client
- ✅ No filing deadline calculations on client

**⚠️ Minor Issue - Tax Savings Estimates:**
- `TaxCalculationPreview.tsx:29-30` uses simplified rates:
  - Companies: 30% (assumes Large company - doesn't account for Small/Medium classifications)
  - Individuals: 20% flat rate (doesn't account for progressive brackets)
- These are clearly marked as "estimates" with disclaimers, but the rates could be more accurate
- **Impact:** Low - These are informational displays only and don't affect actual tax calculations

---

## Detailed Compliance Checks

### ✅ Tax-Deductible Expense Handling

**Status:** ✅ **COMPLIANT**

**Implementation:**
- Expenses page correctly identifies tax-deductible expenses (`isTaxDeductible` flag)
- When deleting expenses, page checks if expense is tax-deductible
- Correctly invalidates PIT cache for individual tax-deductible expenses
- Correctly invalidates CIT cache for company tax-deductible expenses

**Code Verified:**
- `expenses/page.tsx:447-507` - Correctly checks `isTaxDeductible` and invalidates appropriate caches
- Server-side: Only tax-deductible expenses are included in tax calculations (verified in previous reviews)

---

### ✅ PIT/CIT Cache Invalidation Logic

**Status:** ✅ **COMPLIANT**

**Implementation:**
- When tax-deductible expenses are deleted, appropriate tax caches are invalidated
- Individual expenses invalidate PIT cache (`pitActions.invalidateCache()`)
- Company expenses invalidate CIT cache (`citActions.invalidateCache()`)
- Only tax-deductible expenses trigger cache invalidation (non-deductible expenses don't affect taxes)

**Code Verified:**
- `expenses/page.tsx:457-507` - Correctly invalidates PIT/CIT caches based on expense type and tax-deductibility
- Matches server-side logic: Only tax-deductible expenses affect tax calculations

---

### ✅ Tax Year Validation (2026 Minimum)

**Status:** ✅ **COMPLIANT**

**Implementation:**
- Minimum tax year enforced as 2026 (`expenses/page.tsx:248`)
- Export function validates tax year (lines 273-278)
- Clear filters defaults to 2026 minimum (line 408)

**Code Verified:**
- `expenses/page.tsx:247-248` - `minTaxYear = 2026`
- `expenses/page.tsx:273-278` - Export validates year >= 2026
- `expenses/page.tsx:408` - Default year uses `Math.max(2026, currentYear)`

---

## Issues Found

### ⚠️ Issue 1: Tax Savings Estimate Uses Simplified Rates - **INFORMATIONAL DISPLAY**

**Location:** `src/components/dashboard/expenses/TaxCalculationPreview.tsx:29-30`

**Current Implementation:**
```typescript
const estimatedTaxRate = accountType === AccountType.Company ? 30 : 20; // CIT is 30%, PIT varies but ~20% average
const estimatedTaxSavings = (amount * estimatedTaxRate) / 100;
```

**Issue:**
- For companies: Uses flat 30% rate, which assumes Large company classification. Does not account for:
  - Small Company: 0% CIT rate
  - Medium Company: 20% CIT rate
  - Large Company: 30% CIT rate
- For individuals: Uses flat 20% rate, which doesn't account for progressive brackets (0% to 25%)

**Impact:**
- **Low** - This is clearly marked as an "estimate" with disclaimers that actual savings may vary
- Does not affect actual tax calculations (all done server-side)
- Provides users with rough estimates, but could be misleading for Small companies (0% rate)

**Recommendation:**
- Keep as is (acceptable for informational estimates) OR
- Enhance to show range or note that rate depends on company classification/income level
- Add clearer disclaimer that actual rate depends on company classification for companies

**Status:** ⚠️ **ACCEPTABLE** (informational display only, doesn't affect calculations)

---

## Code Flow Verification

### Expense Management Flow (End-to-End)

1. **Input:**
   - User creates/edits/deletes expenses
   - User marks expenses as tax-deductible or not
   - Expenses include amount, category, date, etc.

2. **Client-Side Processing:**
   - `expenses/page.tsx` handles CRUD operations
   - When deleting tax-deductible expense:
     - Checks if expense is tax-deductible
     - Invalidates PIT cache (if individual) or CIT cache (if company)
   - Calculates display statistics (total, totalAmount, taxDeductibleAmount)

3. **Server-Side Calculation:**
   - Expense service stores expense data
   - PIT/CIT services fetch tax-deductible expenses when calculating summaries
   - Only tax-deductible expenses affect tax calculations

4. **Output:**
   - Expenses displayed to user
   - Tax caches invalidated, triggering refetch of updated tax summaries

---

## Final Compliance Status

### ✅ **MOSTLY COMPLIANT**

The expenses page is **mostly compliant** with Nigeria Tax Act 2025:

- ✅ All tax calculations performed server-side
- ✅ Tax-deductible expenses correctly identified and handled
- ✅ PIT/CIT caches correctly invalidated when expenses change
- ✅ Tax year validation correctly enforces 2026 minimum
- ✅ VAT correctly excluded from tax calculations
- ⚠️ Tax savings estimates use simplified rates (acceptable for informational displays)

**Recommendation:** ✅ **APPROVED FOR PRODUCTION** (with optional enhancement for tax savings estimates)

The page is production-ready. The tax savings estimate issue is minor and acceptable for informational displays, but could be enhanced for better accuracy.

---

## Summary

| Component | Status | Details |
|-----------|--------|---------|
| CIT Rate Classification | N/A | Page does not perform CIT classification |
| Taxable Profit vs Turnover | N/A | Page does not calculate taxable profit |
| VAT Handling | ✅ COMPLIANT | VAT correctly excluded from calculations |
| WHT Treatment and Offsets | N/A | Page does not handle WHT |
| Client vs Server Separation | ✅ COMPLIANT | All calculations server-side |
| Tax-Deductible Expense Handling | ✅ COMPLIANT | Correctly identifies and handles tax-deductible expenses |
| PIT/CIT Cache Invalidation | ✅ COMPLIANT | Correctly invalidates caches when expenses change |
| Tax Year Validation | ✅ COMPLIANT | Correctly enforces 2026 minimum |
| Tax Savings Estimates | ⚠️ ACCEPTABLE | Uses simplified rates (informational display only) |

**Overall Status:** ✅ **MOSTLY COMPLIANT** (minor informational display issue)



