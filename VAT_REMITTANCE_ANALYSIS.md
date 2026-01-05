# VAT Remittance Tracking - Legal Analysis & Implementation Plan

## Executive Summary

**CRITICAL FINDING:** VAT remittance tracking is **MISSING** for both Company and Business accounts. This is a legal compliance gap.

## Legal Analysis (Nigeria Tax Act 2025, effective 2026+)

### Tax Remittance Requirements by Account Type

| Tax Type | Company Accounts | Business Accounts (Sole Prop) | Remittance Frequency | Deadline |
|----------|-----------------|-------------------------------|---------------------|----------|
| **CIT** | ✅ **YES** | ❌ NO | Annually | June 30 of following year |
| **PIT** | ❌ NO | ✅ **YES** | Annually | March 31 of following year |
| **WHT** | ✅ **YES** | ✅ **YES** | Monthly | 21st of following month |
| **VAT** | ✅ **YES** | ✅ **YES** | Monthly/Quarterly | 21st of following month |

### Current Implementation Status

1. ✅ **CIT Remittances** - Implemented for Company accounts only (correct)
2. ✅ **PIT Remittances** - Implemented for Business accounts (correct)  
3. ✅ **WHT Remittances** - Implemented for both Company and Business accounts (correct)
4. ❌ **VAT Remittances** - **MISSING** for both Company and Business accounts (CRITICAL GAP)

## Problem Statement

VAT is a transaction tax that must be remitted monthly/quarterly by VAT-registered businesses. Currently:
- VAT summary shows net VAT liability
- VAT remittance tracking is **completely absent**
- Users cannot record VAT payments made to NRS
- No way to track VAT remittance status, deadlines, or compliance

This violates compliance requirements under Nigeria Tax Act 2025.

## Implementation Requirements

### 1. VAT Remittance Entity Schema
- Support both `companyId` (Company accounts) and `businessId` (Business accounts)
- Track remittance by month/year (VAT is monthly/quarterly, not annual like CIT)
- Store remittance amount, date, reference, receipt
- Track remittance status

### 2. VAT Remittance API Routes
- GET `/api/v1/vat/remittance` - Fetch remittances for month/year
- POST `/api/v1/vat/remittance` - Create remittance record
- PUT `/api/v1/vat/remittance` - Update remittance record
- DELETE `/api/v1/vat/remittance` - Delete remittance record
- Validate account type (Company OR Business, not Individual)
- Support both `companyId` and `businessId` query parameters

### 3. VAT Remittance Service Layer
- CRUD operations for VAT remittances
- Account type-aware (Company vs Business)
- Month/year based (not tax year like CIT)

### 4. VAT Remittance Tracker Component
- Similar to `CITRemittanceTracker` but month/year based
- Display remittances for selected month/year
- Add/edit/delete remittance records
- Show remittance status and deadlines

### 5. Integration with VATContent
- Add `VATRemittanceTracker` component to `VATContent`
- Display after VAT summary cards
- Update VAT summary to show remitted vs pending amounts

## Critical Design Decisions

### Entity Design
VAT remittances are **monthly/quarterly**, not annual like CIT:
- CIT: One remittance per tax year
- VAT: Multiple remittances per year (one per month/quarter)

### Account Type Support
VAT remittances must support BOTH:
- Company accounts → `companyId`
- Business accounts → `businessId`

### VAT Summary Integration
VAT summary should track:
- `totalVATRemitted`: Sum of all remittances for the period
- `totalVATPending`: Net VAT - Total Remitted
- `remittanceStatus`: "compliant", "pending", "overdue"

## Next Steps

1. Create VAT remittance entity schema
2. Create VAT remittance service layer
3. Create VAT remittance API routes
4. Create VATRemittanceTracker component
5. Integrate into VATContent
6. Update VAT summary calculation to include remittances


