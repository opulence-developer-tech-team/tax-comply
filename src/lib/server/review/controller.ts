import { Types } from "mongoose";
import { reviewService } from "./service";
import { reviewValidator } from "./validator";
import { ICreateReview, IUpdateReview } from "./interface";
import { utils } from "../utils";
import { MessageResponse } from "../utils/enum";
import { logger } from "../utils/logger";

class ReviewController {
  async createReview(userId: Types.ObjectId, body: ICreateReview) {
    try {
      const { error } = reviewValidator.createReview(body);
      if (error) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: error.details.map((d) => d.message).join(", "),
          data: null,
        });
      }

      const review = await reviewService.createReview(userId, body);

      return utils.customResponse({
        status: 201,
        message: MessageResponse.Success,
        description: "Review submitted successfully. It will be reviewed before being published.",
        data: {
          _id: review._id,
          rating: review.rating,
          title: review.title,
          content: review.content,
          status: review.status,
          createdAt: review.createdAt,
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error creating review", err, { userId: userId.toString() });
      
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: error.message || "Failed to submit review",
        data: null,
      });
    }
  }

  async updateReview(userId: Types.ObjectId, body: IUpdateReview) {
    try {
      const { error } = reviewValidator.updateReview(body);
      if (error) {
        return utils.customResponse({
          status: 400,
          message: MessageResponse.Error,
          description: error.details.map((d) => d.message).join(", "),
          data: null,
        });
      }

      const review = await reviewService.updateReview(userId, body);

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Review updated successfully.",
        data: {
          _id: review._id,
          rating: review.rating,
          title: review.title,
          content: review.content,
          status: review.status,
          updatedAt: review.updatedAt,
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error updating review", err, { userId: userId.toString() });
      
      return utils.customResponse({
        status: 400,
        message: MessageResponse.Error,
        description: error.message || "Failed to update review",
        data: null,
      });
    }
  }

  async getUserReview(userId: Types.ObjectId) {
    try {
      const review = await reviewService.getUserReview(userId);

      if (!review) {
        return utils.customResponse({
          status: 200,
          message: MessageResponse.Success,
          description: "No review found",
          data: null,
        });
      }

      return utils.customResponse({
        status: 200,
        message: MessageResponse.Success,
        description: "Review retrieved successfully",
        data: {
          _id: review._id,
          rating: review.rating,
          title: review.title,
          content: review.content,
          status: review.status,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        },
      });
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error getting user review", err, { userId: userId.toString() });
      
      return utils.customResponse({
        status: 500,
        message: MessageResponse.Error,
        description: "Failed to retrieve review",
        data: null,
      });
    }
  }
}

export const reviewController = new ReviewController();










