"use client";

import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";
import { Users, Banknote, ArrowRight, Share2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { ButtonVariant } from "@/lib/utils/client-enums";

interface ReferralGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralLink?: string;
}

export function ReferralGuideModal({ isOpen, onClose, referralLink }: ReferralGuideModalProps) {
  const handleShare = async () => {
    if (!referralLink) {
      toast.error("Referral link is not ready yet.");
      return;
    }

    const shareTitle = 'Simplify Your Taxes with TaxTrack';
    const shareText = "Stop struggling with NRS deadlines! 🛡️ I use TaxTrack to automate my Personal Income Tax, VAT, and Withholding Tax effortlessly. It's the smartest way to stay compliant and save money in Nigeria. Sign up with my link:";

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: referralLink,
        });
      } catch (err) {
         console.log('Share cancelled', err);
      }
    } else {
       // FALLBACK: Copy to clipboard if sharing isn't native
       const fullMessage = `${shareTitle}\n\n${shareText} ${referralLink}`;
       navigator.clipboard.writeText(fullMessage);
       toast.success("Message & Link copied!", { description: "Paste it on WhatsApp, Twitter, or Email." });
    }
  };

  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Earn Money with Referrals"
      subtitle="Invite friends, help them save perfectly, and get rewarded."
      actionLabel="Close Guide"
    >
      <div className="space-y-8">
        {/* Intro */}
        <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
           <h3 className="text-lg font-bold text-emerald-900 mb-2 flex items-center gap-2">
             <Banknote className="w-5 h-5 text-emerald-600" />
             Turn Your Network Into Net Worth
           </h3>
           <p className="text-emerald-800 text-sm leading-relaxed">
             You already know TaxTrack helps you stay compliant and save money. Now, you can <strong>earn cash</strong> just by sharing that peace of mind with others.
           </p>
        </div>

        {/* Step 1 */}
        <div className="flex gap-4">
           <div className="shrink-0 w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-sm">
             <Share2 className="w-6 h-6 text-blue-600" />
           </div>
           <div>
             <h3 className="text-lg font-bold text-slate-900 mb-1">1. Share Your Unique Link</h3>
             <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                Copy your special referral link from this page and send it to friends, business partners, or colleagues on WhatsApp, Twitter, or Email.
             </p>
           </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 shadow-sm">
            <Users className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">2. They Sign Up</h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              When they create an account and subscribe to a paid plan using your link, we instantly tag them as your referral.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-4">
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm">
            <Wallet className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">3. You Get Paid Commision</h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              You earn a commission every time they pay. You can see your earnings grow here and <strong>withdraw directly to your bank account</strong> anytime.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <p className="text-sm font-medium text-slate-500 mb-4">
               Ready to start?
             </p>
             <Button
                onClick={handleShare}
                variant={ButtonVariant.Primary}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full mx-auto"
             >
                <ArrowRight className="w-4 h-4" />
                Share your link now
             </Button>
        </div>
      </div>
    </LuxuryGuideModal>
  );
}
