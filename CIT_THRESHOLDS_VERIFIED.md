# CIT Classification Thresholds - Verification Complete

## Verification Date: December 30, 2025

### ✅ Thresholds Verified Against Nigeria Tax Act 2025

**Source:** Corporate Tax Changes (Effective April 1, 2026), Nigeria Tax Act 2025

### Tax Classification Criteria (2026+)

#### Small Company
- **Turnover:** Annual turnover of ₦100 million or less (<= ₦100,000,000)
- **Fixed Assets:** Total fixed assets not exceeding ₦250 million (<= ₦250,000,000)
- **CIT Rate:** 0% (exempt)

#### Medium Company  
- **Turnover:** Annual turnover of ₦100 million or less (<= ₦100,000,000)
- **Fixed Assets:** Total fixed assets exceeding ₦250 million (> ₦250,000,000)
- **CIT Rate:** 20%

#### Large Company
- **Turnover:** Annual turnover exceeding ₦100 million (> ₦100,000,000)
- **CIT Rate:** 30%

### Pre-2026 Thresholds (for reference)

#### Small Company
- **Turnover:** Less than ₦25 million (< ₦25,000,000)

#### Medium Company
- **Turnover:** ₦25 million or more but less than ₦100 million (>= ₦25,000,000 AND < ₦100,000,000)

#### Large Company
- **Turnover:** ₦100 million or more (>= ₦100,000,000)

---

## Implementation Status

### ✅ Verified and Updated
- Classification logic correctly implements 2026+ thresholds
- Fixed assets threshold corrected from `< ₦250M` to `<= ₦250M` for Small Company
- Code comments updated with verification status and source references

### Files Updated
1. `src/lib/server/company/service.ts` - Classification function updated with verified thresholds
2. `src/lib/server/cit/calculation.ts` - CIT rate mapping documentation enhanced

---

## Compliance Status: ✅ FULLY COMPLIANT

All classification thresholds now match Nigeria Tax Act 2025 specifications for tax years 2026 and onward.



