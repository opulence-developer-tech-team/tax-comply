"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonVariant } from "@/lib/utils/client-enums";
import { ChevronDown, HelpCircle, ArrowRight } from "lucide-react";

const faqs = [
  {
    question: "Is this really NRS compliant?",
    answer: "Yes. Our invoices and tax calculations follow the strict rules of the Nigeria Tax Act (including the new 2025 reforms). If NRS audits you, your records will be perfect.",
  },
  {
    question: "How do I pay?",
    answer: "We use Monnify(Moniepoint). You can pay with your card, bank transfer, or USSD. It's safe and instant.",
  },
  {
    question: "Can I use it for my company?",
    answer: "Yes. Choose the 'Company' plan. We handle VAT, CIT (Company Income Tax), and even WHT (Withholding Tax) for you.",
  },
  {
    question: "What if I hate doing math?",
    answer: "That's exactly why we built this. You just enter 'I spent ₦5,000 on fuel', and we calculate all the taxes for you automatically.",
  },
  {
    question: "Is my data safe?",
    answer: "Yes. We use bank-level encryption. Nobody sees your financial data except you.",
  },
];

export function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" ref={ref} className="py-24 lg:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Questions? We have answers.
          </h2>
          <p className="text-xl text-slate-600">
            Everything you need to know about TaxComply.
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hover:border-emerald-200 transition-colors">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full p-6 text-left flex items-start justify-between gap-4"
                  >
                    <span className="text-lg font-bold text-slate-900">{faq.question}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-0">
                          <p className="text-slate-600 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <Link href="/help-center">
            <Button variant={ButtonVariant.Outline} className="group gap-2">
              Visit Help Center
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}



















