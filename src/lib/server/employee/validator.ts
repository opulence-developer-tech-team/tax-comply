import Joi from "joi";
import { ICreateEmployee } from "./interface";
import { utils } from "../utils";
import { MessageResponse } from "../utils/enum";

// Nigerian phone number pattern (supports international format with +234 or 0)
const NIGERIAN_PHONE_PATTERN = /^(\+234|0)?[789]\d{9}$/;

// Account number pattern (10 digits)
const ACCOUNT_NUMBER_PATTERN = /^\d{10}$/;

// Nigerian TIN pattern (10-12 digits)
// Reference: NRS (Nigeria Revenue Service) - formerly NRS (https://www.firs.gov.ng/)
// NOTE: NRS was rebranded to NRS (Nigeria Revenue Service) effective January 1, 2026.
// NRS TIN format is consistent for both companies and individuals: 10-12 digits
const TIN_PATTERN = /^\d{10,12}$/;

// Employee ID pattern (alphanumeric with hyphens and underscores)
const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9-_]+$/;

// Name pattern (letters, spaces, hyphens, and apostrophes)
const NAME_PATTERN = /^[A-Za-z\s'-]+$/;

// Account name pattern (letters, spaces, hyphens, and apostrophes)
const ACCOUNT_NAME_PATTERN = /^[A-Za-z\s'-]+$/;

class EmployeeValidator {
  public createEmployee(body: ICreateEmployee) {
    const schema = Joi.object<ICreateEmployee>({
      companyId: Joi.string().optional().allow(null, "").messages({
        "string.base": "Company ID must be text.",
      }),
      businessId: Joi.string().optional().allow(null, "").messages({
        "string.base": "Business ID must be text.",
      }),
      employeeId: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(EMPLOYEE_ID_PATTERN)
        .required()
        .messages({
          "string.base": "Employee ID must be text.",
          "string.min": "Employee ID must be at least 2 characters long.",
          "string.max": "Employee ID must not exceed 50 characters.",
          "string.pattern.base": "Employee ID can only contain letters, numbers, hyphens, and underscores.",
          "any.required": "Employee ID is required.",
        }),
      firstName: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(NAME_PATTERN)
        .required()
        .messages({
          "string.base": "First name must be text.",
          "string.min": "First name must be at least 2 characters long.",
          "string.max": "First name must not exceed 50 characters.",
          "string.pattern.base": "First name can only contain letters, spaces, hyphens, and apostrophes.",
          "any.required": "First name is required.",
        }),
      lastName: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(NAME_PATTERN)
        .required()
        .messages({
          "string.base": "Last name must be text.",
          "string.min": "Last name must be at least 2 characters long.",
          "string.max": "Last name must not exceed 50 characters.",
          "string.pattern.base": "Last name can only contain letters, spaces, hyphens, and apostrophes.",
          "any.required": "Last name is required.",
        }),
      email: Joi.string()
        .trim()
        .email()
        .max(100)
        .optional()
        .allow("")
        .messages({
          "string.base": "Email must be text.",
          "string.email": "Invalid email format.",
          "string.max": "Email must not exceed 100 characters.",
        }),
      phoneNumber: Joi.string()
        .trim()
        .pattern(NIGERIAN_PHONE_PATTERN)
        .optional()
        .allow("")
        .messages({
          "string.base": "Phone number must be text.",
          "string.pattern.base": "Please enter a valid Nigerian phone number (e.g., +2348012345678 or 08012345678).",
        }),
      dateOfBirth: Joi.alternatives()
        .try(
          Joi.date().iso().max("now").allow(null),
          Joi.string().isoDate().allow("", null)
        )
        .optional()
        .custom((value, helpers) => {
          if (!value || value === "") return null;
          const dob = new Date(value);
          if (isNaN(dob.getTime())) {
            return helpers.error("date.base");
          }
          const today = new Date();
          if (dob > today) {
            return helpers.error("date.max");
          }
          const age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          const actualAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) ? age - 1 : age;
          if (actualAge < 16 || actualAge > 100) {
            return helpers.error("date.custom", {
              message: "Employee must be between 16 and 100 years old.",
            });
          }
          return value;
        })
        .messages({
          "date.base": "Date of birth must be a valid date.",
          "date.max": "Date of birth cannot be in the future.",
          "date.custom": "Employee must be between 16 and 100 years old.",
        }),
      dateOfEmployment: Joi.alternatives()
        .try(
          Joi.date().iso().max("now"),
          Joi.string().isoDate()
        )
        .required()
        .custom((value, helpers) => {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return helpers.error("date.base");
          }
          const today = new Date();
          if (date > today) {
            return helpers.error("date.max");
          }
          return value;
        })
        .messages({
          "date.base": "Date of employment must be a valid date.",
          "date.max": "Date of employment cannot be in the future.",
          "any.required": "Date of employment is required.",
        }),
      salary: Joi.number()
        .min(0)
        .precision(2)
        .required()
        .messages({
          "number.base": "Salary must be a valid number.",
          "number.min": "Salary cannot be negative.",
          "number.precision": "Salary can have at most 2 decimal places.",
          "any.required": "Salary is required.",
        }),
      taxIdentificationNumber: Joi.string()
        .trim()
        .pattern(TIN_PATTERN)
        .required()
        .messages({
          "string.base": "Tax Identification Number must be text.",
          "string.pattern.base": "TIN must be 10-12 digits.",
          "any.required": "Tax Identification Number is required.",
        }),
      bankCode: Joi.string()
        .trim()
        .min(2)
        .max(10)
        .optional()
        .allow("")
        .messages({
          "string.base": "Bank code must be text.",
          "string.min": "Bank code must be at least 2 characters.",
          "string.max": "Bank code must not exceed 10 characters.",
        }),
      bankName: Joi.string()
        .trim()
        .max(100)
        .optional()
        .allow("")
        .messages({
          "string.base": "Bank name must be text.",
          "string.max": "Bank name must not exceed 100 characters.",
        }),
      accountNumber: Joi.string()
        .trim()
        .pattern(ACCOUNT_NUMBER_PATTERN)
        .optional()
        .allow("")
        .messages({
          "string.base": "Account number must be text.",
          "string.pattern.base": "Account number must be exactly 10 digits.",
        }),
      accountName: Joi.string()
        .trim()
        .max(100)
        .pattern(ACCOUNT_NAME_PATTERN)
        .optional()
        .allow("")
        .messages({
          "string.base": "Account name must be text.",
          "string.max": "Account name must not exceed 100 characters.",
          "string.pattern.base": "Account name can only contain letters, spaces, hyphens, and apostrophes.",
        }),
      // CRITICAL: isActive must be explicitly provided - no defaults
      isActive: Joi.boolean()
        .required()
        .messages({
          "boolean.base": "isActive must be a boolean value (true or false).",
          "any.required": "isActive is required and must be explicitly provided.",
        }),
      // CRITICAL: Benefit flags - indicates if company provides these statutory benefits for this employee
      // Must be explicitly provided - no defaults
      hasPension: Joi.boolean()
        .required()
        .messages({
          "boolean.base": "Pension benefit flag must be true or false.",
          "any.required": "hasPension is required and must be explicitly provided.",
        }),
      hasNHF: Joi.boolean()
        .required()
        .messages({
          "boolean.base": "NHF benefit flag must be true or false.",
          "any.required": "hasNHF is required and must be explicitly provided.",
        }),
      hasNHIS: Joi.boolean()
        .required()
        .messages({
          "boolean.base": "NHIS benefit flag must be true or false.",
          "any.required": "hasNHIS is required and must be explicitly provided.",
        }),
    })
      .custom((value, helpers) => {
        // CRITICAL: Validate that exactly one of companyId or businessId is provided
        if (!value.companyId && !value.businessId) {
          return helpers.error("any.custom", {
            message: "Either Company ID or Business ID is required.",
          });
        }
        if (value.companyId && value.businessId) {
          return helpers.error("any.custom", {
            message: "Cannot provide both Company ID and Business ID. Provide only one.",
          });
        }
        // If bankCode is provided, accountNumber and accountName are required
        if (value.bankCode && value.bankCode.trim()) {
          if (!value.accountNumber || !value.accountNumber.trim()) {
            return helpers.error("any.custom", {
              message: "Account number is required if bank code is provided.",
            });
          }
          if (!value.accountName || !value.accountName.trim()) {
            return helpers.error("any.custom", {
              message: "Account name is required if bank code is provided.",
            });
          }
        }
        // If accountNumber or accountName is provided without bankCode, it's an error
        if ((value.accountNumber && value.accountNumber.trim()) || (value.accountName && value.accountName.trim())) {
          if (!value.bankCode || !value.bankCode.trim()) {
            return helpers.error("any.custom", {
              message: "Bank code is required if account number or account name is provided.",
            });
          }
        }
        return value;
      })
      .messages({
        "any.custom": "Validation failed.",
      });

    const { error } = schema.validate(body, { abortEarly: false });

    if (!error) {
      return {
        valid: true,
      };
    } else {
      return {
        valid: false,
        response: utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: error.details[0].message,
          data: null,
        }),
      };
    }
  }

  public updateEmployee(body: Partial<ICreateEmployee>) {
    // For updates, all fields are optional except we validate what's provided
    const schema = Joi.object<Partial<ICreateEmployee>>({
      employeeId: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(EMPLOYEE_ID_PATTERN)
        .optional()
        .messages({
          "string.base": "Employee ID must be text.",
          "string.min": "Employee ID must be at least 2 characters long.",
          "string.max": "Employee ID must not exceed 50 characters.",
          "string.pattern.base": "Employee ID can only contain letters, numbers, hyphens, and underscores.",
        }),
      firstName: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(NAME_PATTERN)
        .optional()
        .messages({
          "string.base": "First name must be text.",
          "string.min": "First name must be at least 2 characters long.",
          "string.max": "First name must not exceed 50 characters.",
          "string.pattern.base": "First name can only contain letters, spaces, hyphens, and apostrophes.",
        }),
      lastName: Joi.string()
        .trim()
        .min(2)
        .max(50)
        .pattern(NAME_PATTERN)
        .optional()
        .messages({
          "string.base": "Last name must be text.",
          "string.min": "Last name must be at least 2 characters long.",
          "string.max": "Last name must not exceed 50 characters.",
          "string.pattern.base": "Last name can only contain letters, spaces, hyphens, and apostrophes.",
        }),
      email: Joi.string()
        .trim()
        .email()
        .max(100)
        .optional()
        .allow("")
        .messages({
          "string.base": "Email must be text.",
          "string.email": "Invalid email format.",
          "string.max": "Email must not exceed 100 characters.",
        }),
      phoneNumber: Joi.string()
        .trim()
        .pattern(NIGERIAN_PHONE_PATTERN)
        .optional()
        .allow("")
        .messages({
          "string.base": "Phone number must be text.",
          "string.pattern.base": "Please enter a valid Nigerian phone number (e.g., +2348012345678 or 08012345678).",
        }),
      dateOfBirth: Joi.alternatives()
        .try(
          Joi.date().iso().max("now").allow(null),
          Joi.string().isoDate().allow("", null)
        )
        .optional()
        .custom((value, helpers) => {
          if (!value || value === "") return null;
          const dob = new Date(value);
          if (isNaN(dob.getTime())) {
            return helpers.error("date.base");
          }
          const today = new Date();
          if (dob > today) {
            return helpers.error("date.max");
          }
          const age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          const actualAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) ? age - 1 : age;
          if (actualAge < 16 || actualAge > 100) {
            return helpers.error("date.custom", {
              message: "Employee must be between 16 and 100 years old.",
            });
          }
          return value;
        })
        .messages({
          "date.base": "Date of birth must be a valid date.",
          "date.max": "Date of birth cannot be in the future.",
          "date.custom": "Employee must be between 16 and 100 years old.",
        }),
      dateOfEmployment: Joi.alternatives()
        .try(
          Joi.date().iso().max("now"),
          Joi.string().isoDate()
        )
        .optional()
        .custom((value, helpers) => {
          if (!value) return value;
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return helpers.error("date.base");
          }
          const today = new Date();
          if (date > today) {
            return helpers.error("date.max");
          }
          return value;
        })
        .messages({
          "date.base": "Date of employment must be a valid date.",
          "date.max": "Date of employment cannot be in the future.",
        }),
      salary: Joi.number()
        .min(0)
        .precision(2)
        .optional()
        .messages({
          "number.base": "Salary must be a valid number.",
          "number.min": "Salary cannot be negative.",
          "number.precision": "Salary can have at most 2 decimal places.",
        }),
      taxIdentificationNumber: Joi.string()
        .trim()
        .pattern(TIN_PATTERN)
        .optional()
        .messages({
          "string.base": "Tax Identification Number must be text.",
          "string.pattern.base": "TIN must be 10-12 digits.",
        }),
      bankCode: Joi.string()
        .trim()
        .min(2)
        .max(10)
        .optional()
        .allow("")
        .messages({
          "string.base": "Bank code must be text.",
          "string.min": "Bank code must be at least 2 characters.",
          "string.max": "Bank code must not exceed 10 characters.",
        }),
      bankName: Joi.string()
        .trim()
        .max(100)
        .optional()
        .allow("")
        .messages({
          "string.base": "Bank name must be text.",
          "string.max": "Bank name must not exceed 100 characters.",
        }),
      accountNumber: Joi.string()
        .trim()
        .pattern(ACCOUNT_NUMBER_PATTERN)
        .optional()
        .allow("")
        .messages({
          "string.base": "Account number must be text.",
          "string.pattern.base": "Account number must be exactly 10 digits.",
        }),
      accountName: Joi.string()
        .trim()
        .max(100)
        .pattern(ACCOUNT_NAME_PATTERN)
        .optional()
        .allow("")
        .messages({
          "string.base": "Account name must be text.",
          "string.max": "Account name must not exceed 100 characters.",
          "string.pattern.base": "Account name can only contain letters, spaces, hyphens, and apostrophes.",
        }),
      isActive: Joi.boolean()
        .optional()
        .messages({
          "boolean.base": "isActive must be a boolean value (true or false).",
        }),
      // CRITICAL: Benefit flags - indicates if company provides these statutory benefits for this employee
      // Optional for updates (partial updates allowed), but must be boolean if provided
      hasPension: Joi.boolean()
        .optional()
        .messages({
          "boolean.base": "Pension benefit flag must be true or false.",
        }),
      hasNHF: Joi.boolean()
        .optional()
        .messages({
          "boolean.base": "NHF benefit flag must be true or false.",
        }),
      hasNHIS: Joi.boolean()
        .optional()
        .messages({
          "boolean.base": "NHIS benefit flag must be true or false.",
        }),
      // CRITICAL: Explicitly block companyId and businessId from updates - employee entity is immutable
      companyId: Joi.any().forbidden().messages({
        "any.unknown": "Cannot update employee's companyId. Employee entity is immutable.",
      }),
      businessId: Joi.any().forbidden().messages({
        "any.unknown": "Cannot update employee's businessId. Employee entity is immutable.",
      }),
    })
      .custom((value, helpers) => {
        // CRITICAL: Explicitly reject companyId and businessId if provided (defense in depth)
        if (value.companyId !== undefined) {
          return helpers.error("any.custom", {
            message: "Cannot update employee's companyId. Employee entity is immutable.",
          });
        }
        if (value.businessId !== undefined) {
          return helpers.error("any.custom", {
            message: "Cannot update employee's businessId. Employee entity is immutable.",
          });
        }

        // If bankCode is provided, accountNumber and accountName are required
        if (value.bankCode && value.bankCode.trim()) {
          if (!value.accountNumber || !value.accountNumber.trim()) {
            return helpers.error("any.custom", {
              message: "Account number is required if bank code is provided.",
            });
          }
          if (!value.accountName || !value.accountName.trim()) {
            return helpers.error("any.custom", {
              message: "Account name is required if bank code is provided.",
            });
          }
        }
        // If accountNumber or accountName is provided without bankCode, it's an error
        if ((value.accountNumber && value.accountNumber.trim()) || (value.accountName && value.accountName.trim())) {
          if (!value.bankCode || !value.bankCode.trim()) {
            return helpers.error("any.custom", {
              message: "Bank code is required if account number or account name is provided.",
            });
          }
        }
        return value;
      })
      .messages({
        "any.custom": "Validation failed.",
      });

    const { error } = schema.validate(body, { abortEarly: false });

    if (!error) {
      return {
        valid: true,
      };
    } else {
      return {
        valid: false,
        response: utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: error.details[0].message,
          data: null,
        }),
      };
    }
  }
}

export const employeeValidator = new EmployeeValidator();

