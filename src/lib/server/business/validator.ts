import Joi from "joi";
import { IBusinessOnboarding } from "./interface";
import { utils } from "../utils";
import { MessageResponse } from "../utils/enum";
import { NIGERIAN_STATES, isValidNigerianState } from "../constants/nigeria";
import {
  isValidTIN,
  isValidNigerianPhone,
  isValidVRN,
} from "../utils/nrs-validators";

class BusinessValidator {
  public onboarding(body: IBusinessOnboarding) {
    const schema = Joi.object<IBusinessOnboarding>({
      name: Joi.string().trim().min(2).max(200).required().messages({
        "string.base": "Business name must be text.",
        "string.min": "Business name must be at least 2 characters long.",
        "string.max": "Business name must not exceed 200 characters.",
        "any.required": "Business name is required.",
      }),
      businessRegistrationNumber: Joi.string()
        .trim()
        .max(50)
        .optional()
        .allow("")
        .messages({
          "string.base": "Business registration number must be text.",
          "string.max": "Business registration number must not exceed 50 characters.",
        }),
      tin: Joi.string()
        .trim()
        .max(50)
        .optional()
        .allow("")
        .custom((value, helpers) => {
          if (value && value.trim() !== "") {
            if (!isValidTIN(value)) {
              return helpers.error("string.invalid");
            }
          }
          return value;
        })
        .messages({
          "string.base": "TIN must be text.",
          "string.max": "TIN must not exceed 50 characters.",
          "string.invalid": "TIN format is invalid. TIN must be 10-12 digits.",
        }),
      vatRegistrationNumber: Joi.string()
        .trim()
        .max(50)
        .optional()
        .allow("")
        .custom((value, helpers) => {
          if (value && value.trim() !== "") {
            if (!isValidVRN(value)) {
              return helpers.error("string.invalid");
            }
          }
          return value;
        })
        .messages({
          "string.base": "VAT Registration Number must be text.",
          "string.max": "VAT Registration Number must not exceed 50 characters.",
          "string.invalid": "VAT Registration Number format is invalid. Expected 8-12 digits.",
        }),
      isRegistered: Joi.boolean().optional().messages({
        "boolean.base": "Registration status must be true or false.",
      }),
      address: Joi.string().trim().max(500).optional().allow("").messages({
        "string.base": "Address must be text.",
        "string.max": "Address must not exceed 500 characters.",
      }),
      city: Joi.string().trim().max(100).optional().allow("").messages({
        "string.base": "City must be text.",
        "string.max": "City must not exceed 100 characters.",
      }),
      state: Joi.string()
        .trim()
        .max(100)
        .optional()
        .allow("")
        .custom((value, helpers) => {
          if (value && value.trim() !== "" && !isValidNigerianState(value.trim())) {
            return helpers.error("string.invalid");
          }
          return value;
        })
        .messages({
          "string.base": "State must be text.",
          "string.max": "State must not exceed 100 characters.",
          "string.invalid": `State must be one of: ${NIGERIAN_STATES.join(", ")}`,
        }),
      phoneNumber: Joi.string()
        .trim()
        .max(20)
        .optional()
        .allow("")
        .custom((value, helpers) => {
          if (value && value.trim() !== "") {
            if (!isValidNigerianPhone(value)) {
              return helpers.error("string.invalid");
            }
          }
          return value;
        })
        .messages({
          "string.base": "Phone number must be text.",
          "string.max": "Phone number must not exceed 20 characters.",
          "string.invalid": "Phone number format is invalid. Expected format: 08012345678 or +2348012345678",
        }),
      email: Joi.string().email().optional().allow("").messages({
        "string.base": "Email must be text.",
        "string.email": "Invalid email format.",
      }),
      website: Joi.string().trim().uri().optional().allow("").messages({
        "string.base": "Website must be text.",
        "string.uri": "Website must be a valid URL.",
      }),
      businessType: Joi.string().trim().max(100).optional().allow("").messages({
        "string.base": "Business type must be text.",
        "string.max": "Business type must not exceed 100 characters.",
      }),
      fixedAssets: Joi.number().min(0).optional().messages({
        "number.base": "Fixed assets must be a number.",
        "number.min": "Fixed assets cannot be negative.",
      }),
      privacyConsentGiven: Joi.boolean().optional().messages({
        "boolean.base": "Privacy consent must be true or false.",
      }),
      privacyPolicyVersion: Joi.string().trim().max(20).optional().allow("").messages({
        "string.base": "Privacy policy version must be text.",
        "string.max": "Privacy policy version must not exceed 20 characters.",
      }),
    });

    const { error } = schema.validate(body, {
      abortEarly: false,
    });

    const validationErrors: string[] = [];
    
    if (error) {
      validationErrors.push(...error.details.map(d => d.message));
    }

    if (validationErrors.length > 0) {
      return {
        valid: false,
        response: utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: validationErrors[0],
          data: {
            errors: validationErrors,
          },
        }),
      };
    }

    return {
      valid: true,
    };
  }

  public update(body: Partial<IBusinessOnboarding>) {
    const schema = Joi.object<Partial<IBusinessOnboarding>>({
      name: Joi.string().trim().min(2).max(200).optional().messages({
        "string.base": "Business name must be text.",
        "string.min": "Business name must be at least 2 characters long.",
        "string.max": "Business name must not exceed 200 characters.",
      }),
      businessRegistrationNumber: Joi.string()
        .trim()
        .max(50)
        .optional()
        .allow("")
        .messages({
          "string.base": "Business registration number must be text.",
          "string.max": "Business registration number must not exceed 50 characters.",
        }),
      tin: Joi.string()
        .trim()
        .max(50)
        .optional()
        .allow("")
        .custom((value, helpers) => {
          if (value && value.trim() !== "") {
            if (!isValidTIN(value)) {
              return helpers.error("string.invalid");
            }
          }
          return value;
        })
        .messages({
          "string.base": "TIN must be text.",
          "string.max": "TIN must not exceed 50 characters.",
          "string.invalid": "TIN format is invalid. TIN must be 10-12 digits.",
        }),
      vatRegistrationNumber: Joi.string()
        .trim()
        .max(50)
        .optional()
        .allow("")
        .custom((value, helpers) => {
          if (value && value.trim() !== "") {
            if (!isValidVRN(value)) {
              return helpers.error("string.invalid");
            }
          }
          return value;
        })
        .messages({
          "string.base": "VAT Registration Number must be text.",
          "string.max": "VAT Registration Number must not exceed 50 characters.",
          "string.invalid": "VAT Registration Number format is invalid. Expected 8-12 digits.",
        }),
      isRegistered: Joi.boolean().optional().messages({
        "boolean.base": "Registration status must be true or false.",
      }),
      address: Joi.string().trim().max(500).optional().allow("").messages({
        "string.base": "Address must be text.",
        "string.max": "Address must not exceed 500 characters.",
      }),
      city: Joi.string().trim().max(100).optional().allow("").messages({
        "string.base": "City must be text.",
        "string.max": "City must not exceed 100 characters.",
      }),
      state: Joi.string()
        .trim()
        .max(100)
        .optional()
        .allow("")
        .custom((value, helpers) => {
          if (value && value.trim() !== "" && !isValidNigerianState(value.trim())) {
            return helpers.error("string.invalid");
          }
          return value;
        })
        .messages({
          "string.base": "State must be text.",
          "string.max": "State must not exceed 100 characters.",
          "string.invalid": `State must be one of: ${NIGERIAN_STATES.join(", ")}`,
        }),
      phoneNumber: Joi.string()
        .trim()
        .max(20)
        .optional()
        .allow("")
        .custom((value, helpers) => {
          if (value && value.trim() !== "") {
            if (!isValidNigerianPhone(value)) {
              return helpers.error("string.invalid");
            }
          }
          return value;
        })
        .messages({
          "string.base": "Phone number must be text.",
          "string.max": "Phone number must not exceed 20 characters.",
          "string.invalid": "Phone number format is invalid. Expected format: 08012345678 or +2348012345678",
        }),
      email: Joi.string().email().optional().allow("").messages({
        "string.base": "Email must be text.",
        "string.email": "Invalid email format.",
      }),
      website: Joi.string().trim().uri().optional().allow("").messages({
        "string.base": "Website must be text.",
        "string.uri": "Website must be a valid URL.",
      }),
      businessType: Joi.string().trim().max(100).optional().allow("").messages({
        "string.base": "Business type must be text.",
        "string.max": "Business type must not exceed 100 characters.",
      }),
      fixedAssets: Joi.number().min(0).optional().messages({
        "number.base": "Fixed assets must be a number.",
        "number.min": "Fixed assets cannot be negative.",
      }),
      privacyConsentGiven: Joi.boolean().optional().messages({
        "boolean.base": "Privacy consent must be true or false.",
      }),
      privacyPolicyVersion: Joi.string().trim().max(20).optional().allow("").messages({
        "string.base": "Privacy policy version must be text.",
        "string.max": "Privacy policy version must not exceed 20 characters.",
      }),
    });

    const { error } = schema.validate(body, {
      abortEarly: false,
    });

    const validationErrors: string[] = [];
    
    if (error) {
      validationErrors.push(...error.details.map(d => d.message));
    }

    if (validationErrors.length > 0) {
      return {
        valid: false,
        response: utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: validationErrors[0],
          data: {
            errors: validationErrors,
          },
        }),
      };
    }

    return {
      valid: true,
    };
  }
}

export const businessValidator = new BusinessValidator();
