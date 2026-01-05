import Joi from "joi";
import { utils } from "../utils";
import { MessageResponse } from "../utils/enum";

interface IContactForm {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  subject: string;
  message: string;
}

class ContactValidator {
  public contactForm(body: IContactForm) {
    const schema = Joi.object<IContactForm>({
      name: Joi.string()
        .trim()
        .min(2)
        .max(200)
        .required()
        .messages({
          "string.base": "Name must be text.",
          "string.min": "Name must be at least 2 characters long.",
          "string.max": "Name must not exceed 200 characters.",
          "any.required": "Name is required.",
        }),
      email: Joi.string()
        .trim()
        .email()
        .max(255)
        .required()
        .messages({
          "string.base": "Email must be text.",
          "string.email": "Invalid email address.",
          "string.max": "Email must not exceed 255 characters.",
          "any.required": "Email is required.",
        }),
      company: Joi.string()
        .trim()
        .max(200)
        .optional()
        .allow("")
        .messages({
          "string.base": "Company must be text.",
          "string.max": "Company must not exceed 200 characters.",
        }),
      phone: Joi.string()
        .trim()
        .max(20)
        .optional()
        .allow("")
        .messages({
          "string.base": "Phone must be text.",
          "string.max": "Phone must not exceed 20 characters.",
        }),
      subject: Joi.string()
        .trim()
        .min(3)
        .max(200)
        .required()
        .messages({
          "string.base": "Subject must be text.",
          "string.min": "Subject must be at least 3 characters long.",
          "string.max": "Subject must not exceed 200 characters.",
          "any.required": "Subject is required.",
        }),
      message: Joi.string()
        .trim()
        .min(10)
        .max(5000)
        .required()
        .messages({
          "string.base": "Message must be text.",
          "string.min": "Message must be at least 10 characters long.",
          "string.max": "Message must not exceed 5000 characters.",
          "any.required": "Message is required.",
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

export const contactValidator = new ContactValidator();













