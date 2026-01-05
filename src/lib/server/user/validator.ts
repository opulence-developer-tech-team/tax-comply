import Joi from "joi";
import { IUserSignUp, IUserSignIn } from "./interface";
import { utils } from "../utils";
import { MessageResponse } from "../utils/enum";

class UserValidator {
  public signUp(body: IUserSignUp) {
    const schema = Joi.object<IUserSignUp>({
      email: Joi.string().email().required().messages({
        "string.base": "Email must be text.",
        "string.email": "Invalid email format.",
        "any.required": "Email is required.",
      }),
      password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
          "string.base": "Password must be text.",
          "string.min": "Password must be at least 8 characters long.",
          "string.pattern.base":
            "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
          "any.required": "Password is required.",
        }),
      firstName: Joi.string().trim().min(2).max(50).required().messages({
        "string.base": "First name must be text.",
        "string.min": "First name must be at least 2 characters long.",
        "string.max": "First name must not exceed 50 characters.",
        "any.required": "First name is required.",
      }),
      lastName: Joi.string().trim().min(2).max(50).required().messages({
        "string.base": "Last name must be text.",
        "string.min": "Last name must be at least 2 characters long.",
        "string.max": "Last name must not exceed 50 characters.",
        "any.required": "Last name is required.",
      }),
      phoneNumber: Joi.string().trim().optional().allow("").messages({
        "string.base": "Phone number must be text.",
      }),
      accountType: Joi.string().valid("company", "individual", "business").optional().messages({
        "any.only": "Account type must be either 'company', 'individual', or 'business'.",
      }),
      referralId: Joi.string().trim().optional().allow("").messages({
        "string.base": "Referral ID must be text.",
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


  public changePassword(body: any) {
    const schema = Joi.object({
      currentPassword: Joi.string().required().messages({
        "string.base": "Current password must be text.",
        "any.required": "Current password is required.",
      }),
      newPassword: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
          "string.base": "New password must be text.",
          "string.min": "New password must be at least 8 characters long.",
          "string.pattern.base":
            "New password must contain at least one uppercase letter, one lowercase letter, and one number.",
          "any.required": "New password is required.",
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

  public signIn(body: IUserSignIn) {
    const schema = Joi.object<IUserSignIn>({
      email: Joi.string().email().required().messages({
        "string.base": "Email must be text.",
        "string.email": "Invalid email format.",
        "any.required": "Email is required.",
      }),
      password: Joi.string().required().messages({
        "string.base": "Password must be text.",
        "any.required": "Password is required.",
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

export const userValidator = new UserValidator();





