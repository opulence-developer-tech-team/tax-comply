/**
 * Client-Safe PIT Employment Source Enum
 * 
 * This enum matches the server-side PITEmploymentSource enum
 * and can be safely used in client components.
 */

export enum PITEmploymentSource {
  Payslip = "payslip",
  EmployerStatement = "employer_statement",
  Manual = "manual",
  Other = "other"
}

