import { Types } from "mongoose";
import { RemittanceStatus, AccountType } from "../utils/enum";
import { PayrollStatus } from "../utils/payroll-status";
import { Payroll, PayrollSchedule, PAYERemittance } from "./entity";
import { IPayroll, IPayrollSchedule, IPayrollCalculation, IPAYERemittance, IPayrollScheduleCalculation } from "./interface";
import {
  calculatePAYE,
  calculatePensionContribution,
  calculateEmployerPensionContribution,
  calculateNHFContribution,
  calculateNHISContribution,
  calculateTaxableIncome,
  calculateNetSalary,
  calculateCRA,
  calculateAnnualPIT,
  calculateTaxAfterWHTCredit,
  getTaxYear,
  calculateITF,
} from "../tax/calculator";
import { whtService } from "../wht/service";
import { NRS_PAYE_DEADLINE_DAY } from "../../constants/nrs-constants";
import { logger } from "../utils/logger";
import Employee from "../employee/entity";

class PayrollService {
  /**
   * Calculate complete payroll with all NRS (Nigeria Revenue Service) compliant deductions
   * Source: NRS (Nigeria Revenue Service) - formerly NRS (https://www.firs.gov.ng/)
   * 
   * NOTE: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
   * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
   * 
   * Includes:
   * - Employee Pension (8%) - Only if hasPension is true
   * - Employer Pension (10%) - Only if hasPension is true
   * - NHF (2.5%, capped at ₦2.5M annual) - Only if hasNHF is true
   * - NHIS (5% of gross salary) - Only if hasNHIS is true
   * - CRA (Consolidated Relief Allowance) - Not applicable for 2026+, returns 0
   * - PAYE (calculated on taxable income after all deductions)
   * 
   * @param grossSalary - Monthly gross salary
   * @param taxYear - Tax year (optional, defaults to current year)
   * @param hasPension - Whether employee has pension benefit (default: true)
   * @param hasNHF - Whether employee has NHF benefit (default: true)
   * @param hasNHIS - Whether employee has NHIS benefit (default: true)
   */
  calculatePayroll(
    grossSalary: number,
    taxYear?: number,
    hasPension: boolean = true,
    hasNHF: boolean = true,
    hasNHIS: boolean = true
  ): IPayrollCalculation {
    // Employee deductions - only calculate if benefit is enabled
    const employeePensionContribution = hasPension ? calculatePensionContribution(grossSalary) : 0; // 8%
    const employerPensionContribution = hasPension ? calculateEmployerPensionContribution(grossSalary) : 0; // 10%
    const nhfContribution = hasNHF ? calculateNHFContribution(grossSalary) : 0; // 2.5%
    const nhisContribution = hasNHIS ? calculateNHISContribution(grossSalary) : 0; // 5%
    // CRA is no longer applicable from 2026 per Nigeria Tax Act 2025. calculateCRA will return 0 for 2026+.
    const cra = calculateCRA(grossSalary, taxYear); // Returns 0 for taxYear >= 2026
    
    // Calculate taxable income (after pension, NHF, NHIS for 2026+)
    // Note: For 2026+, NHIS is deductible. CRA is not applicable (returns 0).
    const taxableIncome = calculateTaxableIncome(
      grossSalary,
      employeePensionContribution,
      nhfContribution,
      nhisContribution,
      taxYear
    );
    
    // Calculate PAYE on taxable income
    // Pass grossSalary for minimum tax calculation (required for low-income earners)
    const paye = calculatePAYE(taxableIncome, grossSalary, taxYear);
    
    // Net salary = Gross - Employee Pension - NHF - NHIS - PAYE
    // Note: Employer pension is NOT deducted from employee's net salary
    const netSalary = calculateNetSalary(
      grossSalary,
      employeePensionContribution,
      nhfContribution,
      nhisContribution,
      paye
    );

    return {
      grossSalary,
      employeePensionContribution,
      employerPensionContribution,
      nhfContribution,
      nhisContribution,
      cra,
      taxableIncome,
      paye,
      netSalary,
    };
  }

  async generatePayroll(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    payrollMonth: number,
    payrollYear: number,
    accountType: AccountType
  ): Promise<IPayroll> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const queryFilter: any = {
      employeeId,
      payrollMonth,
      payrollYear,
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }

    console.log("[PayrollService.generatePayroll] Checking for existing payroll", {
      queryFilter: JSON.stringify(queryFilter, null, 2),
      employeeId: employeeId.toString(),
      entityId: companyId.toString(),
      accountType,
      payrollMonth,
      payrollYear,
    });

    const existing = await Payroll.findOne(queryFilter);

    if (existing) {
      console.log("[PayrollService.generatePayroll] Existing payroll found, returning it", {
        payrollId: existing._id?.toString(),
        employeeId: employeeId.toString(),
        entityId: companyId.toString(),
        accountType,
      });
      // If payroll already exists, return it (no need to regenerate)
      // Note: Active employee check is handled in generatePayrollForAllEmployees
      return existing;
    }

    console.log("[PayrollService.generatePayroll] No existing payroll found, creating new one", {
      employeeId: employeeId.toString(),
      entityId: companyId.toString(),
      accountType,
    });

    // Build employee query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const employeeQueryFilter: any = {
      _id: employeeId,
      isActive: true,
    };
    if (accountType === AccountType.Company) {
      employeeQueryFilter.companyId = companyId;
      employeeQueryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      employeeQueryFilter.businessId = companyId;
      employeeQueryFilter.companyId = null;
    }

    console.log("[PayrollService.generatePayroll] Employee query filter", {
      queryFilter: JSON.stringify(employeeQueryFilter, null, 2),
      employeeId: employeeId.toString(),
      entityId: companyId.toString(),
      accountType,
    });

    const employee = await Employee.findOne(employeeQueryFilter);

    console.log("[PayrollService.generatePayroll] Employee lookup result", {
      employeeFound: !!employee,
      employeeId: employeeId.toString(),
      employeeData: employee ? {
        _id: employee._id?.toString(),
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        salary: employee.salary,
        isActive: employee.isActive,
        companyId: employee.companyId?.toString(),
        businessId: employee.businessId?.toString(),
      } : null,
      entityId: companyId.toString(),
      accountType,
    });

    if (!employee) {
      const errorMessage = `Employee not found or inactive. employeeId: ${employeeId.toString()}, entityId: ${companyId.toString()}, accountType: ${accountType}`;
      console.error("[PayrollService.generatePayroll] Employee not found", {
        errorMessage,
        employeeId: employeeId.toString(),
        entityId: companyId.toString(),
        accountType,
        queryFilter: JSON.stringify(employeeQueryFilter, null, 2),
      });
      throw new Error(errorMessage);
    }

    const taxYear = payrollYear >= 2026 ? 2026 : 2024;
    // CRITICAL: Pass employee benefit flags to calculatePayroll to respect employee's benefit selections
    const calculation = this.calculatePayroll(
      employee.salary,
      taxYear,
      employee.hasPension ?? true, // Default to true if undefined (backward compatibility)
      employee.hasNHF ?? true, // Default to true if undefined (backward compatibility)
      employee.hasNHIS ?? true // Default to true if undefined (backward compatibility)
    );

    // Build payroll data based on accountType
    const payrollData: any = {
      employeeId,
      payrollMonth,
      payrollYear,
      grossSalary: calculation.grossSalary,
      employeePensionContribution: calculation.employeePensionContribution,
      employerPensionContribution: calculation.employerPensionContribution,
      nhfContribution: calculation.nhfContribution,
      nhisContribution: calculation.nhisContribution,
      cra: calculation.cra,
      taxableIncome: calculation.taxableIncome,
      paye: calculation.paye,
      netSalary: calculation.netSalary,
      status: "draft",
    };
    if (accountType === AccountType.Company) {
      payrollData.companyId = companyId;
      payrollData.businessId = null;
    } else if (accountType === AccountType.Business) {
      payrollData.businessId = companyId;
      payrollData.companyId = null;
    }

    console.log("[PayrollService.generatePayroll] Payroll data prepared", {
      payrollData: {
        ...payrollData,
        employeeId: payrollData.employeeId.toString(),
        companyId: payrollData.companyId?.toString(),
        businessId: payrollData.businessId?.toString(),
      },
      employeeId: employeeId.toString(),
      entityId: companyId.toString(),
      accountType,
    });

    const payroll = new Payroll(payrollData);

    console.log("[PayrollService.generatePayroll] Saving payroll to database", {
      employeeId: employeeId.toString(),
      entityId: companyId.toString(),
      accountType,
    });

    await payroll.save();

    console.log("[PayrollService.generatePayroll] Payroll saved successfully", {
      payrollId: payroll._id?.toString(),
      employeeId: employeeId.toString(),
      entityId: companyId.toString(),
      accountType,
      grossSalary: payroll.grossSalary,
      paye: payroll.paye,
      netSalary: payroll.netSalary,
      payrollMonth: payroll.payrollMonth,
      payrollYear: payroll.payrollYear,
      companyId: payroll.companyId?.toString(),
      businessId: payroll.businessId?.toString(),
    });

    // Ensure PayrollSchedule exists (for workflow status) - totals are calculated on-the-fly
    await this.ensurePayrollSchedule(companyId, payrollMonth, payrollYear, accountType);

    logger.info("Payroll generated", {
      payrollId: payroll._id.toString(),
      entityId: companyId.toString(),
      accountType,
      employeeId: employeeId.toString(),
    });

    return payroll;
  }

  /**
   * Calculate PayrollSchedule totals on-the-fly from Payroll records
   * CRITICAL: Totals are no longer stored - calculated from source data to eliminate duplication
   */
  async calculatePayrollScheduleTotals(
    companyId: Types.ObjectId,
    month: number,
    year: number,
    accountType: AccountType
  ): Promise<IPayrollScheduleCalculation> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const queryFilter: any = {
      payrollMonth: month,
      payrollYear: year,
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }

    const payrolls = await Payroll.find(queryFilter);

    console.log("[PayrollService.calculatePayrollScheduleTotals] Query executed", {
      queryFilter: JSON.stringify(queryFilter, null, 2),
      payrollsFound: payrolls.length,
      accountType,
      month,
      year,
      entityId: companyId.toString(),
      samplePayrolls: payrolls.slice(0, 3).map(p => ({
        _id: p._id?.toString(),
        employeeId: p.employeeId?.toString(),
        grossSalary: p.grossSalary,
        paye: p.paye,
        netSalary: p.netSalary,
        payrollMonth: p.payrollMonth,
        payrollYear: p.payrollYear,
        companyId: p.companyId?.toString(),
        businessId: p.businessId?.toString(),
      })),
    });

    const totalEmployees = payrolls.length;
    const totalGrossSalary = payrolls.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
    const totalEmployeePension = payrolls.reduce((sum, p) => sum + (p.employeePensionContribution || 0), 0);
    const totalEmployerPension = payrolls.reduce((sum, p) => sum + (p.employerPensionContribution || 0), 0);
    const totalNHF = payrolls.reduce((sum, p) => sum + (p.nhfContribution || 0), 0);
    const totalNHIS = payrolls.reduce((sum, p) => sum + (p.nhisContribution || 0), 0);
    const totalPAYE = payrolls.reduce((sum, p) => sum + (p.paye || 0), 0);
    const totalNetSalary = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);

    // CRITICAL: Calculate ITF Liability (Company Only)
    // Needs Company's Annual Turnover and Employee Count
    let totalITF = 0;
    
    if (accountType === AccountType.Company) {
      try {
        const { companyService } = await import("../company/service");
        // Get annual turnover for the tax year
        const annualTurnover = await companyService.calculateAnnualTurnover(companyId, year);
        
        // Calculate ITF (1% of payroll if turnover >= 50M or employees >= 5)
        totalITF = calculateITF(totalGrossSalary, annualTurnover, totalEmployees);
        
        console.log("[PayrollService.calculatePayrollScheduleTotals] ITF Calculation", {
          annualTurnover,
          totalEmployees,
          totalGrossSalary,
          totalITF,
          isLiable: totalITF > 0
        });
      } catch (error) {
        console.error("Error calculating ITF liability:", error);
        // Fail safe: 0 ITF if calculation errors (e.g. company service issue)
        totalITF = 0;
      }
    }

    const result = {
      totalEmployees,
      totalGrossSalary: Math.round(totalGrossSalary * 100) / 100,
      totalEmployeePension: Math.round(totalEmployeePension * 100) / 100,
      totalEmployerPension: Math.round(totalEmployerPension * 100) / 100,
      totalNHF: Math.round(totalNHF * 100) / 100,
      totalNHIS: Math.round(totalNHIS * 100) / 100,
      totalPAYE: Math.round(totalPAYE * 100) / 100,
      totalNetSalary: Math.round(totalNetSalary * 100) / 100,
      totalITF: Math.round(totalITF * 100) / 100,
    };

    console.log("[PayrollService.calculatePayrollScheduleTotals] Calculated totals", {
      accountType,
      month,
      year,
      entityId: companyId.toString(),
      result,
    });

    return result;
  }

  /**
   * Ensure PayrollSchedule exists (for workflow status)
   * CRITICAL: Only creates/updates status record - totals are calculated on-the-fly
   */
  async ensurePayrollSchedule(
    companyId: Types.ObjectId,
    month: number,
    year: number,
    accountType: AccountType
  ): Promise<IPayrollSchedule> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const queryFilter: any = {
      month,
      year,
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }

    // Build update data based on accountType
    const updateData: any = {
      month,
      year,
      status: PayrollStatus.Draft, // Default status
    };
    if (accountType === AccountType.Company) {
      updateData.companyId = companyId;
      updateData.businessId = null;
    } else if (accountType === AccountType.Business) {
      updateData.businessId = companyId;
      updateData.companyId = null;
    }

    const schedule = await PayrollSchedule.findOneAndUpdate(
      queryFilter,
      updateData,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Create or update PAYE remittance record (needs totalPAYE from calculation)
    const totals = await this.calculatePayrollScheduleTotals(companyId, month, year, accountType);
    await this.createOrUpdatePAYERemittance(companyId, month, year, totals.totalPAYE, accountType);

    return schedule;
  }


  /**
   * Create or update PAYE remittance record
   * NRS (Nigeria Revenue Service) requires PAYE to be remitted by the 10th day of the month following salary payment
   */
  async createOrUpdatePAYERemittance(
    companyId: Types.ObjectId,
    remittanceMonth: number,
    remittanceYear: number,
    totalPAYE: number,
    accountType: AccountType
  ): Promise<IPAYERemittance> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // Calculate remittance deadline (10th of following month)
    // If remittanceMonth is December (12), following month is January of next year
    let deadlineYear = remittanceYear;
    let deadlineMonth = remittanceMonth + 1;
    if (deadlineMonth > 12) {
      deadlineMonth = 1;
      deadlineYear += 1;
    }
    const deadlineDate = new Date(deadlineYear, deadlineMonth - 1, NRS_PAYE_DEADLINE_DAY);
    
    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const queryFilter: any = {
      remittanceMonth,
      remittanceYear,
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }
    
    // Check if remittance is overdue (only if not already remitted)
    const existing = await PAYERemittance.findOne(queryFilter);
    const now = new Date();
    let status: RemittanceStatus = RemittanceStatus.Pending;
    
    if (existing?.status === RemittanceStatus.Remitted) {
      status = RemittanceStatus.Remitted;
    } else if (now > deadlineDate) {
      status = RemittanceStatus.Overdue;
    }

    // Build update data based on accountType
    const updateData: any = {
      totalPAYE: Math.round(totalPAYE * 100) / 100,
      remittanceDeadline: deadlineDate,
      status: status,
    };
    if (accountType === AccountType.Company) {
      updateData.companyId = companyId;
      updateData.businessId = null;
    } else if (accountType === AccountType.Business) {
      updateData.businessId = companyId;
      updateData.companyId = null;
    }

    const remittance = await PAYERemittance.findOneAndUpdate(
      queryFilter,
      updateData,
      {
        upsert: true,
        new: true,
      }
    );

    return remittance;
  }

  /**
   * Mark PAYE as remitted
   */
  async markPAYERemitted(
    companyId: Types.ObjectId,
    remittanceMonth: number,
    remittanceYear: number,
    remittanceDate: Date,
    accountType: AccountType,
    remittanceReference?: string,
    remittanceReceipt?: string,
    notes?: string
  ): Promise<IPAYERemittance | null> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const queryFilter: any = {
      remittanceMonth,
      remittanceYear,
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }

    const remittance = await PAYERemittance.findOneAndUpdate(
      queryFilter,
      {
        remittanceDate,
        status: RemittanceStatus.Remitted,
        remittanceReference: remittanceReference || "",
        remittanceReceipt: remittanceReceipt || "",
        notes: notes || "",
      },
      { new: true }
    );

    if (remittance) {
      logger.info("PAYE remittance marked as remitted", {
        entityId: companyId.toString(),
        accountType,
        remittanceMonth,
        remittanceYear,
        remittanceReference,
      });
    }

    return remittance;
  }

  /**
   * Get PAYE remittance record
   */
  async getPAYERemittance(
    companyId: Types.ObjectId,
    remittanceMonth: number,
    remittanceYear: number,
    accountType: AccountType
  ): Promise<IPAYERemittance | null> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const queryFilter: any = {
      remittanceMonth,
      remittanceYear,
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }

    return await PAYERemittance.findOne(queryFilter);
  }

  /**
   * Get all PAYE remittances for a company or business
   */
  async getCompanyPAYERemittances(
    companyId: Types.ObjectId,
    accountType: AccountType,
    year?: number
  ): Promise<IPAYERemittance[]> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const query: any = {};
    if (accountType === AccountType.Company) {
      query.companyId = companyId;
      query.businessId = null;
    } else if (accountType === AccountType.Business) {
      query.businessId = companyId;
      query.companyId = null;
    }
    if (year) {
      query.remittanceYear = year;
    }
    return await PAYERemittance.find(query).sort({ remittanceYear: -1, remittanceMonth: -1 });
  }

  async generatePayrollForAllEmployees(
    companyId: Types.ObjectId,
    payrollMonth: number,
    payrollYear: number,
    accountType: AccountType
  ): Promise<IPayroll[]> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    console.log("[PayrollService.generatePayrollForAllEmployees] Starting payroll generation", {
      entityId: companyId.toString(),
      accountType,
      payrollMonth,
      payrollYear,
    });

    // Build employee query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const employeeQueryFilter: any = {
      isActive: true,
    };
    if (accountType === AccountType.Company) {
      employeeQueryFilter.companyId = companyId;
      employeeQueryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      employeeQueryFilter.businessId = companyId;
      employeeQueryFilter.companyId = null;
    }

    console.log("[PayrollService.generatePayrollForAllEmployees] Employee query filter", {
      queryFilter: JSON.stringify(employeeQueryFilter, null, 2),
      accountType,
      entityId: companyId.toString(),
    });

    const employees = await Employee.find(employeeQueryFilter);

    console.log("[PayrollService.generatePayrollForAllEmployees] Employees found", {
      employeeCount: employees.length,
      employees: employees.map(emp => ({
        _id: emp._id?.toString(),
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        salary: emp.salary,
        isActive: emp.isActive,
        companyId: emp.companyId?.toString(),
        businessId: emp.businessId?.toString(),
      })),
      accountType,
      entityId: companyId.toString(),
    });

    const payrolls: IPayroll[] = [];

    for (const employee of employees) {
      try {
        console.log("[PayrollService.generatePayrollForAllEmployees] Generating payroll for employee", {
          employeeId: employee._id?.toString(),
          employeeEmployeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          salary: employee.salary,
          entityId: companyId.toString(),
          accountType,
          payrollMonth,
          payrollYear,
        });

        const payroll = await this.generatePayroll(
          companyId,
          employee._id!,
          payrollMonth,
          payrollYear,
          accountType
        );

        console.log("[PayrollService.generatePayrollForAllEmployees] Payroll generated successfully", {
          payrollId: payroll._id?.toString(),
          employeeId: employee._id?.toString(),
          grossSalary: payroll.grossSalary,
          paye: payroll.paye,
          netSalary: payroll.netSalary,
          companyId: payroll.companyId?.toString(),
          businessId: payroll.businessId?.toString(),
          payrollMonth: payroll.payrollMonth,
          payrollYear: payroll.payrollYear,
        });

        payrolls.push(payroll);
      } catch (error: any) {
        console.error("[PayrollService.generatePayrollForAllEmployees] Error generating payroll for employee", {
          error: error.message,
          errorStack: error.stack,
          employeeId: employee._id?.toString(),
          employeeEmployeeId: employee.employeeId,
          entityId: companyId.toString(),
          accountType,
        });
        logger.error("Error generating payroll for employee", error, {
          entityId: companyId.toString(),
          accountType,
          employeeId: employee._id?.toString(),
        });
      }
    }

    console.log("[PayrollService.generatePayrollForAllEmployees] Payroll generation complete", {
      totalPayrolls: payrolls.length,
      entityId: companyId.toString(),
      accountType,
      payrollMonth,
      payrollYear,
      payrollIds: payrolls.map(p => p._id?.toString()),
    });

    return payrolls;
  }

  async getPayroll(
    companyId: Types.ObjectId,
    employeeId: Types.ObjectId,
    payrollMonth: number,
    payrollYear: number
  ): Promise<IPayroll | null> {
    return await Payroll.findOne({
      companyId,
      employeeId,
      payrollMonth,
      payrollYear,
    });
  }

  /**
   * Get PayrollSchedule with totals calculated on-the-fly
   * CRITICAL: Totals are calculated from Payroll records, not stored
   */
  async getPayrollSchedule(
    companyId: Types.ObjectId,
    month: number,
    year: number,
    accountType: AccountType
  ): Promise<IPayrollSchedule | null> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    const queryFilter: any = {
      month,
      year,
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }

    const schedule = await PayrollSchedule.findOne(queryFilter);
    if (!schedule) {
      return null;
    }

    // Calculate totals on-the-fly from Payroll records
    const totals = await this.calculatePayrollScheduleTotals(companyId, month, year, accountType);

    return {
      ...schedule.toObject(),
      ...totals,
    };
  }

  /**
   * Get payroll schedule by ID with totals calculated on-the-fly
   * CRITICAL: Validates scheduleId and fails loudly if invalid
   */
  async getPayrollScheduleById(
    scheduleId: Types.ObjectId
  ): Promise<IPayrollSchedule | null> {
    // CRITICAL: Validate scheduleId
    if (!scheduleId || !Types.ObjectId.isValid(scheduleId)) {
      throw new Error(
        `CRITICAL: Invalid schedule ID provided to getPayrollScheduleById. ` +
        `Schedule ID: ${scheduleId?.toString() || "undefined"}.`
      );
    }

    const schedule = await PayrollSchedule.findById(scheduleId);
    if (!schedule) {
      return null;
    }

    // Determine accountType and entityId from schedule
    const entityId = schedule.companyId || schedule.businessId;
    if (!entityId) {
      throw new Error(
        `CRITICAL: PayrollSchedule has neither companyId nor businessId. Schedule ID: ${scheduleId.toString()}.`
      );
    }
    const accountType = schedule.companyId ? AccountType.Company : AccountType.Business;

    // Calculate totals on-the-fly from Payroll records
    const totals = await this.calculatePayrollScheduleTotals(entityId, schedule.month, schedule.year, accountType);

    return {
      ...schedule.toObject(),
      ...totals,
    };
  }

  /**
   * Get company payroll schedules with pagination and filters
   * CRITICAL: Validates all inputs and fails loudly on invalid data
   */
  async getCompanyPayrollSchedules(
    companyId: Types.ObjectId,
    filters: {
      status?: string;
      year?: number;
      month?: number;
      page: number;
      limit: number;
    },
    accountType: AccountType
  ): Promise<{
    schedules: IPayrollSchedule[];
    page: number;
    limit: number;
    total: number;
    pages: number;
  }> {
    // CRITICAL: Validate companyId
    if (!companyId || !Types.ObjectId.isValid(companyId)) {
      throw new Error("Invalid entity ID provided to getCompanyPayrollSchedules");
    }

    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // CRITICAL: Validate pagination parameters
    if (!filters.page || filters.page < 1) {
      throw new Error("Page must be a positive integer (minimum 1)");
    }

    if (!filters.limit || filters.limit < 1 || filters.limit > 100) {
      throw new Error("Limit must be between 1 and 100");
    }

    // CRITICAL: Validate year if provided
    if (filters.year !== undefined) {
      if (typeof filters.year !== "number" || isNaN(filters.year) || filters.year < 2026) {
        throw new Error("Invalid tax year. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.");
      }
    }

    // CRITICAL: Validate month if provided
    if (filters.month !== undefined) {
      if (typeof filters.month !== "number" || isNaN(filters.month) || filters.month < 1 || filters.month > 12) {
        throw new Error("Invalid month. Month must be between 1 and 12.");
      }
    }

    // CRITICAL: Validate status if provided
    if (filters.status !== undefined) {
      const validStatuses = ["draft", "approved", "submitted"];
      if (typeof filters.status !== "string" || !validStatuses.includes(filters.status)) {
        throw new Error(`Invalid status. Allowed values: ${validStatuses.join(", ")}`);
      }
    }

    // Build query based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const query: any = {};
    if (accountType === AccountType.Company) {
      query.companyId = companyId;
      query.businessId = null;
    } else if (accountType === AccountType.Business) {
      query.businessId = companyId;
      query.companyId = null;
    }

    // Add status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Add year filter
    if (filters.year !== undefined) {
      query.year = filters.year;
    }

    // Add month filter
    if (filters.month !== undefined) {
      query.month = filters.month;
    }

    // Calculate pagination
    const skip = (filters.page - 1) * filters.limit;

    // Get total count (for pagination)
    const total = await PayrollSchedule.countDocuments(query);

    // Get paginated schedules
    const scheduleRecords = await PayrollSchedule.find(query)
      .sort({ year: -1, month: -1, createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(filters.limit)
      .lean();

    // Calculate totals on-the-fly for each schedule
    console.log("[PayrollService.getCompanyPayrollSchedules] Calculating totals for schedules", {
      accountType,
      entityId: companyId.toString(),
      schedulesFound: scheduleRecords.length,
      scheduleRecords: scheduleRecords.map(s => ({
        _id: s._id?.toString(),
        companyId: s.companyId?.toString(),
        businessId: s.businessId?.toString(),
        month: s.month,
        year: s.year,
        status: s.status,
      })),
    });

    const schedules: IPayrollSchedule[] = await Promise.all(
      scheduleRecords.map(async (schedule) => {
        const entityId = schedule.companyId || schedule.businessId;
        if (!entityId) {
          throw new Error(
            `CRITICAL: PayrollSchedule has neither companyId nor businessId. Schedule ID: ${schedule._id?.toString() || "unknown"}.`
          );
        }
        const scheduleAccountType = schedule.companyId ? AccountType.Company : AccountType.Business;
        const totals = await this.calculatePayrollScheduleTotals(
          entityId,
          schedule.month,
          schedule.year,
          scheduleAccountType
        );
        const enrichedSchedule = {
          ...schedule,
          ...totals,
        } as IPayrollSchedule;

        console.log("[PayrollService.getCompanyPayrollSchedules] Schedule enriched with totals", {
          scheduleId: schedule._id?.toString(),
          month: schedule.month,
          year: schedule.year,
          totals,
          enrichedSchedule: {
            _id: enrichedSchedule._id?.toString(),
            totalEmployees: enrichedSchedule.totalEmployees,
            totalGrossSalary: enrichedSchedule.totalGrossSalary,
            totalPAYE: enrichedSchedule.totalPAYE,
            totalNetSalary: enrichedSchedule.totalNetSalary,
          },
        });

        return enrichedSchedule;
      })
    );

    // Calculate total pages
    const pages = Math.ceil(total / filters.limit) || 1;

    return {
      schedules,
      page: filters.page,
      limit: filters.limit,
      total,
      pages,
    };
  }

  async getCompanyPayrolls(
    companyId: Types.ObjectId,
    payrollMonth: number,
    payrollYear: number,
    accountType: AccountType
  ): Promise<IPayroll[]> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // Build query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    // MongoDB { field: null } matches both null values and non-existent fields
    const queryFilter: any = {
      payrollMonth,
      payrollYear,
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = companyId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = companyId;
      queryFilter.companyId = null;
    }

    return await Payroll.find(queryFilter).populate("employeeId");
  }

  async approvePayroll(payrollId: Types.ObjectId): Promise<IPayroll | null> {
    return await Payroll.findByIdAndUpdate(
      payrollId,
      { status: "approved" },
      { new: true }
    );
  }

  async markPayrollAsPaid(
    payrollId: Types.ObjectId,
    paymentDate: Date
  ): Promise<IPayroll | null> {
    return await Payroll.findByIdAndUpdate(
      payrollId,
      {
        status: "paid",
        paymentDate,
      },
      { new: true }
    );
  }

  /**
   * Recalculate draft payroll records for an employee when their salary or benefit flags change
   * CRITICAL: Only updates payroll records where BOTH conditions are met:
   * 1. Payroll record status is "draft"
   * 2. PayrollSchedule status is NOT "submitted" (submitted schedules are immutable)
   * 
   * Business Logic:
   * - Draft schedules: Can be modified (recalculated)
   * - Approved schedules: Can be modified (approved but not yet submitted - corrections may be needed)
   * - Submitted schedules: Cannot be modified (immutable - already submitted to authorities/paid out)
   * 
   * @param employeeId - Employee ID
   * @param newSalary - New salary amount
   * @param entityId - Entity ID (companyId or businessId)
   * @param accountType - Account type (Company or Business)
   * @returns Array of updated payroll record IDs (only those NOT in submitted schedules)
   */
  async recalculateDraftPayrollsForEmployee(
    employeeId: Types.ObjectId,
    newSalary: number,
    entityId: Types.ObjectId,
    accountType: AccountType
  ): Promise<Types.ObjectId[]> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }
    // CRITICAL: Validate inputs - fail loudly if invalid
    if (!employeeId || !Types.ObjectId.isValid(employeeId)) {
      throw new Error(
        `CRITICAL: Invalid employeeId provided to recalculateDraftPayrollsForEmployee. ` +
        `Employee ID: ${employeeId?.toString() || "undefined"}.`
      );
    }

    if (!entityId || !Types.ObjectId.isValid(entityId)) {
      throw new Error(
        `CRITICAL: Invalid entityId provided to recalculateDraftPayrollsForEmployee. ` +
        `Entity ID: ${entityId?.toString() || "undefined"}.`
      );
    }

    if (typeof newSalary !== "number" || isNaN(newSalary) || !isFinite(newSalary)) {
      throw new Error(
        `CRITICAL: Invalid newSalary provided to recalculateDraftPayrollsForEmployee. ` +
        `Salary must be a valid number. Received: ${newSalary} (type: ${typeof newSalary}).`
      );
    }

    if (newSalary < 0) {
      throw new Error(
        `CRITICAL: newSalary cannot be negative. Received: ${newSalary}.`
      );
    }

    // Build query filter for draft payrolls based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    const queryFilter: any = {
      employeeId,
      status: "draft",
    };
    if (accountType === AccountType.Company) {
      queryFilter.companyId = entityId;
      queryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      queryFilter.businessId = entityId;
      queryFilter.companyId = null;
    }

    // Find all DRAFT payroll records for this employee
    const draftPayrolls = await Payroll.find(queryFilter);

    if (draftPayrolls.length === 0) {
      logger.info("No draft payroll records found to recalculate", {
        employeeId: employeeId.toString(),
        entityId: entityId.toString(),
        accountType,
        newSalary,
      });
      return [];
    }

    // Build employee query filter based on accountType
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    const employeeQueryFilter: any = {
      _id: employeeId,
    };
    if (accountType === AccountType.Company) {
      employeeQueryFilter.companyId = entityId;
      employeeQueryFilter.businessId = null;
    } else if (accountType === AccountType.Business) {
      employeeQueryFilter.businessId = entityId;
      employeeQueryFilter.companyId = null;
    }

    // CRITICAL: Get employee to verify they exist and get benefit flags
    const employee = await Employee.findOne(employeeQueryFilter);

    if (!employee) {
      throw new Error(
        `CRITICAL: Employee not found when recalculating draft payrolls. ` +
        `Employee ID: ${employeeId.toString()}, Entity ID: ${entityId.toString()}, AccountType: ${accountType}.`
      );
    }

    const updatedPayrollIds: Types.ObjectId[] = [];

    // Recalculate each draft payroll record
    // CRITICAL: Only recalculate if PayrollSchedule is still in "draft" status
    // Approved/Submitted schedules should NOT be modified (data integrity)
    for (const payroll of draftPayrolls) {
      // Check PayrollSchedule status for this payroll's month/year
      const scheduleQueryFilter: any = {
        month: payroll.payrollMonth,
        year: payroll.payrollYear,
      };
      if (accountType === AccountType.Company) {
        scheduleQueryFilter.companyId = entityId;
        scheduleQueryFilter.businessId = null;
      } else if (accountType === AccountType.Business) {
        scheduleQueryFilter.businessId = entityId;
        scheduleQueryFilter.companyId = null;
      }

      const schedule = await PayrollSchedule.findOne(scheduleQueryFilter);

      // CRITICAL: Skip recalculation ONLY if PayrollSchedule is submitted (immutable)
      // Draft and Approved schedules can be modified (approved can be changed before submission)
      // Only Submitted schedules are immutable (already submitted to authorities/paid out)
      if (schedule && schedule.status === PayrollStatus.Submitted) {
        logger.info("Skipping payroll recalculation - PayrollSchedule is submitted (immutable)", {
          payrollId: payroll._id?.toString(),
          employeeId: employeeId.toString(),
          entityId: entityId.toString(),
          accountType,
          payrollMonth: payroll.payrollMonth,
          payrollYear: payroll.payrollYear,
          scheduleStatus: schedule.status,
          scheduleId: schedule._id?.toString(),
        });
        continue; // Skip this payroll record
      }

      const taxYear = payroll.payrollYear >= 2026 ? 2026 : 2024;
      // CRITICAL: Pass employee benefit flags to calculatePayroll to respect employee's benefit selections
      // CRITICAL: Benefit flags are required in schema - fail loudly if undefined (no defaults)
      if (employee.hasPension === undefined) {
        throw new Error(
          `CRITICAL: Employee hasPension is undefined. Employee ID: ${employeeId.toString()}. ` +
          `Benefit flags are required and must be explicitly set.`
        );
      }
      if (employee.hasNHF === undefined) {
        throw new Error(
          `CRITICAL: Employee hasNHF is undefined. Employee ID: ${employeeId.toString()}. ` +
          `Benefit flags are required and must be explicitly set.`
        );
      }
      if (employee.hasNHIS === undefined) {
        throw new Error(
          `CRITICAL: Employee hasNHIS is undefined. Employee ID: ${employeeId.toString()}. ` +
          `Benefit flags are required and must be explicitly set.`
        );
      }
      const calculation = this.calculatePayroll(
        newSalary,
        taxYear,
        employee.hasPension,
        employee.hasNHF,
        employee.hasNHIS
      );

      // Update the payroll record with new calculations
      payroll.grossSalary = calculation.grossSalary;
      payroll.employeePensionContribution = calculation.employeePensionContribution;
      payroll.employerPensionContribution = calculation.employerPensionContribution;
      payroll.nhfContribution = calculation.nhfContribution;
      payroll.nhisContribution = calculation.nhisContribution;
      payroll.cra = calculation.cra;
      payroll.taxableIncome = calculation.taxableIncome;
      payroll.paye = calculation.paye;
      payroll.netSalary = calculation.netSalary;

      await payroll.save();
      updatedPayrollIds.push(payroll._id!);

      // Ensure PayrollSchedule exists (for workflow status) - totals are calculated on-the-fly
      // CRITICAL: Use entityId, not companyId (parameter name is entityId)
      await this.ensurePayrollSchedule(entityId, payroll.payrollMonth, payroll.payrollYear, accountType);

      logger.info("Draft payroll record recalculated due to employee data change", {
        payrollId: payroll._id?.toString(),
        employeeId: employeeId.toString(),
        entityId: entityId.toString(),
        accountType,
        payrollMonth: payroll.payrollMonth,
        payrollYear: payroll.payrollYear,
        oldGrossSalary: payroll.grossSalary, // This is now the new salary after update
        newGrossSalary: calculation.grossSalary,
      });
    }

    return updatedPayrollIds;
  }

  /**
   * Calculate annual PIT (Personal Income Tax) with WHT credits applied
   * Reference: NRS (Nigeria Revenue Service) - formerly NRS (https://www.firs.gov.ng/)
   * 
   * NOTE: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
   * CRITICAL: This application only supports tax laws valid from 2026 onward per Nigeria Tax Act 2025.
   * 
   * WHT credits offset final PIT liability per NRS regulations.
   * This method calculates annual PIT from payroll data and applies available WHT credits.
   * 
   * @param employeeId - Employee ID (for WHT credit lookup)
   * @param annualTaxableIncome - Annual taxable income (sum of monthly taxable income)
   * @param taxYear - Tax year for calculation
   * @returns Object with PIT before/after WHT credits
   */
  async calculateAnnualPITWithWHTCredits(
    employeeId: Types.ObjectId,
    annualTaxableIncome: number,
    taxYear?: number
  ): Promise<{
    annualPITBeforeWHT: number;
    whtCredits: number;
    annualPITAfterWHT: number;
    creditApplied: number;
  }> {
    const year = taxYear || getTaxYear();
    
    // Calculate annual PIT from annual taxable income
    const annualPITBeforeWHT = calculateAnnualPIT(annualTaxableIncome, year);
    
    // Get WHT credits for this employee (individual account)
    let whtCredits = 0;
    let creditApplied = 0;
    try {
      whtCredits = await whtService.getTotalWHTCredits(employeeId, year);
      
      // Apply WHT credits to reduce PIT liability
      if (whtCredits > 0 && annualPITBeforeWHT > 0) {
        const result = await whtService.applyWHTCredit(
          employeeId,
          AccountType.Individual,
          year,
          annualPITBeforeWHT
        );
        creditApplied = result.creditApplied;
      }
    } catch (error: any) {
      logger.error("Error fetching/applying WHT credits for annual PIT", error, {
        employeeId: employeeId.toString(),
        taxYear: year,
      });
      // Continue without WHT credits if service fails
    }
    
    // Calculate final PIT after WHT credits
    const annualPITAfterWHT = calculateTaxAfterWHTCredit(annualPITBeforeWHT, whtCredits);
    
    return {
      annualPITBeforeWHT,
      whtCredits,
      annualPITAfterWHT,
      creditApplied,
    };
  }

  /**
   * Calculate annual PIT for all employees with WHT credits applied
   * Aggregates monthly payroll data and applies WHT credits per employee
   * 
   * @param companyId - Company ID
   * @param year - Tax year
   * @returns Array of annual PIT computations with WHT credits
   */
  async calculateAnnualPITForAllEmployees(
    companyId: Types.ObjectId,
    year: number
  ): Promise<Array<{
    employeeId: Types.ObjectId;
    employeeName?: string;
    annualGrossSalary: number;
    annualTaxableIncome: number;
    annualPITBeforeWHT: number;
    whtCredits: number;
    annualPITAfterWHT: number;
    creditApplied: number;
  }>> {
    // Get all payroll records for the year
    const payrolls = await Payroll.find({
      companyId,
      payrollYear: year,
    }).populate("employeeId").lean();

    // Group by employee and aggregate
    const employeeMap = new Map<string, {
      employeeId: Types.ObjectId;
      employeeName?: string;
      totalGrossSalary: number;
      totalTaxableIncome: number;
    }>();

    for (const payroll of payrolls) {
      const employeeId = payroll.employeeId.toString();
      const employee = (payroll as any).employeeId;
      
      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employeeId: payroll.employeeId as Types.ObjectId,
          employeeName: employee?.name || employee?.employeeId || "Unknown",
          totalGrossSalary: 0,
          totalTaxableIncome: 0,
        });
      }

      const employeeData = employeeMap.get(employeeId)!;
      employeeData.totalGrossSalary += payroll.grossSalary;
      employeeData.totalTaxableIncome += payroll.taxableIncome;
    }

    // Calculate annual PIT with WHT credits for each employee
    const results = [];
    for (const [employeeId, employeeData] of employeeMap.entries()) {
      try {
        const pitComputation = await this.calculateAnnualPITWithWHTCredits(
          employeeData.employeeId,
          employeeData.totalTaxableIncome,
          year
        );

        results.push({
          employeeId: employeeData.employeeId,
          employeeName: employeeData.employeeName,
          annualGrossSalary: Math.round(employeeData.totalGrossSalary * 100) / 100,
          annualTaxableIncome: Math.round(employeeData.totalTaxableIncome * 100) / 100,
          ...pitComputation,
        });
      } catch (error: any) {
        logger.error("Error calculating annual PIT for employee", error, {
          employeeId: employeeData.employeeId.toString(),
          year,
        });
        // Continue with other employees
      }
    }

    return results;
  }

  /**
   * Update payroll schedule status with validation of status transitions
   * CRITICAL: Validates status transitions - fail loudly if invalid
   * 
   * Valid transitions:
   * - draft -> approved
   * - draft -> submitted
   * - approved -> submitted
   * 
   * Invalid transitions (will throw error):
   * - Any backwards transition (e.g., approved -> draft, submitted -> approved)
   * - submitted -> draft
   */
  async updatePayrollScheduleStatus(
    scheduleId: Types.ObjectId,
    newStatus: string
  ): Promise<IPayrollSchedule> {
    // CRITICAL: Validate scheduleId
    if (!scheduleId || !Types.ObjectId.isValid(scheduleId)) {
      throw new Error(
        `CRITICAL: Invalid schedule ID provided to updatePayrollScheduleStatus. ` +
        `Schedule ID: ${scheduleId?.toString() || "undefined"}.`
      );
    }

    // CRITICAL: Validate newStatus is a string
    if (typeof newStatus !== "string") {
      throw new Error(
        `CRITICAL: newStatus must be a string. Received type: ${typeof newStatus}, value: ${newStatus}.`
      );
    }

    // CRITICAL: Validate newStatus is a valid PayrollStatus enum value
    const validStatuses = [PayrollStatus.Draft, PayrollStatus.Approved, PayrollStatus.Submitted];
    if (!validStatuses.includes(newStatus as PayrollStatus)) {
      throw new Error(
        `CRITICAL: Invalid status value: "${newStatus}". ` +
        `Allowed values: ${validStatuses.join(", ")}.`
      );
    }

    // Get the existing schedule
    const schedule = await PayrollSchedule.findById(scheduleId);
    if (!schedule) {
      throw new Error(
        `CRITICAL: Payroll schedule not found. Schedule ID: ${scheduleId.toString()}.`
      );
    }

    // CRITICAL: Validate current status exists
    const currentStatus = schedule.status;
    if (!currentStatus || typeof currentStatus !== "string") {
      throw new Error(
        `CRITICAL: Current schedule status is invalid. ` +
        `Schedule ID: ${scheduleId.toString()}, Current Status: ${currentStatus}.`
      );
    }

    // CRITICAL: Validate status transition
    // Valid transitions: draft -> approved, draft -> submitted, approved -> submitted
    // Invalid: any backwards transition
    if (currentStatus === PayrollStatus.Submitted && newStatus !== PayrollStatus.Submitted) {
      throw new Error(
        `CRITICAL: Cannot change status from "${PayrollStatus.Submitted}" to "${newStatus}". ` +
        `Once submitted, the schedule status cannot be changed. ` +
        `Schedule ID: ${scheduleId.toString()}.`
      );
    }

    if (currentStatus === PayrollStatus.Approved && newStatus === PayrollStatus.Draft) {
      throw new Error(
        `CRITICAL: Cannot change status from "${PayrollStatus.Approved}" to "${PayrollStatus.Draft}". ` +
        `Status transitions cannot go backwards. ` +
        `Schedule ID: ${scheduleId.toString()}.`
      );
    }

    if (currentStatus === newStatus) {
      // Same status - no update needed, but return the schedule
      logger.info("Payroll schedule status update skipped - same status", {
        scheduleId: scheduleId.toString(),
        status: newStatus,
      });
      // Determine accountType and entityId from schedule
      const entityId = schedule.companyId || schedule.businessId;
      if (!entityId) {
        throw new Error(
          `CRITICAL: PayrollSchedule has neither companyId nor businessId. Schedule ID: ${scheduleId.toString()}.`
        );
      }
      const scheduleAccountType = schedule.companyId ? AccountType.Company : AccountType.Business;
      // Calculate totals on-the-fly before returning
      const totals = await this.calculatePayrollScheduleTotals(entityId, schedule.month, schedule.year, scheduleAccountType);
      return {
        ...schedule.toObject(),
        ...totals,
      };
    }

    // Update the status
    schedule.status = newStatus as any;
    await schedule.save();

    logger.info("Payroll schedule status updated", {
      scheduleId: scheduleId.toString(),
      previousStatus: currentStatus,
      newStatus,
    });

    // Determine accountType and entityId from schedule
    const entityId = schedule.companyId || schedule.businessId;
    if (!entityId) {
      throw new Error(
        `CRITICAL: PayrollSchedule has neither companyId nor businessId. Schedule ID: ${scheduleId.toString()}.`
      );
    }
    const scheduleAccountType = schedule.companyId ? AccountType.Company : AccountType.Business;

    // Calculate totals on-the-fly before returning
    const totals = await this.calculatePayrollScheduleTotals(entityId, schedule.month, schedule.year, scheduleAccountType);

    return {
      ...schedule.toObject(),
      ...totals,
    };
  }

  /**
   * Delete payroll schedule by ID
   * CRITICAL: Validates scheduleId and fails loudly if invalid
   */
  async deletePayrollSchedule(
    scheduleId: Types.ObjectId
  ): Promise<IPayrollSchedule | null> {
    // CRITICAL: Validate scheduleId
    if (!scheduleId || !Types.ObjectId.isValid(scheduleId)) {
      throw new Error(
        `CRITICAL: Invalid schedule ID provided to deletePayrollSchedule. ` +
        `Schedule ID: ${scheduleId?.toString() || "undefined"}.`
      );
    }

    const schedule = await PayrollSchedule.findByIdAndDelete(scheduleId);
    
    if (schedule) {
      logger.info("Payroll schedule deleted", {
        scheduleId: scheduleId.toString(),
        companyId: schedule.companyId?.toString() || "unknown",
        month: schedule.month,
        year: schedule.year,
      });
    }

    return schedule;
  }
}

export const payrollService = new PayrollService();

