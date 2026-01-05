export enum MessageResponse {
  Error = "error",
  Success = "success",
  VerifyEmail = "verify_email"
}

export enum UserRole {
  Owner = "owner",
  Accountant = "accountant",
  Staff = "staff"
}

export enum SubscriptionPlan {
  Free = "free",
  Starter = "starter",
  Standard = "standard",
  Premium = "premium"
}

export enum TaxClassification {
  SmallCompany = "small_company", 
  Medium = "medium",
  Large = "large"
}

export enum InvoiceStatus {
  Pending = "pending",    // Invoice created, payment pending
  Paid = "paid",          // Payment received - ONLY this status counts in financial totals
  Cancelled = "cancelled" // Invoice cancelled, no payment expected
}

export enum ComplianceStatus {
  Compliant = "compliant",
  AtRisk = "at_risk",
  NonCompliant = "non_compliant"
}

export enum PaymentStatus {
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled"
}

export enum PaymentMethod {
  Monnify = "monnify",
  Paystack = "paystack",
  BankTransfer = "bank_transfer"
}

export enum SubscriptionStatus {
  Active = "active",
  Cancelled = "cancelled",
  Expired = "expired",
  Trial = "trial"
}

export enum BillingCycle {
  Monthly = "monthly",
  Yearly = "yearly"
}

export enum AccountType {
  Company = "company",
  Individual = "individual",
  Business = "business"
}

export enum RemittanceStatus {
  Pending = "pending",
  Remitted = "remitted",
  Overdue = "overdue",
  Compliant = "compliant"
}

export enum FilingStatus {
  NotFiled = "not_filed",
  Filed = "filed",
  Overdue = "overdue"
}

export enum ExemptionReason {
  Threshold = "threshold",
  NoIncome = "no_income",
  DeductionsOnly = "deductions_only"
}

export enum TransactionType {
  Invoice = "invoice",
  Expense = "expense",
  Manual = "manual"
}

export enum WHTCreditStatus {
  Available = "available",
  Applied = "applied",
  CarriedForward = "carried_forward"
}

export enum PITRemittanceStatus {
  Pending = "pending",
  Remitted = "remitted",
  Verified = "verified"
}

export enum PITEmploymentSource {
  Payslip = "payslip",
  EmployerStatement = "employer_statement",
  Manual = "manual",
  Other = "other"
}

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE"
}

export enum ExpenseCategory {
  Rent = "rent",
  Salaries = "salaries",
  Utilities = "utilities",
  OfficeSupplies = "office_supplies",
  ProfessionalServices = "professional_services",
  Marketing = "marketing",
  Travel = "travel",
  Insurance = "insurance",
  Maintenance = "maintenance",
  Software = "software",
  Others = "others"
}





















