"use client";

import { Building2, Shield, RefreshCw, FileText } from "lucide-react";
import { LuxuryGuideModal } from "@/components/shared/LuxuryGuideModal";

interface BusinessProfileGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BusinessProfileGuideModal({ isOpen, onClose }: BusinessProfileGuideModalProps) {
  const steps = [
    {
      title: "This is Your Tax Identity",
      description: "Think of this page as your business's ID card for the tax office (NRS). The details here determine your tax category.",
      icon: <Building2 className="w-6 h-6 text-emerald-600" />,
    },
    {
      title: "Your Turnover Score",
      description: "We automatically calculate your 'Turnover' (total sales) from your invoices. This score decides if you pay 0% tax (Small Business) or 30% tax (Larger Business).",
      icon: <RefreshCw className="w-6 h-6 text-blue-600" />,
    },
    {
      title: "TIN & VAT Numbers",
      description: "If you earn over ₦25 million a year, you MUST add your VAT Number here. It's the law. If you earn less, these are optional but good to have.",
      icon: <Shield className="w-6 h-6 text-purple-600" />,
    },
    {
      title: "Keep it Updated",
      description: "Moved office? Changed phone number? Update it here immediately so you don't miss important tax alerts.",
      icon: <FileText className="w-6 h-6 text-emerald-600" />,
    },
  ];

  return (
    <LuxuryGuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Your Business Tax Profile"
      subtitle="Why this page is the most important part of your tax account."
    >
      <div className="space-y-8">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm">
              {step.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                {step.description}
              </p>
            </div>
          </div>
        ))}

        <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <p className="text-emerald-800 font-medium italic">
              "Accurate details = Accurate tax. No surprises."
            </p>
        </div>
      </div>
    </LuxuryGuideModal>
  );
}
