import { Types } from "mongoose";
import Employee from "./entity";
import { IEmployee, ICreateEmployee } from "./interface";
import { logger } from "../utils/logger";
import { SortOrder } from "../utils/sort-order";
import { EmployeeSortField } from "../utils/employee-sort-field";
import { payrollService } from "../payroll/service";
import { AccountType } from "../utils/enum";

class EmployeeService {
  async createEmployee(employeeData: ICreateEmployee): Promise<IEmployee> {
    // CRITICAL: Validate that exactly one of companyId or businessId is provided
    if (!employeeData.companyId && !employeeData.businessId) {
      throw new Error("CRITICAL: Either companyId or businessId must be provided for Employee");
    }
    if (employeeData.companyId && employeeData.businessId) {
      throw new Error("CRITICAL: Employee cannot have both companyId and businessId");
    }

    // Build query filter for duplicate check based on which ID is provided
    // CRITICAL: Use null instead of { $exists: false } because schema has default: null
    const duplicateQueryFilter: any = {
      employeeId: employeeData.employeeId,
    };
    if (employeeData.companyId) {
      duplicateQueryFilter.companyId = employeeData.companyId;
      duplicateQueryFilter.businessId = null;
    } else if (employeeData.businessId) {
      duplicateQueryFilter.businessId = employeeData.businessId;
      duplicateQueryFilter.companyId = null;
    }

    const existing = await Employee.findOne(duplicateQueryFilter);

    if (existing) {
      // CRITICAL: Use AccountType enum values instead of string literals
      const entityType = employeeData.companyId ? AccountType.Company : AccountType.Business;
      throw new Error(`Employee ID already exists for this ${entityType}`);
    }

    // CRITICAL: isActive must be explicitly provided - no defaults
    if (employeeData.isActive === undefined) {
      throw new Error("CRITICAL: isActive is required and must be explicitly provided");
    }

    logger.info("Creating employee in database", {
      employeeId: employeeData.employeeId,
      companyId: employeeData.companyId?.toString(),
      businessId: employeeData.businessId?.toString(),
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      isActive: employeeData.isActive,
    });

    const employee = new Employee(employeeData);

    await employee.save();

    logger.info("Employee saved to database", {
      employeeId: employee._id.toString(),
      savedCompanyId: employee.companyId?.toString(),
      savedBusinessId: employee.businessId?.toString(),
      employeeIdField: employee.employeeId,
    });

    const entityId = employeeData.companyId || employeeData.businessId;
    // CRITICAL: Use AccountType enum instead of string literals
    const accountType = employeeData.companyId ? AccountType.Company : AccountType.Business;
    logger.info("Employee created successfully", {
      employeeId: employee._id.toString(),
      entityId: entityId?.toString(),
      accountType,
    });

    return employee;
  }

  async getEmployeeById(employeeId: Types.ObjectId): Promise<IEmployee | null> {
    return await Employee.findById(employeeId);
  }

  async getCompanyEmployees(
    companyId: Types.ObjectId,
    accountType: AccountType,
    filters: {
      isActive?: boolean;
      search?: string;
      page: number;
      limit: number;
      sortBy: EmployeeSortField;
      sortOrder: SortOrder;
    }
  ): Promise<{ employees: IEmployee[]; total: number; page: number; limit: number; pages: number }> {
    // CRITICAL: Validate accountType is provided
    if (!accountType || (accountType !== AccountType.Company && accountType !== AccountType.Business)) {
      throw new Error(`CRITICAL: accountType is required and must be AccountType.Company or AccountType.Business. Received: ${accountType || "undefined"}`);
    }

    // CRITICAL: Validate pagination parameters - fail loudly if invalid
    if (!Number.isInteger(filters.page) || filters.page < 1) {
      throw new Error(`CRITICAL: page must be a positive integer. Received: ${filters.page}`);
    }
    if (!Number.isInteger(filters.limit) || filters.limit < 1 || filters.limit > 100) {
      throw new Error(`CRITICAL: limit must be an integer between 1 and 100. Received: ${filters.limit}`);
    }

    // CRITICAL: Validate sortBy is a valid enum value
    if (!Object.values(EmployeeSortField).includes(filters.sortBy)) {
      throw new Error(`CRITICAL: sortBy must be a valid EmployeeSortField enum value. Received: ${filters.sortBy}`);
    }

    // CRITICAL: Validate sortOrder is a valid enum value
    if (!Object.values(SortOrder).includes(filters.sortOrder)) {
      throw new Error(`CRITICAL: sortOrder must be a valid SortOrder enum value. Received: ${filters.sortOrder}`);
    }

    // Build query filter based on accountType
    const query: any = {};
    if (accountType === AccountType.Company) {
      query.companyId = companyId;
      // CRITICAL: businessId might be null (due to default: null in schema) or not exist
      // Use $in: [null] to match both null and non-existent fields
      query.businessId = null;
    } else if (accountType === AccountType.Business) {
      query.businessId = companyId;
      // CRITICAL: companyId might be null (due to default: null in schema) or not exist
      // Use $in: [null] to match both null and non-existent fields
      query.companyId = null;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    // Server-side search across firstName, lastName, employeeId, email
    if (filters.search && filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), "i");
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { employeeId: searchRegex },
        { email: searchRegex },
      ];
    }

    logger.info("Querying employees with filter", {
      accountType,
      companyId: companyId.toString(),
      query: JSON.stringify(query, null, 2),
      filters,
    });

    // Get total count with search filters
    const total = await Employee.countDocuments(query);

    logger.info("Employee count query result", {
      accountType,
      companyId: companyId.toString(),
      total,
      query: JSON.stringify(query, null, 2),
    });

    // Pagination calculations - parameters are already validated above
    const page = filters.page;
    const limit = filters.limit;
    const skip = (page - 1) * limit;
    // CRITICAL: Calculate pages explicitly - ensure minimum of 1 page even if total is 0 (empty result set still shows page 1)
    const calculatedPages = Math.ceil(total / limit);
    const pages = calculatedPages === 0 ? 1 : calculatedPages;

    // Sorting - parameters are already validated above
    const sortOptions: any = {};
    sortOptions[filters.sortBy] = filters.sortOrder === SortOrder.Asc ? 1 : -1;

    const employees = await Employee.find(query)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .lean();

    logger.info("Employees query completed", {
      accountType,
      companyId: companyId.toString(),
      total,
      returnedCount: employees.length,
      page,
      limit,
      pages,
      sampleEmployeeIds: employees.slice(0, 3).map((emp: any) => ({
        _id: emp._id?.toString(),
        employeeId: emp.employeeId,
        companyId: emp.companyId?.toString(),
        businessId: emp.businessId?.toString(),
        firstName: emp.firstName,
        lastName: emp.lastName,
        isActive: emp.isActive,
      })),
    });

    return { employees, total, page, limit, pages };
  }

  async updateEmployee(
    employeeId: Types.ObjectId,
    updateData: Partial<ICreateEmployee>
  ): Promise<IEmployee | null> {
    // Get existing employee to check for duplicates and determine accountType
    const oldEmployee = await Employee.findById(employeeId);
    if (!oldEmployee) {
      throw new Error(`CRITICAL: Employee not found. Employee ID: ${employeeId.toString()}.`);
    }

    // Determine accountType and entityId from existing employee
    const entityId = oldEmployee.companyId || oldEmployee.businessId;
    if (!entityId) {
      throw new Error(
        `CRITICAL: Existing employee has neither companyId nor businessId. Employee ID: ${employeeId.toString()}.`
      );
    }
    const accountType = oldEmployee.companyId ? AccountType.Company : AccountType.Business;

    if (updateData.employeeId) {
      // Build duplicate query filter based on accountType
      // CRITICAL: Use null instead of { $exists: false } because schema has default: null
      const duplicateQueryFilter: any = {
        employeeId: updateData.employeeId,
        _id: { $ne: employeeId },
      };
      if (accountType === AccountType.Company) {
        duplicateQueryFilter.companyId = entityId;
        duplicateQueryFilter.businessId = null;
      } else if (accountType === AccountType.Business) {
        duplicateQueryFilter.businessId = entityId;
        duplicateQueryFilter.companyId = null;
      }

      const existing = await Employee.findOne(duplicateQueryFilter);

      if (existing) {
        // CRITICAL: Use AccountType enum value instead of string literal
        throw new Error(`Employee ID already exists for this ${accountType}`);
      }
    }

    // CRITICAL: companyId and businessId should NEVER be updated - employee's entity (company/business) is immutable
    // Explicitly exclude them from updateData as a security measure
    const { companyId, businessId, ...safeUpdateData } = updateData;
    if (companyId !== undefined || businessId !== undefined) {
      throw new Error("CRITICAL: Cannot update employee's companyId or businessId. Employee entity is immutable.");
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      employeeId,
      safeUpdateData,
      { new: true, runValidators: true }
    );

    // CRITICAL: Recalculate draft payrolls if salary OR benefit flags changed
    // Benefit flags affect payroll calculations (pension, NHF, NHIS contributions)
    if (updatedEmployee && oldEmployee) {
      const salaryChanged = updatedEmployee.salary !== oldEmployee.salary;
      const pensionChanged = updatedEmployee.hasPension !== oldEmployee.hasPension;
      const nhfChanged = updatedEmployee.hasNHF !== oldEmployee.hasNHF;
      const nhisChanged = updatedEmployee.hasNHIS !== oldEmployee.hasNHIS;

      if (salaryChanged || pensionChanged || nhfChanged || nhisChanged) {
        try {
          await payrollService.recalculateDraftPayrollsForEmployee(
            updatedEmployee._id!,
            updatedEmployee.salary,
            entityId,
            accountType
          );
          logger.info("Draft payrolls recalculated due to employee data change", {
            employeeId: updatedEmployee._id?.toString(),
            entityId: entityId.toString(),
            accountType,
            oldSalary: oldEmployee.salary,
            newSalary: updatedEmployee.salary,
            salaryChanged,
            oldPension: oldEmployee.hasPension,
            newPension: updatedEmployee.hasPension,
            pensionChanged,
            oldNHF: oldEmployee.hasNHF,
            newNHF: updatedEmployee.hasNHF,
            nhfChanged,
            oldNHIS: oldEmployee.hasNHIS,
            newNHIS: updatedEmployee.hasNHIS,
            nhisChanged,
          });
        } catch (error: any) {
          logger.error("Error recalculating draft payrolls after employee update", error, {
            employeeId: updatedEmployee._id?.toString(),
            entityId: entityId.toString(),
            accountType,
            errorMessage: error?.message,
            salaryChanged,
            pensionChanged,
            nhfChanged,
            nhisChanged,
          });
          // Log error but don't block employee update
        }
      }
    }

    return updatedEmployee;
  }

  async deactivateEmployee(employeeId: Types.ObjectId): Promise<IEmployee | null> {
    return await Employee.findByIdAndUpdate(
      employeeId,
      { isActive: false },
      { new: true }
    );
  }

  async activateEmployee(employeeId: Types.ObjectId): Promise<IEmployee | null> {
    return await Employee.findByIdAndUpdate(
      employeeId,
      { isActive: true },
      { new: true }
    );
  }

  async deleteEmployee(employeeId: Types.ObjectId): Promise<boolean> {
    const result = await Employee.findByIdAndDelete(employeeId);
    return !!result;
  }
}

export const employeeService = new EmployeeService();









