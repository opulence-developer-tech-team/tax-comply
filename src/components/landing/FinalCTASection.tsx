"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonSize } from "@/lib/utils/client-enums";

export function FinalCTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-white text-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 mb-8 tracking-tight">
                Stop stressing about NRS.
            </h2>
            <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
                Join hundreds of Nigerian business owners who sleep peacefully knowing their taxes are perfect.
            </p>
            
            <Link href="/sign-up">
              <Button 
                size={ButtonSize.Lg} 
                className="px-12 py-8 text-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl hover:shadow-2xl transition-all rounded-2xl transform hover:-translate-y-1"
              >
                Start Free Account
              </Button>
            </Link>
            <p className="mt-6 text-slate-400 text-sm">
                No credit card required. Cancel anytime.
            </p>
        </motion.div>
      </div>
    </section>
  );
}
