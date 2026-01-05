"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonSize } from "@/lib/utils/client-enums";
import { 
  ArrowRight, 
  PlayCircle, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  Building2,
  Briefcase 
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { HeroGuideModal } from "./HeroGuideModal";

const heroMessages = [
  "Built for Salary Earners.",
  "Perfect for Business Owners.",
  "Scalable for Companies.",
  "100% NRS Compliant."
];

export function HeroSection() {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % heroMessages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[110vh] flex flex-col justify-start pt-32 lg:pt-48 overflow-hidden bg-[#022c22]">
      <HeroGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      
      {/* 1. Cinematic Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Restored Background Image - Optimized: Static on mobile, animated on desktop */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay">
             <Image
              src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
              alt="Tax compliance documents"
              fill
              className="object-cover hidden md:block animate-[pulse_10s_ease-in-out_infinite]"
              priority
            />
            {/* Mobile-optimized static image */}
            <Image
              src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=60"
              alt="Tax compliance documents"
              fill
              className="object-cover md:hidden"
              priority
            />
        </div>

        {/* Main Glow - Reduced blur for mobile */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/20 blur-[60px] md:blur-[120px] rounded-full" />
        
        {/* Subtle Grid - Static */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
        <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{ 
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)', 
                backgroundSize: '40px 40px' 
            }} 
        />
        
        {/* Floating Orbs - Disabled on mobile for performance */}
        <motion.div 
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="hidden md:block absolute top-1/3 left-10 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl will-change-transform"
        />
        <motion.div 
            animate={{ y: [0, 20, 0], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="hidden md:block absolute bottom-1/3 right-10 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl will-change-transform"
        />

        {/* Random Floating Elements - Only visible on Large screens and up */}
        {/* Nigerian Flag */}
        <div className="absolute top-[15%] left-[20%] text-4xl opacity-40 select-none z-0 hidden lg:block grayscale-[0.3] animate-[bounce_5s_infinite]">
          🇳🇬
        </div>

        {/* WHT Badge */}
         <motion.div
           animate={{ 
             y: [0, 15, 0],
             x: [0, -5, 0]
           }}
           transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
           className="absolute bottom-[40%] right-[15%] select-none z-0 hidden lg:block opacity-40 will-change-transform"
        >
           <div className="px-3 py-1.5 rounded-full bg-teal-900/30 border border-teal-500/20 text-teal-200/70 text-xs font-bold tracking-wider">
              WHT READY
           </div>
        </motion.div>

        {/* Naira Symbol */}
        <div className="absolute top-[40%] left-[5%] text-6xl font-serif text-emerald-500/20 select-none z-0 hidden lg:block blur-[1px] animate-[pulse_4s_ease-in-out_infinite]">
          ₦
        </div>

        {/* CIT Badge */}
        <motion.div
           animate={{ 
             y: [0, 20, 0],
             rotate: [0, -3, 0]
           }}
           transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
           className="absolute top-[32%] left-[12%] select-none z-0 hidden lg:block opacity-40 will-change-transform"
        >
           <div className="px-3 py-1.5 rounded-full bg-blue-900/30 border border-blue-500/20 text-blue-200/70 text-[10px] font-bold tracking-wider">
              CIT FILED
           </div>
        </motion.div>

        {/* PIT Badge */}
        <motion.div
           animate={{ 
             y: [0, -15, 0],
             x: [0, 5, 0]
           }}
           transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
           className="absolute bottom-[12%] left-[30%] select-none z-0 hidden lg:block opacity-40 will-change-transform"
        >
           <div className="px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/20 text-purple-200/70 text-[10px] font-bold tracking-wider">
              PIT SORTED
           </div>
        </motion.div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* 2. Trust Badge */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium mb-8 backdrop-blur-sm"
        >
            <ShieldCheck className="w-4 h-4" />
            <span>Official NRS 2026 Compliant</span>
        </motion.div>

        {/* 3. High-Impact Typography */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-[1.1] mb-8 max-w-5xl mx-auto min-h-[3.3em] md:min-h-[2.2em]"
        >
            Nigerian Tax Compliance, <br />
            <AnimatePresence mode="wait">
              <motion.span 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 animate-gradient-x block"
              >
                  {heroMessages[index]}
              </motion.span>
            </AnimatePresence>
        </motion.div>

        <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-emerald-100/70 mb-10 max-w-3xl mx-auto leading-relaxed font-light"
        >
            The comprehensive platform for Individuals, Sole Proprietors, and Companies. 
            Automate your Personal Income Tax, Company Income Tax, Value Added Tax, and Withholding Tax calculations without the headache.
        </motion.p>

        {/* 4. Primary Actions */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
        >
            <Link href="/sign-up">
                <Button 
                    size={ButtonSize.Lg} 
                    className="h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_0_60px_-15px_rgba(16,185,129,0.6)] transition-all duration-300 transform hover:-translate-y-1"
                >
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
            </Link>
            <button 
                onClick={() => setIsGuideOpen(true)}
                className="h-14 px-8 text-lg font-medium text-white/90 hover:text-white border border-white/10 hover:border-white/30 hover:bg-white/5 rounded-full transition-all flex items-center gap-2 backdrop-blur-sm"
            >
                <PlayCircle className="w-5 h-5" />
                How It Works
            </button>
        </motion.div>

        {/* 5. The "Visual Anchor" - Glass Dashboard Mockup */}
        <motion.div 
             initial={{ opacity: 0, y: 50, scale: 0.95 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
             className="relative mx-auto max-w-5xl"
        >
            {/* Glossy Container */}
            <div className="relative rounded-2xl border border-white/10 bg-[#0f172a]/40 backdrop-blur-xl shadow-2xl shadow-emerald-900/50 overflow-hidden aspect-[16/10] md:aspect-[2/1] group">
                
                {/* Fake Browser Header */}
                <div className="h-10 border-b border-white/5 bg-white/5 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                    </div>
                    <div className="mx-auto px-4 py-1 rounded bg-black/20 text-[10px] text-emerald-500/50 font-mono">
                        taxcomply.ng/dashboard
                    </div>
                </div>

                {/* Dashboard UI Simulation */}
                <div className="p-6 md:p-8 grid grid-cols-12 gap-6 h-full text-left">
                    
                    {/* Sidebar */}
                    <div className="hidden md:block col-span-2 space-y-4 border-r border-white/5 pr-4">
                        <div className="h-8 w-24 bg-emerald-500/20 rounded-md mb-8" />
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="h-3 w-full bg-white/5 rounded-full" />
                        ))}
                    </div>

                    {/* Main Content */}
                    <div className="col-span-12 md:col-span-10 space-y-6">
                        {/* Header Area */}
                        <div className="flex justify-between items-center mb-8">
                            <div className="space-y-2">
                                <div className="h-6 w-48 bg-white/10 rounded-lg animate-pulse" />
                                <div className="h-4 w-32 bg-white/5 rounded-lg" />
                            </div>
                            <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                        </div>

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: VAT Status */}
                            <div className="p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/5 relative overflow-hidden group-hover:border-emerald-500/30 transition-colors duration-500">
                                <div className="absolute top-0 right-0 p-4 opacity-50">
                                   <TrendingUp className="w-12 h-12 text-emerald-500/20" />
                                </div>
                                <p className="text-emerald-400 text-sm font-semibold mb-1">Total VAT (2025)</p>
                                <p className="text-3xl text-white font-bold mb-4">₦ 4,250,000</p>
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Remitted</span>
                                </div>
                            </div>

                            {/* Card 2: Compliance Score */}
                            <div className="p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/5 relative overflow-hidden group-hover:border-emerald-500/30 transition-colors duration-500 delay-75">
                                 <div className="absolute top-0 right-0 p-4 opacity-50">
                                   <ShieldCheck className="w-12 h-12 text-emerald-500/20" />
                                </div>
                                <p className="text-emerald-400 text-sm font-semibold mb-1">Compliance Score</p>
                                <p className="text-3xl text-white font-bold mb-4">100%</p>
                                <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                                    <div className="bg-emerald-500 h-1.5 rounded-full w-full" />
                                </div>
                            </div>

                            {/* Card 3: Next Action */}
                            <div className="p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/5 relative overflow-hidden group-hover:border-emerald-500/30 transition-colors duration-500 delay-150">
                                <div className="absolute top-0 right-0 p-4 opacity-50">
                                   <Building2 className="w-12 h-12 text-emerald-500/20" />
                                </div>
                                <p className="text-amber-400 text-sm font-semibold mb-1">Next Filing</p>
                                <p className="text-xl text-white font-bold mb-4">CIT Returns</p>
                                <p className="text-xs text-white/50">Due in 14 days</p>
                            </div>
                        </div>

                        {/* Recent Activity Table Mock */}
                         <div className="rounded-xl border border-white/5 bg-white/5 p-4 space-y-3">
                            <div className="h-4 w-32 bg-white/10 rounded" />
                            <div className="h-px bg-white/5 my-2" />
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex justify-between items-center py-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-white/5" />
                                        <div className="h-3 w-40 bg-white/10 rounded" />
                                    </div>
                                    <div className="h-3 w-16 bg-emerald-500/20 rounded" />
                                </div>
                            ))}
                         </div>

                    </div>
                </div>

                {/* Reflection Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
            </div>

            {/* Decor Elements behind dashboard */}
            <div className="absolute -top-10 -right-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-[80px] -z-10" />
            <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-teal-500/20 rounded-full blur-[80px] -z-10" />
            
        </motion.div>
      </div>

    </section>
  );
}
