import { Types } from "mongoose";

export enum ReviewStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

export interface IReview {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  rating: number; // 1-5
  title: string;
  content: string;
  status: ReviewStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICreateReview {
  rating: number;
  title: string;
  content: string;
}

export interface IUpdateReview {
  rating?: number;
  title?: string;
  content?: string;
}

export interface IReviewWithUser {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  rating: number;
  title: string;
  content: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface IReviewListParams {
  page?: number;
  limit?: number;
  cursor?: string;
  status?: ReviewStatus;
}

export interface IReviewListResponse {
  reviews: IReviewWithUser[];
  pagination: {
    hasMore: boolean;
    nextCursor?: string;
    total?: number;
  };
}










