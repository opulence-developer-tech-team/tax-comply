import { connectDB } from "@/lib/server/utils/db";
import { reviewService } from "@/lib/server/review/service";
import { ReviewStatus } from "@/lib/server/review/interface";
import { ReviewsPageClient } from "@/components/reviews/ReviewsPageClient";

async function getReviewsData(cursor?: string, limit: number = 20) {
  await connectDB();
  
  const result = await reviewService.getApprovedReviewsPaginated({
    cursor,
    limit,
    status: ReviewStatus.Approved,
  });

  return result;
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: { cursor?: string; limit?: string };
}) {
  const cursor = searchParams.cursor;
  const limit = parseInt(searchParams.limit || "20", 10);
  
  const reviewsData = await getReviewsData(cursor, limit);

  return <ReviewsPageClient initialData={reviewsData} />;
}










