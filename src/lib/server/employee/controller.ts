import { Types } from "mongoose";
import { employeeService } from "./service";
import { ICreateEmployee } from "./interface";
import { utils } from "../utils";
import { MessageResponse, AccountType } from "../utils/enum";
import { logger } from "../utils/logger";
import { bankService } from "../bank/service";

class EmployeeController {
  /**
   * Create a new employee
   * Handles company logic validation (bank verification, etc.)
   */
  public async createEmployee(
    userId: Types.ObjectId,
    entityId: Types.ObjectId,
    employeeData: ICreateEmployee,
    accountType: AccountType
  ) {
    try {
      // APPLICATION LOGIC: Bank verification (not schema validation)
      let bankName: string | undefined = undefined;
      if (employeeData.bankCode && employeeData.bankCode.trim()) {
        const trimmedBankCode = String(employeeData.bankCode).trim();

        // Validate bankCode exists in our constants (company logic)
        const bank = await bankService.getBankByCode(trimmedBankCode);
        if (!bank) {
          return utils.customResponse({
            status: 400,
            message: MessageResponse.Error,
            description: `Invalid bank code "${trimmedBankCode}". Bank code does not exist in our system.`,
            data: null,
          });
        }

        // If bankName is provided, validate it matches the bankCode (security check)
        if (employeeData.bankName && employeeData.bankName.trim()) {
          const trimmedBankName = String(employeeData.bankName).trim();
          const normalizedBankName = trimmedBankName.toLowerCase().trim();
          const normalizedExpectedName = bank.name.toLowerCase().trim();
          
          if (normalizedBankName !== normalizedExpectedName) {
            return utils.customResponse({
              status: 400,
              message: MessageResponse.Error,
              description: `Bank name "${trimmedBankName}" does not match bank code "${trimmedBankCode}" (expected: "${bank.name}"). This suggests data manipulation or user error.`,
              data: null,
            });
          }
          bankName = trimmedBankName;
        } else {
          // bankName not provided - use the name from our constants
          bankName = bank.name;
        }
      }

      // CRITICAL: Validate bankName is set if bankCode is provided (fail loudly)
      if (employeeData.bankCode && String(employeeData.bankCode).trim() && !bankName) {
        throw new Error("CRITICAL: bankName must be set when bankCode is provided");
      }

      // Prepare employee data for service (schema validation already done by validator)
      const dataToSave: ICreateEmployee = {
        employeeId: String(employeeData.employeeId).trim(),
        firstName: String(employeeData.firstName).trim(),
        lastName: String(employeeData.lastName).trim(),
        dateOfEmployment: employeeData.dateOfEmployment instanceof Date 
          ? employeeData.dateOfEmployment 
          : new Date(employeeData.dateOfEmployment),
        salary: typeof employeeData.salary === "string" 
          ? parseFloat(employeeData.salary) 
          : Number(employeeData.salary),
        email: employeeData.email && String(employeeData.email).trim() 
          ? String(employeeData.email).trim().toLowerCase() 
          : "",
        phoneNumber: employeeData.phoneNumber && String(employeeData.phoneNumber).trim() 
          ? String(employeeData.phoneNumber).trim().replace(/\s+/g, "") 
          : "",
        dateOfBirth: employeeData.dateOfBirth 
          ? (employeeData.dateOfBirth instanceof Date 
              ? employeeData.dateOfBirth 
              : new Date(employeeData.dateOfBirth))
          : undefined,
        taxIdentificationNumber: employeeData.taxIdentificationNumber && String(employeeData.taxIdentificationNumber).trim() 
          ? String(employeeData.taxIdentificationNumber).trim().replace(/\s+/g, "") 
          : "",
        bankCode: employeeData.bankCode && String(employeeData.bankCode).trim() 
          ? String(employeeData.bankCode).trim() 
          : "",
        // CRITICAL: bankName is set above from bank service when bankCode is provided (validated above)
        // If bankCode is not provided, bankName should be empty string (no fallback - explicit)
        bankName: bankName || "",
        accountNumber: employeeData.accountNumber && String(employeeData.accountNumber).trim() 
          ? String(employeeData.accountNumber).trim().replace(/\s+/g, "") 
          : "",
        accountName: employeeData.accountName && String(employeeData.accountName).trim() 
          ? String(employeeData.accountName).trim() 
          : "",
        // CRITICAL: isActive must be explicitly provided - no defaults
        // CRITICAL: Benefit flags must be explicitly provided - no defaults
        isActive: employeeData.isActive,
        hasPension: employeeData.hasPension,
        hasNHF: employeeData.hasNHF,
        hasNHIS: employeeData.hasNHIS,
      };

      // Set companyId or businessId based on accountType
      if (accountType === AccountType.Company) {
        dataToSave.companyId = entityId;
        dataToSave.businessId = undefined;
      } else if (accountType === AccountType.Business) {
        dataToSave.businessId = entityId;
        dataToSave.companyId = undefined;
      }

      const employee = await employeeService.createEmployee(dataToSave);

      const createdEntityId = employee.companyId || employee.businessId;
      logger.info("Employee created", {
        employeeId: employee._id?.toString(),
        entityId: createdEntityId?.toString(),
        accountType,
        userId: userId.toString(),
      });

      return utils.customResponse({
        status: 201,
        message: MessageResponse.Success,
        description: "Employee created successfully",
        data: employee,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error creating employee", err, {
        userId: userId.toString(),
        entityId: entityId.toString(),
        accountType,
      });

      if (err.message && err.message.includes("already exists")) {
        return utils.customResponse({
          status: 409,
          message: MessageResponse.Error,
          description: err.message,
          data: null,
        });
      }

      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to create employee",
        data: null,
      });
    }
  }

  /**
   * Update an existing employee
   * Handles company logic validation (bank verification, etc.)
   */
  public async updateEmployee(
    userId: Types.ObjectId,
    employeeId: Types.ObjectId,
    updateData: Partial<ICreateEmployee>
  ) {
    try {
      // APPLICATION LOGIC: Bank verification (not schema validation)
      let bankName: string | undefined = undefined;
      if (updateData.bankCode && updateData.bankCode.trim()) {
        const trimmedBankCode = String(updateData.bankCode).trim();

        // Validate bankCode exists in our constants (company logic)
        const bank = await bankService.getBankByCode(trimmedBankCode);
        if (!bank) {
          return utils.customResponse({
            status: 400,
            message: MessageResponse.Error,
            description: `Invalid bank code "${trimmedBankCode}". Bank code does not exist in our system.`,
            data: null,
          });
        }

        // Auto-populate bankName from bankCode
        bankName = bank.name;

        // CRITICAL SECURITY: If both bankCode and bankName are provided, validate they match
        if (updateData.bankName && updateData.bankName.trim().toLowerCase() !== bankName.toLowerCase()) {
          return utils.customResponse({
            status: 400,
            message: MessageResponse.Error,
            description: `Bank name "${updateData.bankName}" does not match bank code "${trimmedBankCode}" (expected: "${bank.name}"). This suggests data manipulation or user error.`,
            data: null,
          });
        }

        // CRITICAL: Validate accountNumber and accountName exist (validator ensures this, but fail loudly if missing)
        if (!updateData.accountNumber || !updateData.accountNumber.trim()) {
          throw new Error("CRITICAL: accountNumber is required when bankCode is provided");
        }
        if (!updateData.accountName || !updateData.accountName.trim()) {
          throw new Error("CRITICAL: accountName is required when bankCode is provided");
        }

        // Re-verify account name with Monnify to ensure it's still valid (company logic)
        const trimmedAccountNumber = String(updateData.accountNumber).trim().replace(/\s+/g, "");
        const trimmedAccountName = String(updateData.accountName).trim();
        const verificationResult = await bankService.verifyAccountNumber(trimmedAccountNumber, trimmedBankCode);
        if (!verificationResult.valid || verificationResult.accountName?.toLowerCase() !== trimmedAccountName.toLowerCase()) {
          return utils.customResponse({
            status: 400,
            message: MessageResponse.Error,
            description: "Bank account verification failed or account name mismatch",
            data: null,
          });
        }
      }

      // CRITICAL: Validate bankName is set if bankCode is provided (fail loudly)
      if (updateData.bankCode && String(updateData.bankCode).trim() && !bankName) {
        throw new Error("CRITICAL: bankName must be set when bankCode is provided");
      }

      // CRITICAL: Prepare update data - only include fields that are actually provided (partial update)
      // DO NOT convert undefined to strings/numbers - that would corrupt the database!
      const dataToUpdate: any = {};

      // Only include fields that are explicitly provided in updateData
      if (updateData.firstName !== undefined) {
        dataToUpdate.firstName = String(updateData.firstName).trim();
      }
      if (updateData.lastName !== undefined) {
        dataToUpdate.lastName = String(updateData.lastName).trim();
      }
      if (updateData.dateOfEmployment !== undefined) {
        dataToUpdate.dateOfEmployment = updateData.dateOfEmployment instanceof Date
          ? updateData.dateOfEmployment
          : new Date(updateData.dateOfEmployment);
      }
      if (updateData.salary !== undefined) {
        dataToUpdate.salary = typeof updateData.salary === "string" 
          ? parseFloat(updateData.salary) 
          : Number(updateData.salary);
      }
      if (updateData.email !== undefined) {
        dataToUpdate.email = updateData.email ? String(updateData.email).trim().toLowerCase() : "";
      }
      if (updateData.phoneNumber !== undefined) {
        dataToUpdate.phoneNumber = updateData.phoneNumber ? String(updateData.phoneNumber).trim().replace(/\s+/g, "") : "";
      }
      if (updateData.dateOfBirth !== undefined) {
        dataToUpdate.dateOfBirth = updateData.dateOfBirth
          ? (updateData.dateOfBirth instanceof Date 
              ? updateData.dateOfBirth 
              : new Date(updateData.dateOfBirth))
          : null;
      }
      if (updateData.taxIdentificationNumber !== undefined) {
        dataToUpdate.taxIdentificationNumber = updateData.taxIdentificationNumber
          ? String(updateData.taxIdentificationNumber).trim().replace(/\s+/g, "")
          : "";
      }
      // CRITICAL: Bank details - only include if bankCode is provided AND non-empty (all or nothing)
      // Check if bankCode is truthy (not undefined, not null, not empty string)
      // bankName is only set above (line 186) if bankCode is truthy, so this check ensures consistency
      if (updateData.bankCode !== undefined && updateData.bankCode && String(updateData.bankCode).trim()) {
        // bankName is validated and set above if bankCode is provided (lines 171-186)
        // accountNumber and accountName are validated above (lines 198-206) - they MUST exist
        if (!bankName) {
          // CRITICAL: This should never happen - bankName should be set above if bankCode is truthy
          throw new Error("CRITICAL: bankCode provided but bankName is not set");
        }
        dataToUpdate.bankCode = String(updateData.bankCode).trim();
        dataToUpdate.bankName = bankName;
        // CRITICAL: accountNumber and accountName are validated to exist above, use them directly (no fallback)
        dataToUpdate.accountNumber = String(updateData.accountNumber!).trim().replace(/\s+/g, "");
        dataToUpdate.accountName = String(updateData.accountName!).trim();
      }
      // If bankCode is undefined, null, or empty string, don't include bank fields (partial update)
      if (updateData.employeeId !== undefined) {
        dataToUpdate.employeeId = String(updateData.employeeId).trim();
      }

      // Add isActive if provided
      if (updateData.isActive !== undefined) {
        dataToUpdate.isActive = updateData.isActive;
      }

      // CRITICAL: Benefit flags - must be explicitly provided for updates (validation ensures this)
      if (updateData.hasPension !== undefined) {
        dataToUpdate.hasPension = Boolean(updateData.hasPension);
      }
      if (updateData.hasNHF !== undefined) {
        dataToUpdate.hasNHF = Boolean(updateData.hasNHF);
      }
      if (updateData.hasNHIS !== undefined) {
        dataToUpdate.hasNHIS = Boolean(updateData.hasNHIS);
      }

      const updatedEmployee = await employeeService.updateEmployee(employeeId, dataToUpdate);

      if (!updatedEmployee) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Employee not found",
          data: null,
        });
      }

      logger.info("Employee updated", {
        employeeId: employeeId.toString(),
        userId: userId.toString(),
      });

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Employee updated successfully",
        data: updatedEmployee,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error updating employee", err, {
        userId: userId.toString(),
        employeeId: employeeId.toString(),
      });

      if (err.message?.includes("already exists")) {
        return utils.customResponse({
          status: 409,
          message: MessageResponse.Error,
          description: err.message,
          data: null,
        });
      }

      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "An error occurred while updating the employee",
        data: null,
      });
    }
  }

  /**
   * Get employee by ID
   */
  public async getEmployee(employeeId: Types.ObjectId) {
    try {
      const employee = await employeeService.getEmployeeById(employeeId);

      if (!employee) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Employee not found",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Employee retrieved successfully",
        data: employee,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error fetching employee", err, {
        employeeId: employeeId.toString(),
      });

      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to fetch employee",
        data: null,
      });
    }
  }

  /**
   * Delete employee
   */
  public async deleteEmployee(employeeId: Types.ObjectId, companyId: Types.ObjectId, userId: Types.ObjectId) {
    try {
      const deleted = await employeeService.deleteEmployee(employeeId);

      if (!deleted) {
        return utils.customResponse({
          status: 404,
          message: MessageResponse.Error,
          description: "Employee not found",
          data: null,
        });
      }

      logger.info("Employee deleted", {
        employeeId: employeeId.toString(),
        entityId: companyId.toString(),
        userId: userId.toString(),
      });

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Employee deleted successfully",
        data: null,
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error deleting employee", err, {
        employeeId: employeeId.toString(),
        entityId: companyId.toString(),
        userId: userId.toString(),
      });

      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "An error occurred while deleting the employee",
        data: null,
      });
    }
  }
}

export const employeeController = new EmployeeController();












