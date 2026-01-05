"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export function EntranceOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [exitVariant, setExitVariant] = useState<any>({ opacity: 0 });

  useEffect(() => {
    // Check for mobile device (simple width check)
    const isMobile = window.innerWidth < 768;

    // Define possible exit animations
    // On mobile, force simple dissolve to prevent layout trashing/lag
    const variants = isMobile 
      ? [{ opacity: 0 }] 
      : [
          { x: "-100%", opacity: 0 }, // Slide Left
          { x: "100%", opacity: 0 },  // Slide Right
          { y: "-100%", opacity: 0 }, // Slide Top
          { y: "100%", opacity: 0 },  // Slide Bottom
          { opacity: 0 },             // Dissolve
        ];
    
    // Select one randomly
    const randomVariant = variants[Math.floor(Math.random() * variants.length)];
    setExitVariant(randomVariant);

    // Check if the overlay has been shown in this session
    const hasVisited = sessionStorage.getItem("taxcomply_visited");

    if (!hasVisited) {
      setIsVisible(true);

      // Auto-hide after animation sequence
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Mark as visited ONLY after the animation sequence completes
        sessionStorage.setItem("taxcomply_visited", "true");
      }, 3500); // 3.5 seconds total duration

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
            initial={{ opacity: 1 }}
            exit={exitVariant}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-[#022c22] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Background Ambient Glow - Reduced blur on mobile */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[60px] md:blur-[100px] rounded-full" />

          <div className="relative z-10 text-center">
            {/* Logo/Icon Animation */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mb-6 flex justify-center"
            >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center md:backdrop-blur-sm">
                    <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </div>
            </motion.div>

            {/* Brand Name Animation */}
            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2"
            >
                TaxComply NG
            </motion.h1>

             <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-emerald-200/60 text-sm tracking-widest uppercase"
            >
                Secure • Automated • Compliant
            </motion.p>
          </div>

          {/* Footer Attribution */}
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 1, delay: 0.8 }}
             className="absolute bottom-10 left-0 right-0 text-center"
          >
              <p className="text-emerald-500/40 text-xs font-medium tracking-widest font-mono">
                  from <span className="text-emerald-400/60">OpulenceDeveloper(s)</span>
              </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
