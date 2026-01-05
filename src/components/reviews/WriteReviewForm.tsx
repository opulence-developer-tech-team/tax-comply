"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { ButtonVariant } from "@/lib/utils/client-enums";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHttp } from "@/hooks/useHttp";
import { useForm } from "@/hooks/useForm";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Star, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { clearReviewIntent } from "@/lib/utils/review-redirect";

export function WriteReviewForm() {
  const router = useRouter();
  const { isLoading: isSubmitting, sendHttpRequest: submitReview } = useHttp();
  const { isLoading: isFetching, sendHttpRequest: fetchReview } = useHttp();
  const [existingReview, setExistingReview] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { values, errors, touched, handleChange, handleBlur, validate, setValue } = useForm(
    {
      rating: 5,
      title: "",
      content: "",
    },
    {
      rating: {
        required: true,
        custom: (value) => {
          if (value < 1 || value > 5) {
            return "Rating must be between 1 and 5";
          }
          return null;
        },
      },
      title: {
        required: true,
        minLength: 3,
        maxLength: 200,
      },
      content: {
        required: true,
        minLength: 10,
        maxLength: 2000,
      },
    }
  );

  useEffect(() => {
    fetchReview({
      successRes: (response: any) => {
        if (response?.data?.data) {
          const review = response.data.data;
          setExistingReview(review);
          setIsEditing(true);
          setValue("rating", review.rating);
          setValue("title", review.title);
          setValue("content", review.content);
        }
      },
      errorRes: () => {
        // No existing review, that's fine
      },
      requestConfig: {
        url: "/reviews/me",
        method: HttpMethod.GET,
      },
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const endpoint = isEditing ? "/reviews/me" : "/reviews";
    const method = isEditing ? "PUT" : "POST";

    submitReview({
      successRes: (response: any) => {
        clearReviewIntent();
        toast.success(isEditing ? "Review updated successfully!" : "Review submitted successfully!", {
          description: "Your review will be reviewed before being published.",
        });
        
        setTimeout(() => {
          router.push("/sign-in");
        }, 2000);
      },
      errorRes: (error: any) => {
        toast.error("Failed to submit review", {
          description: error?.response?.data?.description || "Please try again.",
        });
        return true;
      },
      requestConfig: {
        url: endpoint,
        method: method as HttpMethod,
        body: {
          rating: values.rating,
          title: values.title.trim(),
          content: values.content.trim(),
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
              variant={ButtonVariant.Outline}
          onClick={() => router.push("/reviews")}
          className="border-slate-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Reviews
        </Button>
      </div>

      <Card title={isEditing ? "Update Your Review" : "Write a Review"}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setValue("rating", star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= values.rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-slate-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-slate-600">
                {values.rating} out of 5
              </span>
            </div>
            {errors.rating && touched.rating && (
              <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={values.title}
              onChange={handleChange("title")}
              onBlur={handleBlur("title")}
              placeholder="Brief summary of your experience"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              maxLength={200}
            />
            <div className="flex justify-between mt-1">
              {errors.title && touched.title && (
                <p className="text-sm text-red-600">{errors.title}</p>
              )}
              <p className="text-xs text-slate-500 ml-auto">
                {values.title.length}/200
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Your Review <span className="text-red-500">*</span>
            </label>
            <textarea
              value={values.content}
              onChange={handleChange("content")}
              onBlur={handleBlur("content")}
              placeholder="Share your experience with TaxComply..."
              rows={8}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              maxLength={2000}
            />
            <div className="flex justify-between mt-1">
              {errors.content && touched.content && (
                <p className="text-sm text-red-600">{errors.content}</p>
              )}
              <p className="text-xs text-slate-500 ml-auto">
                {values.content.length}/2000
              </p>
            </div>
          </div>

          {existingReview && existingReview.status === "pending" && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Your previous review is pending approval. 
                You can update it below.
              </p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isEditing ? "Updating..." : "Submitting..."}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isEditing ? "Update Review" : "Submit Review"}
                </>
              )}
            </Button>
            <Button
              type="button"
                  variant={ButtonVariant.Outline}
              onClick={() => router.push("/reviews")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}










