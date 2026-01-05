import Joi from "joi";
import { ICreateReview, IUpdateReview } from "./interface";

class ReviewValidator {
  public createReview(body: ICreateReview) {
    const schema = Joi.object({
      rating: Joi.number().integer().min(1).max(5).required().messages({
        "number.base": "Rating must be a number",
        "number.integer": "Rating must be a whole number",
        "number.min": "Rating must be at least 1",
        "number.max": "Rating must be at most 5",
        "any.required": "Rating is required",
      }),
      title: Joi.string().trim().min(3).max(200).required().messages({
        "string.base": "Title must be a string",
        "string.empty": "Title cannot be empty",
        "string.min": "Title must be at least 3 characters",
        "string.max": "Title must be at most 200 characters",
        "any.required": "Title is required",
      }),
      content: Joi.string().trim().min(10).max(2000).required().messages({
        "string.base": "Content must be a string",
        "string.empty": "Content cannot be empty",
        "string.min": "Content must be at least 10 characters",
        "string.max": "Content must be at most 2000 characters",
        "any.required": "Content is required",
      }),
    });

    return schema.validate(body, { abortEarly: false });
  }

  public updateReview(body: IUpdateReview) {
    const schema = Joi.object({
      rating: Joi.number().integer().min(1).max(5).optional().messages({
        "number.base": "Rating must be a number",
        "number.integer": "Rating must be a whole number",
        "number.min": "Rating must be at least 1",
        "number.max": "Rating must be at most 5",
      }),
      title: Joi.string().trim().min(3).max(200).optional().messages({
        "string.base": "Title must be a string",
        "string.empty": "Title cannot be empty",
        "string.min": "Title must be at least 3 characters",
        "string.max": "Title must be at most 200 characters",
      }),
      content: Joi.string().trim().min(10).max(2000).optional().messages({
        "string.base": "Content must be a string",
        "string.empty": "Content cannot be empty",
        "string.min": "Content must be at least 10 characters",
        "string.max": "Content must be at most 2000 characters",
      }),
    }).min(1).messages({
      "object.min": "At least one field must be provided for update",
    });

    return schema.validate(body, { abortEarly: false });
  }
}

export const reviewValidator = new ReviewValidator();










