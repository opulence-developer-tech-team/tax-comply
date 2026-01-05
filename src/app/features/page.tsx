
import { LandingHeader } from "@/components/layout/LandingHeader";
import { LandingFooter } from "@/components/layout/LandingFooter";
import { ProblemSolutionSection } from "@/components/landing/ProblemSolutionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <div className="pt-20">
        <FeaturesSection />
        <HowItWorksSection />
        <ProblemSolutionSection />
      </div>
      <LandingFooter />
    </div>
  );
}
