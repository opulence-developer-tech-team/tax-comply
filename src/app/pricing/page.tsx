
import { LandingHeader } from "@/components/layout/LandingHeader";
import { LandingFooter } from "@/components/layout/LandingFooter";
import { PricingSection } from "@/components/landing/PricingSection";
import { getPricingPlans } from "@/lib/server/subscription/get-pricing-plans";

export default async function PricingPage() {
  const pricingPlans = await getPricingPlans();

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <div className="pt-20">
        <PricingSection initialPlans={pricingPlans} />
      </div>
      <LandingFooter />
    </div>
  );
}
