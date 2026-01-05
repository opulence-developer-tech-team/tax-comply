import mongoose, { Schema } from "mongoose";
import { IReview, ReviewStatus } from "./interface";

const reviewSchema = new Schema<IReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.Pending,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.set("versionKey", false);
reviewSchema.set("toJSON", { virtuals: true });
reviewSchema.set("toObject", { virtuals: true });

reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ userId: 1 });

const Review =
  (mongoose.models.Review as mongoose.Model<IReview>) ||
  mongoose.model<IReview>("Review", reviewSchema);

export default Review;

