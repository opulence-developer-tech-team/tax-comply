"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function NewsletterSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    
    setIsSubmitting(true);
    // Mimic API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setEmail("");
      setTimeout(() => setIsSuccess(false), 5000);
    }, 1500);
  };

  return (
    <section ref={ref} className="py-24 bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
           transition={{ duration: 0.8 }}
        >
            <Mail className="w-12 h-12 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Get compliance tips.
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mb-10">
                Join 5,000+ Nigerian business owners. We send one email a week with tips on how to save money on taxes legally. No spam.
            </p>

            <form onSubmit={handleSubmit} className="max-w-md mx-auto relative">
                <div className="flex gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <Button
                        type="submit"
                        disabled={isSubmitting || isSuccess}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 rounded-xl font-semibold"
                    >
                        {isSubmitting ? "..." : "Join"}
                    </Button>
                </div>
                {isSuccess && (
                     <p className="absolute top-full left-0 right-0 mt-2 text-emerald-400 text-sm flex items-center justify-center gap-2">
                         <CheckCircle2 className="w-4 h-4" /> You're on the list!
                     </p>
                )}
            </form>
        </motion.div>
      </div>
    </section>
  );
}


















