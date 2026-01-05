
import { LandingHeader } from "@/components/layout/LandingHeader";
import { LandingFooter } from "@/components/layout/LandingFooter";
import { FAQSection } from "@/components/landing/FAQSection";
import { NewsletterSection } from "@/components/landing/NewsletterSection";

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <div className="pt-20">
        <FAQSection />
        <NewsletterSection />
      </div>
      <LandingFooter />
    </div>
  );
}
