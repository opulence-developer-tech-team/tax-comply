"use client";

import { CheckCircle2 } from "lucide-react";
import { GuideModal } from "@/components/ui/GuideModal";

interface ExpensesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExpensesGuideModal({ isOpen, onClose }: ExpensesGuideModalProps) {
  return (
    <GuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="How Expenses Work"
      subtitle="Simple guide to tracking your spending"
    >
      {/* Section 1: What is this? */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">1</span>
          What is this page?
        </h3>
        <p className="text-lg text-slate-700 leading-relaxed pl-11">
          This is your <strong className="text-emerald-800">Expense Tracker</strong>. It is where you record every kobo your business spends.
        </p>
      </section>

      {/* Section 2: What should I do? */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">2</span>
          What should I do here?
        </h3>
        <ul className="space-y-4 pl-11">
          <li className="flex items-start gap-3 text-lg text-slate-700">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">Click <strong className="text-emerald-800">"New Expense"</strong> whenever you spend money.</span>
          </li>
          <li className="flex items-start gap-3 text-lg text-slate-700">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">Select what you paid for (like Rent, Fuel, or Internet).</span>
          </li>
          <li className="flex items-start gap-3 text-lg text-slate-700">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">Mark if it is <strong>"Tax Deductible"</strong> (we guide you on this).</span>
          </li>
        </ul>
      </section>

      {/* Section 3: Why it matters */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">3</span>
          Why does this matter?
        </h3>
        <div className="pl-11 text-lg text-slate-700 leading-relaxed space-y-3">
          <p>
            <strong className="text-emerald-700">It lowers your tax bill legally.</strong>
          </p>
          <p>
            You only pay tax on your <strong>Profit</strong>.
            <br />
            <em>Profit = Money In - Expenses (Money Out)</em>.
          </p>
          <p>
            So, the more legitimate expenses you record, the lower your profit looks on paper, and the <strong>less tax you pay</strong>.
          </p>
        </div>
      </section>
    </GuideModal>
  );
}
