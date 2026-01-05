import { LandingHeader } from "@/components/layout/LandingHeader";
import { LandingFooter } from "@/components/layout/LandingFooter";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { VATCalculatorSection } from "@/components/landing/VATCalculatorSection";
import { TaxReformsSection } from "@/components/landing/TaxReformsSection";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolutionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CostSavingsSection } from "@/components/landing/CostSavingsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { NewsletterSection } from "@/components/landing/NewsletterSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { getPricingPlans } from "@/lib/server/subscription/get-pricing-plans";
import { connectDB } from "@/lib/server/utils/db";
import { reviewService } from "@/lib/server/review/service";

export default async function Home() {
  // Fetch pricing plans on the server
  const pricingPlans = await getPricingPlans();
  
  // Fetch random reviews on the server
  let reviews: Awaited<ReturnType<typeof reviewService.getApprovedReviewsRandom>> = [];
  try {
    await connectDB();
    reviews = await reviewService.getApprovedReviewsRandom(10);
  } catch (error) {
    // If reviews fail to load, continue without them
    console.error("Failed to load reviews:", error);
  }

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <HeroSection />
      <TrustSection />
      
      {/* New 2026 Reforms Section - High Priority */}
      <TaxReformsSection />
      
      {/* Problem vs Solution */}
      <ProblemSolutionSection />
      
      {/* Detailed Features */}
      <FeaturesSection />
      
      {/* How It Works */}
      <HowItWorksSection />
      
      {/* Pricing */}
      <PricingSection initialPlans={pricingPlans} />
      
      {/* Social Proof */}
      <TestimonialsSection initialReviews={reviews} />
      
      {/* FAQ */}
      <FAQSection />
      
      {/* Final Push */}
      <FinalCTASection />
      
      <LandingFooter />
    </div>
  );
}
