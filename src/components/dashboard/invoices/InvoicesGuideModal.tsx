import { CheckCircle2, FileText, Smartphone, TrendingUp, AlertTriangle } from "lucide-react";
import { GuideModal } from "@/components/ui/GuideModal";
import { AccountType } from "@/lib/utils/account-type";

interface InvoicesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Account type determines specific messaging
  // Defaults to Individual/Company generic messaging if not specified
  accountType?: AccountType;
}

export function InvoicesGuideModal({ isOpen, onClose, accountType }: InvoicesGuideModalProps) {
  const isBusiness = accountType === AccountType.Business;

  return (
    <GuideModal
      isOpen={isOpen}
      onClose={onClose}
      title={isBusiness ? "Invoices & Income" : "Invoices Guide"}
      subtitle={isBusiness ? "How your business income is tracked" : "How to get paid faster & correctly"}
    >
      {/* Section 1: What is this page? */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">1</span>
          {isBusiness ? "Your Invoices = Your Income" : "What is this page?"}
        </h3>
        <p className="text-lg text-slate-700 leading-relaxed pl-11">
          {isBusiness ? (
            <>
              For your business tax, <strong className="text-emerald-800">Income is calculated from your Paid Invoices</strong>. 
              Only invoices marked as "Paid" count towards your revenue.
            </>
          ) : (
             <>
              This is where you create <strong className="text-emerald-800">Professional Payment Requests</strong> (Invoices) to send to your customers.
            </>
          )}
        </p>
      </section>

      {/* Section 2: Why use this? */}
      <section>
        <h3 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold shadow-sm">2</span>
          {isBusiness ? "Why track invoices here?" : "Why use this instead of WhatsApp/Paper?"}
        </h3>
        <ul className="space-y-4 pl-11">
           {isBusiness ? (
            <>
              <li className="flex items-start gap-3 text-lg text-slate-700">
                <TrendingUp className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed"><strong className="text-emerald-800">Tax Accuracy:</strong> We use your total paid invoices to calculate your specific tax rate and liability.</span>
              </li>
              <li className="flex items-start gap-3 text-lg text-slate-700">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed"><strong className="text-emerald-800">Compliance:</strong> Proper invoicing is required to prove your business income to tax authorities.</span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start gap-3 text-lg text-slate-700">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed"><strong className="text-emerald-800">Automatic Tax Math:</strong> We calculate VAT (7.5%) and WHT automatically so you don't make mistakes.</span>
              </li>
              <li className="flex items-start gap-3 text-lg text-slate-700">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed"><strong className="text-emerald-800">Look Professional:</strong> Send beautiful, branded invoices that make your business look big.</span>
              </li>
            </>
          )}
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
            2. Add details & send to client.
            <br/>
            3. <strong className="text-emerald-800">IMPORTANT:</strong> Mark it as <strong>"Paid"</strong> when you receive money.
          </p>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-start gap-3">
             <AlertTriangle className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
             <p className="text-sm text-emerald-800">
               <strong>Tip:</strong> If an invoice sits in "Pending", it does NOT count as income. Make sure to update the status when you get paid!
             </p>
          </div>
        </div>
      </section>
    </GuideModal>
  );
}
