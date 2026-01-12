import { useCallback } from "react";
import { toast } from "sonner";

export const useShareReferral = () => {
  const shareReferral = useCallback(async (referralLink: string, source: string = "referral") => {
    if (!referralLink) return;

    const shareTitle = 'Simplify Your Taxes with TaxComply NG';
    const shareText = "Stop struggling with NRS deadlines! 🛡️ I use TaxComply NG to automate my Personal Income Tax, VAT, and Withholding Tax effortlessly. It's the smartest way to stay compliant and save money in Nigeria. Sign up with my link:";

    // Track share event
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "share_clicked", {
        method: source,
        content_type: "referral",
      });
    }

    // Try native share API first (mobile & modern desktop)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: referralLink,
        });

        // Track successful native share
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "share_success", {
            method: "native",
            source: source
          });
        }
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    } else {
      // Fallback: Copy to clipboard if sharing isn't native
      const fullMessage = `${shareTitle}\n\n${shareText} ${referralLink}`;
      try {
        await navigator.clipboard.writeText(fullMessage);
        toast.success("Message & Link copied!", { description: "Paste it on WhatsApp, Twitter, or Email." });
      } catch (err) {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy to clipboard");
      }
    }
  }, []);

  return { shareReferral };
};
