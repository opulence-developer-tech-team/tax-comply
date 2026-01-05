"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { WriteReviewForm } from "@/components/reviews/WriteReviewForm";
import { createReturnUrl, validateReturnUrl } from "@/lib/utils/return-url";
import { setReviewIntent } from "@/lib/utils/review-redirect";

export default function WriteReviewPage() {
  const router = useRouter();
  const { user } = useAppSelector((state: any) => state.user);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setReviewIntent("write_review_page");
      const returnToken = createReturnUrl("/reviews/write");
      if (returnToken) {
        router.push(`/sign-up?return=${encodeURIComponent(returnToken)}`);
      } else {
        router.push("/sign-up");
      }
      return;
    }

    setIsChecking(false);
  }, [user, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <WriteReviewForm />
      </div>
    </div>
  );
}

