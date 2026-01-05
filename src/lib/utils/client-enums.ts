/**
 * Client-side Enums
 * 
 * These enums are used in client components and should be kept in sync
 * with any server-side equivalents where applicable.
 */

/**
 * Sort order for data tables
 */
export enum SortOrder {
  Asc = "asc",
  Desc = "desc"
}

/**
 * Invoice sort fields
 */
export enum InvoiceSortField {
  IssueDate = "issueDate",
  Total = "total",
  CustomerName = "customerName",
  InvoiceNumber = "invoiceNumber"
}

/**
 * Expense sort fields
 */
export enum ExpenseSortField {
  Date = "date",
  Amount = "amount",
  Description = "description",
  Category = "category"
}

/**
 * Income sort fields
 */
export enum IncomeSortField {
  TaxYear = "taxYear",
  AnnualIncome = "annualIncome",
  Month = "month"
}

/**
 * Employee sort fields
 */
export enum EmployeeSortField {
  CreatedAt = "createdAt",
  FirstName = "firstName",
  LastName = "lastName",
  EmployeeId = "employeeId",
  Email = "email",
  DateOfEmployment = "dateOfEmployment",
  Salary = "salary",
}

/**
 * Invoice tab types
 */
export enum InvoiceTabType {
  Invoices = "invoices",
  Summary = "summary"
}

/**
 * Expense tab types
 */
export enum ExpenseTabType {
  Expenses = "expenses",
  PDFReports = "pdf-reports"
}

/**
 * Export format for invoices and documents
 */
export enum ExportFormat {
  PDF = "pdf",
  CSV = "csv"
}

/**
 * Modal mode for forms
 */
export enum ModalMode {
  Create = "create",
  Edit = "edit"
}

/**
 * Expense form field names
 */
export enum ExpenseFormField {
  Description = "description",
  Amount = "amount",
  Category = "category",
  Date = "date",
  IsTaxDeductible = "isTaxDeductible"
}

/**
 * Sign-in form field names
 */
export enum SignInFormField {
  Email = "email",
  Password = "password"
}

/**
 * Sign-up form field names
 */
export enum SignUpFormField {
  Email = "email",
  Password = "password",
  FirstName = "firstName",
  LastName = "lastName",
  PhoneNumber = "phoneNumber",
  ConfirmPassword = "confirmPassword",
  AccountType = "accountType",
  ReferralId = "referralId"
}

/**
 * Reset password form field names
 */
export enum ResetPasswordFormField {
  NewPassword = "newPassword",
  ConfirmPassword = "confirmPassword"
}

/**
 * Verify email form field names
 */
export enum VerifyEmailFormField {
  Email = "email",
  Otp = "otp"
}

/**
 * Customer details form field names
 */
export enum CustomerDetailsFormField {
  CustomerName = "customerName",
  CustomerEmail = "customerEmail",
  CustomerPhone = "customerPhone",
  CustomerAddress = "customerAddress",
  CustomerTIN = "customerTIN",
  IssueDate = "issueDate",
  DueDate = "dueDate",
  Notes = "notes"
}

/**
 * Button variant styles
 */
export enum ButtonVariant {
  Primary = "primary",
  Secondary = "secondary",
  Outline = "outline",
  Danger = "danger",
  Ghost = "ghost"
}

/**
 * Button size options
 */
export enum ButtonSize {
  Sm = "sm",
  Md = "md",
  Lg = "lg"
}

/**
 * Alert variant styles
 */
export enum AlertVariant {
  Success = "success",
  Error = "error",
  Warning = "warning",
  Info = "info"
}

/**
 * Modal size options
 */
export enum ModalSize {
  Sm = "sm",
  Md = "md",
  Lg = "lg",
  Xl = "xl"
}

/**
 * Confirm modal variant styles
 */
export enum ConfirmModalVariant {
  Danger = "danger",
  Warning = "warning",
  Info = "info",
  Logout = "logout"
}

/**
 * Loading state size options
 */
export enum LoadingStateSize {
  Xs = "xs",
  Sm = "sm",
  Md = "md",
  Lg = "lg"
}

/**
 * Toast notification types
 */
export enum ToastType {
  Success = "success",
  Error = "error",
  Warning = "warning",
  Info = "info"
}

/**
 * Text alignment options
 */
export enum TextAlign {
  Left = "left",
  Right = "right",
  Center = "center"
}

/**
 * Billing cycle options
 */
export enum BillingCycle {
  Monthly = "monthly",
  Yearly = "yearly"
}

/**
 * PIT employment deduction source types
 */
export enum PITEmploymentSource {
  Payslip = "payslip",
  EmployerStatement = "employer_statement",
  Manual = "manual",
  Other = "other"
}

/**
 * Income type options
 */
export enum IncomeType {
  Annual = "annual",
  Monthly = "monthly"
}

/**
 * Loading spinner theme options
 */
export enum LoadingSpinnerTheme {
  Default = "default",
  Tax = "tax",
  Finance = "finance",
  Corporate = "corporate",
  Income = "income"
}

/**
 * Loading spinner size options
 */
export enum LoadingSpinnerSize {
  Xs = "xs",
  Sm = "sm",
  Md = "md",
  Lg = "lg",
  Xl = "xl"
}

/**
 * Loading spinner variant options
 */
export enum LoadingSpinnerVariant {
  Spinner = "spinner",
  Dots = "dots",
  Pulse = "pulse",
  Bars = "bars"
}

/**
 * Referral earning status
 */
export enum ReferralEarningStatus {
  Pending = "pending",
  Available = "available",
  Withdrawn = "withdrawn",
  Cancelled = "cancelled"
}

/**
 * PIT remittance status
 */
export enum PITRemittanceStatus {
  Pending = "pending",
  Remitted = "remitted",
  Verified = "verified"
}

/**
 * Compliance alert types
 */
export enum ComplianceAlertType {
  MissingInvoice = "missing_invoice",
  VatMismatch = "vat_mismatch",
  PayrollIssue = "payroll_issue",
  TaxDeadline = "tax_deadline",
  MissingTIN = "missing_tin",
  MissingCAC = "missing_cac",
  WhtRemittance = "wht_remittance"
}

/**
 * Tax filing document types
 */
export enum DocumentType {
  VATMonthly = "vat-monthly",
  VATYearly = "vat-yearly",
  PAYE = "paye",
  WHTRemittance = "wht-remittance",
  CIT = "cit",
  PITReturn = "pit-return"
}

/**
 * WHT transaction types
 */
export enum WHTTransactionType {
  Invoice = "invoice",
  Expense = "expense",
  Manual = "manual"
}

/**
 * Flutterwave loader size options
 */
export enum LoaderSize {
  Xs = "xs",
  Sm = "sm",
  Md = "md",
  Lg = "lg"
}

/**
 * Flutterwave loader state options
 */
export enum LoaderState {
  Loading = "loading",
  Success = "success",
  Error = "error"
}

/**
 * Filter value for "all" option
 */
export enum FilterAll {
  All = "all"
}

/**
 * Error state variant types
 */
export enum ErrorVariant {
  Error = "error",
  Warning = "warning",
  Empty = "empty"
}

/**
 * Error state type categories
 */
export enum ErrorType {
  Network = "network",
  Authorization = "authorization",
  Server = "server",
  NotFound = "notFound",
  Empty = "empty",
  Generic = "generic"
}

/**
 * Share prompt position options
 */
export enum SharePromptPosition {
  BottomRight = "bottom-right",
  BottomLeft = "bottom-left",
  TopRight = "top-right",
  TopLeft = "top-left"
}


/**
 * Account types
 */
export enum AccountType {
  Company = "company",
  Individual = "individual",
  Business = "business"
}

/**
 * Exemption reasons for PIT
 */
export enum ExemptionReason {
  Threshold = "threshold",
  NoIncome = "no_income",
  DeductionsOnly = "deductions_only"
}

/**
 * Filing status options
 */
export enum FilingStatus {
  NotFiled = "not_filed",
  Filed = "filed",
  Overdue = "overdue"
}

/**
 * Remittance status options
 */
export enum RemittanceStatus {
  Pending = "pending",
  Remitted = "remitted",
  Overdue = "overdue",
  Compliant = "compliant"
}

/**
 * Referral withdrawal status
 */
export enum ReferralWithdrawalStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled"
}

/**
 * Application Routes
 */
export enum AppRoutes {
  Home = "/",
  Features = "/features",
  Pricing = "/pricing",
  Compliance = "/compliance",
  Resources = "/resources",
  SignIn = "/sign-in",
  SignUp = "/sign-up",
  Dashboard = "/dashboard",
  HelpCenter = "/help-center"
}
