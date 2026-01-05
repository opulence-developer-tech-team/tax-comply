# VAT Remittance Implementation - Required Changes

## Critical Finding

**VAT remittance tracking is completely missing** despite being legally required for both Company and Business accounts under Nigeria Tax Act 2025.

## Legal Requirement Summary

| Tax | Who Must Remit | Frequency | Current Status |
|-----|----------------|-----------|----------------|
| VAT | Companies AND Businesses | Monthly/Quarterly | ❌ **MISSING** |

## Required Implementation

### 1. Database Schema (src/lib/server/vat/remittance-entity.ts)
Create VAT remittance entity following CIT remittance pattern, but:
- Track by **month/year** (not tax year like CIT)
- Support both Company and Business accounts
- Store remittance details (amount, date, reference, receipt, status)

### 2. Service Layer (src/lib/server/vat/remittance-service.ts)
- Create VAT remittance records
- Update VAT remittance records
- Delete VAT remittance records
- Fetch remittances by month/year and entity
- Account type aware (Company vs Business)

### 3. API Routes (src/app/api/v1/vat/remittance/route.ts)
- GET: Fetch remittances (accept companyId OR businessId)
- POST: Create remittance
- PUT: Update remittance
- DELETE: Delete remittance
- Validate account type (Company OR Business, not Individual)

### 4. Component (src/components/dashboard/vat/VATRemittanceTracker.tsx)
- Display remittances for selected month/year
- Add/edit/delete remittance records
- Show remittance status and deadlines
- Similar to CITRemittanceTracker but month/year based

### 5. Integration (src/components/dashboard/vat/VATContent.tsx)
- Add VATRemittanceTracker component
- Pass entityId, accountType, month, year
- Fetch remittances when month/year changes

### 6. Redux State (src/store/redux/vat/vat-slice.ts)
- Add remittances array to VAT state
- Add actions for setting remittances
- Update VAT summary to include remitted amounts

## Implementation Priority

**HIGH** - This is a legal compliance requirement.

## Estimated Implementation Complexity

- Database schema: 1 hour
- Service layer: 2 hours  
- API routes: 2 hours
- Component: 3 hours
- Integration: 1 hour
- Testing: 2 hours

**Total: ~11 hours**

## Notes

1. VAT remittances are monthly/quarterly, unlike CIT which is annual
2. Both Company and Business accounts must remit VAT
3. VAT summary should track remitted vs pending amounts
4. Remittance deadline is 21st of following month


