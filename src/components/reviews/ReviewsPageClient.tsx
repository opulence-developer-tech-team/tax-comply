"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHttp } from "@/hooks/useHttp";
import { useAppSelector } from "@/hooks/useAppSelector";
import { LoadingState } from "@/components/shared/LoadingState";
import { createReturnUrl } from "@/lib/utils/return-url";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Star, MessageSquare, ArrowRight, Pencil } from "lucide-react";
import type { IReviewListResponse, IReviewWithUser } from "@/lib/server/review/interface";
import { motion } from "framer-motion";

interface ReviewsPageClientProps {
  initialData: IReviewListResponse;
}

export function ReviewsPageClient({ initialData }: ReviewsPageClientProps) {
  const router = useRouter();
  const { user } = useAppSelector((state: any) => state.user);
  const { isLoading, sendHttpRequest: loadMore } = useHttp();
  const [reviews, setReviews] = useState<IReviewWithUser[]>(initialData.reviews);
  const [pagination, setPagination] = useState(initialData.pagination);

  const handleLoadMore = () => {
    if (!pagination.nextCursor || isLoading) return;

    loadMore({
      successRes: (response: any) => {
        const newData: IReviewListResponse = response.data.data;
        setReviews((prev) => [...prev, ...newData.reviews]);
        setPagination(newData.pagination);
      },
      errorRes: () => {
        return true;
      },
      requestConfig: {
        url: `/reviews?cursor=${encodeURIComponent(pagination.nextCursor!)}&limit=20`,
        method: HttpMethod.GET,
      },
    });
  };

  const getUserDisplayName = (review: IReviewWithUser) => {
    if (review.user) {
      return `${review.user.firstName} ${review.user.lastName}`;
    }
    return "Anonymous";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Customer Reviews</h1>
              <p className="text-slate-600">
                See what our users are saying about TaxComply
              </p>
            </div>
            {user ? (
              <Button
                onClick={() => router.push("/reviews/write")}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Write a Review
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const returnToken = createReturnUrl("/reviews/write");
                  if (returnToken) {
                    router.push(`/sign-up?return=${encodeURIComponent(returnToken)}`);
                  } else {
                    router.push("/sign-up");
                  }
                }}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Write a Review
              </Button>
            )}
          </div>
        </div>

        {reviews.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No reviews yet</h3>
              <p className="text-slate-600 mb-6">
                Be the first to share your experience with TaxComply!
              </p>
              {user ? (
                <Button
                  onClick={() => router.push("/reviews/write")}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                >
                  Write the First Review
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    const returnToken = createReturnUrl("/reviews/write");
                    if (returnToken) {
                      router.push(`/sign-up?return=${encodeURIComponent(returnToken)}`);
                    } else {
                      router.push("/sign-up");
                    }
                  }}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                >
                  Sign in to Write a Review
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {reviews.map((review, index) => (
              <motion.div
                key={review._id.toString()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                          {review.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-slate-600">
                            {getUserDisplayName(review)}
                          </span>
                          <span className="text-sm text-slate-400">•</span>
                          <span className="text-sm text-slate-500">
                            {new Date(review.createdAt).toLocaleDateString("en-NG", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {review.content}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}

            {pagination.hasMore && (
              <div className="text-center pt-6">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  variant={ButtonVariant.Outline}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More Reviews
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

