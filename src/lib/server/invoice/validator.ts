import Joi from "joi";
import { ICreateInvoice } from "./interface";
import { utils } from "../utils";
import { MessageResponse, InvoiceStatus } from "../utils/enum";
import { WHTType } from "../tax/calculator";

class InvoiceValidator {
  public createInvoice(body: ICreateInvoice) {
    // CRITICAL: Accept either companyId or businessId (API route handles conversion to companyId)
    // This allows Business accounts to send businessId while Company accounts send companyId
    const schema = Joi.object<ICreateInvoice & { businessId?: string }>({
      companyId: Joi.string().optional().messages({
        "string.base": "Company ID must be text.",
      }),
      businessId: Joi.string().optional().messages({
        "string.base": "Business ID must be text.",
      }),
      customerName: Joi.string().trim().min(2).max(200).required().messages({
        "string.base": "Customer name must be text.",
        "string.min": "Customer name must be at least 2 characters long.",
        "string.max": "Customer name must not exceed 200 characters.",
        "any.required": "Customer name is required.",
      }),
      customerEmail: Joi.string().email().optional().allow("").messages({
        "string.base": "Customer email must be text.",
        "string.email": "Invalid email format.",
      }),
      customerPhone: Joi.string().trim().max(20).optional().allow("").messages({
        "string.base": "Customer phone must be text.",
        "string.max": "Customer phone must not exceed 20 characters.",
      }),
      customerAddress: Joi.string().trim().max(500).optional().allow("").messages({
        "string.base": "Customer address must be text.",
        "string.max": "Customer address must not exceed 500 characters.",
      }),
      customerTIN: Joi.string().trim().max(50).optional().allow("").messages({
        "string.base": "Customer TIN must be text.",
        "string.max": "Customer TIN must not exceed 50 characters.",
      }),
      issueDate: Joi.date()
        .required()
        .min("2026-01-01")
        .messages({
          "date.base": "Issue date must be a valid date.",
          "any.required": "Issue date is required.",
          "date.min": "Issue date must be on or after January 1, 2026. This application only supports invoice dates from 2026 onward per Nigeria Tax Act 2025.",
        }),
      dueDate: Joi.date()
        .optional()
        .allow(null)
        .min("2026-01-01")
        .messages({
          "date.base": "Due date must be a valid date.",
          "date.min": "Due date must be on or after January 1, 2026. This application only supports invoice dates from 2026 onward per Nigeria Tax Act 2025.",
        }),
      items: Joi.array()
        .items(
          Joi.object({
            description: Joi.string().trim().min(1).max(500).required().messages({
              "string.base": "Item description must be text.",
              "string.min": "Item description is required.",
              "string.max": "Item description must not exceed 500 characters.",
              "any.required": "Item description is required.",
            }),
            quantity: Joi.number().min(0.01).required().messages({
              "number.base": "Quantity must be a number.",
              "number.min": "Quantity must be greater than 0.",
              "any.required": "Quantity is required.",
            }),
            unitPrice: Joi.number().min(0).required().messages({
              "number.base": "Unit price must be a number.",
              "number.min": "Unit price cannot be negative.",
              "any.required": "Unit price is required.",
            }),
          })
        )
        .min(1)
        .required()
        .messages({
          "array.base": "Items must be an array.",
          "array.min": "Invoice must have at least one item.",
          "any.required": "Items are required.",
        }),
      notes: Joi.string().trim().max(1000).optional().allow("").messages({
        "string.base": "Notes must be text.",
        "string.max": "Notes must not exceed 1000 characters.",
      }),
      vatCategory: Joi.string().trim().optional().allow("").messages({
        "string.base": "VAT category must be text.",
      }),
      // CRITICAL: VAT exemption flag - if true, invoice is for VAT-exempt goods/services
      // For VAT-registered businesses (≥ ₦25M), this should only be true for exempt categories
      // For small businesses (< ₦25M), this can be true/false (they're not required to charge VAT)
      isVATExempted: Joi.boolean().optional().messages({
        "boolean.base": "VAT exemption flag must be a boolean (true or false).",
      }),
      whtType: Joi.string()
        .valid(...Object.values(WHTType))
        .optional()
        .allow("", null)
        .messages({
          "any.only": `WHT type must be one of: ${Object.values(WHTType).join(", ")}`,
          "string.base": "WHT type must be text.",
        }),
      status: Joi.string()
        .valid(...Object.values(InvoiceStatus))
        .required()
        .custom((value, helpers) => {
          // Prevent creating invoices as "cancelled" - must create first, then cancel if needed
          if (value === InvoiceStatus.Cancelled) {
            return helpers.error("any.invalid", {
              message: "Cannot create invoice as 'cancelled'. Create invoice first, then cancel if needed.",
            });
          }
          return value;
        })
        .messages({
          "any.required": "Invoice status is required. Cannot create invoice without status.",
          "any.only": `Status must be one of: ${Object.values(InvoiceStatus).join(", ")}`,
          "any.invalid": "Cannot create invoice as 'cancelled'. Create invoice first, then cancel if needed.",
          "string.base": "Status must be text.",
        }),
    }).custom((value, helpers) => {
      // CRITICAL: Ensure at least one of companyId or businessId is provided
      if (!value.companyId && !value.businessId) {
        return helpers.error("any.custom", {
          message: "Either Company ID or Business ID is required in request body.",
        });
      }
      return value;
    });

    const { error, value } = schema.validate(body);

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

  public updateInvoice(body: Partial<ICreateInvoice>) {
    // For updates, all fields are optional except we validate what's provided
    const schema = Joi.object<Partial<ICreateInvoice>>({
      companyId: Joi.string().optional().messages({
        "string.base": "Company ID must be text.",
      }),
      customerName: Joi.string().trim().min(2).max(200).optional().messages({
        "string.base": "Customer name must be text.",
        "string.min": "Customer name must be at least 2 characters long.",
        "string.max": "Customer name must not exceed 200 characters.",
      }),
      customerEmail: Joi.string().email().optional().allow("").messages({
        "string.base": "Customer email must be text.",
        "string.email": "Invalid email format.",
      }),
      customerPhone: Joi.string().trim().max(20).optional().allow("").messages({
        "string.base": "Customer phone must be text.",
        "string.max": "Customer phone must not exceed 20 characters.",
      }),
      customerAddress: Joi.string().trim().max(500).optional().allow("").messages({
        "string.base": "Customer address must be text.",
        "string.max": "Customer address must not exceed 500 characters.",
      }),
      customerTIN: Joi.string().trim().max(50).optional().allow("").messages({
        "string.base": "Customer TIN must be text.",
        "string.max": "Customer TIN must not exceed 50 characters.",
      }),
      issueDate: Joi.date()
        .optional()
        .min("2026-01-01")
        .messages({
          "date.base": "Issue date must be a valid date.",
          "date.min": "Issue date must be on or after January 1, 2026. This application only supports invoice dates from 2026 onward per Nigeria Tax Act 2025.",
        }),
      dueDate: Joi.date()
        .optional()
        .allow(null)
        .min("2026-01-01")
        .messages({
          "date.base": "Due date must be a valid date.",
          "date.min": "Due date must be on or after January 1, 2026. This application only supports invoice dates from 2026 onward per Nigeria Tax Act 2025.",
        }),
      items: Joi.array()
        .items(
          Joi.object({
            description: Joi.string().trim().min(1).max(500).required().messages({
              "string.base": "Item description must be text.",
              "string.min": "Item description is required.",
              "string.max": "Item description must not exceed 500 characters.",
              "any.required": "Item description is required.",
            }),
            quantity: Joi.number().min(0.01).required().messages({
              "number.base": "Quantity must be a number.",
              "number.min": "Quantity must be greater than 0.",
              "any.required": "Quantity is required.",
            }),
            unitPrice: Joi.number().min(0).required().messages({
              "number.base": "Unit price must be a number.",
              "number.min": "Unit price cannot be negative.",
              "any.required": "Unit price is required.",
            }),
          })
        )
        .min(1)
        .optional()
        .messages({
          "array.base": "Items must be an array.",
          "array.min": "Invoice must have at least one item.",
        }),
      vatCategory: Joi.string().trim().optional().allow("").messages({
        "string.base": "VAT category must be text.",
      }),
      // CRITICAL: VAT exemption flag - if true, invoice is for VAT-exempt goods/services
      // For VAT-registered businesses (≥ ₦25M), this should only be true for exempt categories
      // For small businesses (< ₦25M), this can be true/false (they're not required to charge VAT)
      isVATExempted: Joi.boolean().optional().messages({
        "boolean.base": "VAT exemption flag must be a boolean (true or false).",
      }),
      whtType: Joi.string()
        .valid(...Object.values(WHTType))
        .optional()
        .allow("", null)
        .messages({
          "any.only": `WHT type must be one of: ${Object.values(WHTType).join(", ")}`,
          "string.base": "WHT type must be text.",
        }),
      notes: Joi.string().trim().max(1000).optional().allow("").messages({
        "string.base": "Notes must be text.",
        "string.max": "Notes must not exceed 1000 characters.",
      }),
      status: Joi.string()
        .valid(...Object.values(InvoiceStatus))
        .optional()
        .messages({
          "any.only": `Status must be one of: ${Object.values(InvoiceStatus).join(", ")}`,
          "string.base": "Status must be text.",
        }),
    });

    const { error } = schema.validate(body);

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

export const invoiceValidator = new InvoiceValidator();





