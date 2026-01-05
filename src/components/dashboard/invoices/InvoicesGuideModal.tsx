"use client";

import { CheckCircle2, FileText, Smartphone } from "lucide-react";
import { GuideModal } from "@/components/ui/GuideModal";

interface InvoicesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicesGuideModal({ isOpen, onClose }: InvoicesGuideModalProps) {
  return (
    <GuideModal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoices Guide"
      subtitle="How to get paid faster & correctly"
    >
      {/* Section 1: What is this page? */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">1</span>
          What is this page?
        </h3>
        <p className="text-lg text-slate-700 leading-relaxed pl-11">
          This is where you create <strong className="text-emerald-800">Professional Payment Requests</strong> (Invoices) to send to your customers.
        </p>
      </section>

      {/* Section 2: Why use this? */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">2</span>
          Why use this instead of WhatsApp/Paper?
        </h3>
        <ul className="space-y-4 pl-11">
          <li className="flex items-start gap-3 text-lg text-slate-700">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed"><strong className="text-emerald-800">Automatic Tax Math:</strong> We calculate VAT (7.5%) and WHT automatically so you don't make mistakes.</span>
          </li>
          <li className="flex items-start gap-3 text-lg text-slate-700">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed"><strong className="text-emerald-800">Look Professional:</strong> Send beautiful, branded invoices that make your business look big.</span>
          </li>
        </ul>
      </section>

      {/* Section 3: How it works */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">3</span>
          How does it work?
        </h3>
        <div className="pl-11 space-y-4 text-lg text-slate-700 leading-relaxed">
          <p>
            1. Click <strong>"New Invoice"</strong>.
            <br/>
            2. Add your customer and what you sold.
            <br/>
            3. Download the PDF and send it to your client.
          </p>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
             <Smartphone className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
             <p className="text-sm text-emerald-800">
               <strong>Tip:</strong> Your tax calculation happens automatically based on these invoices. If you don't invoice here, your tax report might be wrong!
             </p>
          </div>
        </div>
      </section>
    </GuideModal>
  );
}
