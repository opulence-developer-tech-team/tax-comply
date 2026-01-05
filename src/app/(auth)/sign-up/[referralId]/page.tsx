"use client";

import { useParams } from "next/navigation";
import SignUpPage from "../page";

/**
 * Dynamic signup route with referral ID
 * This route shares the same signup component but pre-fills the referralId
 * Format: /sign-up/:referralId
 */
export default function SignUpWithReferralPage() {
  const params = useParams();
  const referralId = params?.referralId as string;

  // Pass referralId to the main signup page component
  return <SignUpPage referralId={referralId} />;
}

