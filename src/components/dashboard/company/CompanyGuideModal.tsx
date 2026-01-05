"use client";

import { CheckCircle2 } from "lucide-react";
import { GuideModal } from "@/components/ui/GuideModal";

interface CompanyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompanyGuideModal({ isOpen, onClose }: CompanyGuideModalProps) {
  return (
    <GuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Company Profile Guide"
      subtitle="Simple explanation of your business details"
    >
      {/* Section 1: What is this page? */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">1</span>
          What is this page?
        </h3>
        <p className="text-lg text-slate-700 leading-relaxed pl-11">
          This page holds your <strong className="text-emerald-800">Official Business Identity</strong>. Ideally, this should match exactly what is on your CAC documents.
        </p>
      </section>

      {/* Section 2: Why do I need it? */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">2</span>
          Why is this important?
        </h3>
        <ul className="space-y-4 pl-11">
          <li className="flex items-start gap-3 text-lg text-slate-700">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">To make your <strong className="text-emerald-800">Tax Receipts Valid</strong>.</span>
          </li>
          <li className="flex items-start gap-3 text-lg text-slate-700">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">So the government knows exactly who is paying the tax.</span>
          </li>
        </ul>
      </section>

      {/* Section 3: Key Terms */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">3</span>
          What do these terms mean?
        </h3>
        <div className="pl-11 space-y-4 text-lg text-slate-700 leading-relaxed">
          <div>
            <h4 className="font-bold text-emerald-800 mb-1">CAC Number</h4>
            <p>Your business registration number (e.g., RC123456) given by the Corporate Affairs Commission.</p>
          </div>
          <div>
            <h4 className="font-bold text-emerald-800 mb-1">TIN (Tax ID Number)</h4>
            <p>Your unique ID for paying taxes. It's like a bank account number, but for tax.</p>
          </div>
          <div>
            <h4 className="font-bold text-emerald-800 mb-1">Fixed Assets</h4>
            <p>Things your business owns that last a long time (like Machines, Cars, Land, or Buildings).</p>
          </div>
        </div>
      </section>
    </GuideModal>
  );
}
