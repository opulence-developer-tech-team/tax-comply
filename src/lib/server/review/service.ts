import { Types } from "mongoose";
import Review from "./entity";
import User from "../user/entity";
import { IReview, ICreateReview, IUpdateReview, IReviewListParams, IReviewListResponse, IReviewWithUser, ReviewStatus } from "./interface";
import { logger } from "../utils/logger";

class ReviewService {
  async createReview(userId: Types.ObjectId, reviewData: ICreateReview): Promise<IReview> {
    const existingReview = await Review.findOne({ 
      userId, 
      status: { $in: [ReviewStatus.Pending, ReviewStatus.Approved] } 
    });
    
    if (existingReview) {
      if (existingReview.status === ReviewStatus.Approved) {
        throw new Error("You have already submitted a review. You can update your existing review.");
      }
      throw new Error("You have a pending review. Please wait for approval or contact support.");
    }

    const review = new Review({
      userId,
      rating: reviewData.rating,
      title: reviewData.title.trim(),
      content: reviewData.content.trim(),
      status: ReviewStatus.Pending,
    });

    await review.save();
    return review;
  }

  async updateReview(userId: Types.ObjectId, reviewData: IUpdateReview): Promise<IReview> {
    const review = await Review.findOne({ userId });
    
    if (!review) {
      throw new Error("Review not found");
    }

    if (review.status === ReviewStatus.Rejected) {
      review.status = ReviewStatus.Pending;
    }

    if (reviewData.rating !== undefined) {
      review.rating = reviewData.rating;
    }
    if (reviewData.title !== undefined) {
      review.title = reviewData.title.trim();
    }
    if (reviewData.content !== undefined) {
      review.content = reviewData.content.trim();
    }

    await review.save();
    return review;
  }

  async getUserReview(userId: Types.ObjectId): Promise<IReview | null> {
    return Review.findOne({ userId });
  }

  async getApprovedReviewsRandom(limit: number = 10): Promise<IReviewWithUser[]> {
    const approvedCount = await Review.countDocuments({ status: ReviewStatus.Approved });
    
    if (approvedCount === 0) {
      return [];
    }

    const sampleSize = Math.min(limit, approvedCount);
    const skip = Math.floor(Math.random() * Math.max(0, approvedCount - sampleSize));

    const reviews = await Review.find({ status: ReviewStatus.Approved })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(sampleSize)
      .populate("userId", "firstName lastName email")
      .lean();

    return reviews.map((review: any) => ({
      _id: review._id,
      userId: review.userId._id,
      rating: review.rating,
      title: review.title,
      content: review.content,
      status: review.status,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: {
        firstName: review.userId.firstName,
        lastName: review.userId.lastName,
        email: review.userId.email,
      },
    }));
  }

  async getApprovedReviewsPaginated(params: IReviewListParams): Promise<IReviewListResponse> {
    const limit = Math.min(params.limit || 20, 50);
    const status = params.status || ReviewStatus.Approved;

    let query: any = { status };

    if (params.cursor) {
      try {
        const cursorDate = new Date(params.cursor);
        query.createdAt = { $lt: cursorDate };
      } catch (error) {
        logger.error("Invalid cursor format", error as Error);
      }
    }

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate("userId", "firstName lastName email")
      .lean();

    const hasMore = reviews.length > limit;
    const reviewsToReturn = hasMore ? reviews.slice(0, limit) : reviews;

    const reviewsWithUser: IReviewWithUser[] = reviewsToReturn.map((review: any) => ({
      _id: review._id,
      userId: review.userId._id,
      rating: review.rating,
      title: review.title,
      content: review.content,
      status: review.status,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: {
        firstName: review.userId.firstName,
        lastName: review.userId.lastName,
        email: review.userId.email,
      },
    }));

    const nextCursor = hasMore && reviewsToReturn.length > 0
      ? reviewsToReturn[reviewsToReturn.length - 1]?.createdAt?.toISOString()
      : undefined;

    return {
      reviews: reviewsWithUser,
      pagination: {
        hasMore,
        nextCursor,
      },
    };
  }

  async approveReview(reviewId: Types.ObjectId): Promise<IReview> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    review.status = ReviewStatus.Approved;
    await review.save();
    return review;
  }

  async rejectReview(reviewId: Types.ObjectId): Promise<IReview> {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    review.status = ReviewStatus.Rejected;
    await review.save();
    return review;
  }
}

export const reviewService = new ReviewService();

