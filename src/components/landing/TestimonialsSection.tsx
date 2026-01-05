"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Star, User, ChevronLeft, ChevronRight, Quote, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ButtonSize, ButtonVariant } from "@/lib/utils/client-enums";

const staticTestimonials = [
  {
    name: "Chioma K.",
    role: "Small Business Owner",
    quote: "I used to be terrified of NRS audits. Now I have all my documents ready in one click. It's such a relief.",
    location: "Lagos",
  },
  {
    name: "Emeka T.",
    role: "Freelance Designer",
    quote: "TaxComply is the only app that actually understands Nigerian tax laws. It's saved me so much time.",
    location: "Abuja",
  },
  {
    name: "Adebayo O.",
    role: "Retail Store Owner",
    quote: "The VAT calculation is spot on. I don't have to guess anymore. I know exactly what to save.",
    location: "Ibadan",
  }
];

interface TestimonialsSectionProps {
  initialReviews?: any[]; // Using any to avoid importing server-only type into client component if not shared
}

export function TestimonialsSection({ initialReviews = [] }: TestimonialsSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [currentIndex, setCurrentIndex] = useState(0);

  // Map reviews to testimonials format if available, otherwise use static
  const testimonials = initialReviews && initialReviews.length > 0
    ? initialReviews.map(review => ({
        name: `${review.user?.firstName || "TaxComply"} ${review.user?.lastName?.[0] ? review.user.lastName[0] + "." : "User"}`,
        role: "Verified User",
        quote: review.content,
        location: "Nigeria"
      }))
    : staticTestimonials;

  const paginate = (newDirection: number) => {
    setCurrentIndex((prev) => (prev + newDirection + testimonials.length) % testimonials.length);
  };

  return (
    <section id="testimonials" ref={ref} className="py-24 lg:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Trusted by Nigerian Owners
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8">
            Join hundreds of businesses who sleep better at night.
          </p>

        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          <div className="bg-emerald-50 rounded-3xl p-10 lg:p-16 text-center relative">
            <Quote className="w-12 h-12 text-emerald-200 mx-auto mb-6" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-2xl lg:text-3xl font-medium text-slate-900 mb-8 leading-relaxed">
                  "{testimonials[currentIndex]?.quote || ""}"
                </p>
                <div>
                  <div className="font-bold text-lg text-slate-900">{testimonials[currentIndex]?.name || "Anonymous"}</div>
                  <div className="text-emerald-700">{testimonials[currentIndex]?.role || "User"}</div>
                  <div className="text-slate-500 text-sm mt-1">{testimonials[currentIndex]?.location || "Nigeria"}</div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-center gap-4 mt-8">
              <button onClick={() => paginate(-1)} className="p-2 rounded-full hover:bg-emerald-100 transition-colors">
                <ChevronLeft className="w-6 h-6 text-emerald-600" />
              </button>
              <button onClick={() => paginate(1)} className="p-2 rounded-full hover:bg-emerald-100 transition-colors">
                <ChevronRight className="w-6 h-6 text-emerald-600" />
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-emerald-100/50">
              <Link href="/reviews">
                <Button size={ButtonSize.Lg} variant={ButtonVariant.Ghost} className="group hover:bg-white/50 text-emerald-700">
                  See All Reviews
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
