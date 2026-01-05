import Joi from "joi";
import { utils } from "../utils";
import { MessageResponse } from "../utils/enum";

import { AccountType } from "../utils/enum";

interface ICreateIncome {
  accountId: string;
  entityType: AccountType;
  taxYear: number;
  month?: number | null;
  annualIncome: number;
}

class IncomeValidator {
  public createIncome(body: ICreateIncome) {
    const schema = Joi.object<ICreateIncome>({
      accountId: Joi.string()
        .required()
        .messages({
          "string.base": "Account ID must be text.",
          "any.required": "Account ID is required.",
        }),
      entityType: Joi.string()
        .valid("individual", "company")
        .required()
        .messages({
          "string.base": "Entity type must be text.",
          "any.only": "Entity type must be either 'individual' or 'company'.",
          "any.required": "Entity type is required.",
        }),
      taxYear: Joi.number()
        .integer()
        .min(2026) // CRITICAL: This app only supports tax years 2026 and onward per Nigeria Tax Act 2025
        .max(2100)
        .required()
        .messages({
          "number.base": "Tax year must be a number.",
          "number.integer": "Tax year must be an integer.",
          "number.min": "Tax year must be at least 2026. This application only supports tax years 2026 and onward per Nigeria Tax Act 2025.",
          "number.max": "Tax year must not exceed 2100.",
          "any.required": "Tax year is required.",
        }),
      month: Joi.number()
        .integer()
        .min(1)
        .max(12)
        .optional()
        .allow(null)
        .messages({
          "number.base": "Month must be a number.",
          "number.integer": "Month must be an integer.",
          "number.min": "Month must be between 1 and 12.",
          "number.max": "Month must be between 1 and 12.",
        }),
      annualIncome: Joi.number()
        .min(0)
        .required()
        .messages({
          "number.base": "Annual income must be a number.",
          "number.min": "Annual income must be greater than or equal to 0.",
          "any.required": "Annual income is required.",
        }),
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

export const incomeValidator = new IncomeValidator();












