"use client";

import { motion } from "framer-motion";
import { Shield, CheckCircle2, FileText, TrendingUp } from "lucide-react";

export function ValuePropositionSection() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden bg-gradient-to-b from-white via-emerald-50/30 to-white">
      {/* Animated Background Layers */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Subtle Gradient Overlay */}
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.08), transparent 50%)",
              "radial-gradient(circle at 80% 50%, rgba(34, 197, 94, 0.08), transparent 50%)",
              "radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.08), transparent 50%)",
              "radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.08), transparent 50%)",
            ]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0"
        />
        
        {/* Subtle Radial Gradients */}
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(16,185,129,0.1),transparent_60%)]"
        />
        
        <motion.div
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 1.3, 1],
            opacity: [0.04, 0.08, 0.04]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(34,197,94,0.08),transparent_60%)]"
        />
        
        {/* Subtle Grid Pattern */}
        <motion.div
          animate={{
            opacity: [0.01, 0.03, 0.01],
            x: [0, 30, 0],
            y: [0, 30, 0]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(16,185,129,0.05) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(16,185,129,0.05) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* Subtle Floating Particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-emerald-400/10 rounded-full blur-sm"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + i * 10}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 20, 0],
              opacity: [0.05, 0.15, 0.05],
              scale: [1, 1.5, 1]
            }}
            transition={{
              duration: 5 + i * 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4
            }}
          />
        ))}
      </div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="text-center">
          {/* Main Content Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            {/* Glowing Border Effect */}
            <motion.div
              animate={{
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.02, 1]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600 rounded-3xl blur-xl"
            />
            
            <div className="relative bg-white/95 backdrop-blur-2xl border-2 border-emerald-500/20 rounded-3xl p-12 lg:p-16 shadow-2xl shadow-emerald-500/10">
              {/* Icon Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center justify-center w-20 h-20 mb-8 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 border-2 border-emerald-400 shadow-xl shadow-emerald-500/20"
              >
                <Shield className="w-10 h-10 text-white" />
              </motion.div>
              
              {/* Main Text */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-2xl sm:text-3xl lg:text-4xl font-light text-slate-800 leading-relaxed mb-8 max-w-4xl mx-auto"
              >
                This is a software tool that helps{" "}
                <span className="font-semibold bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent">
                  companies and individuals
                </span>{" "}
                automatically{" "}
                <span className="font-semibold bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent">
                  calculate, track, and comply
                </span>{" "}
                with Nigerian tax laws{" "}
                <span className="font-medium text-emerald-700">(VAT, PAYE, CIT, invoicing, and reporting)</span>, ensuring they{" "}
                <span className="font-semibold bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent">
                  avoid penalties
                </span>{" "}
                and stay{" "}
                <span className="font-semibold bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-400 bg-clip-text text-transparent">
                  audit-ready
                </span>.
              </motion.p>
              
              {/* Feature Pills */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-wrap items-center justify-center gap-4 mt-10"
              >
                {[
                  { icon: CheckCircle2, text: "Automated Calculations" },
                  { icon: FileText, text: "NRS Compliance" },
                  { icon: TrendingUp, text: "Real-time Tracking" },
                  { icon: Shield, text: "Audit-Ready" },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-50 border-2 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-lg transition-all duration-300"
                  >
                    <item.icon className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">{item.text}</span>
                  </motion.div>
                ))}
              </motion.div>
              
              {/* Decorative Elements */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.15, 0.3, 0.15],
                  x: [0, 20, 0],
                  y: [0, -20, 0]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -top-8 -right-8 w-40 h-40 bg-emerald-200/30 rounded-full blur-3xl"
              />
              <motion.div
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.1, 0.25, 0.1],
                  x: [0, -25, 0],
                  y: [0, 25, 0]
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.5
                }}
                className="absolute -bottom-8 -left-8 w-48 h-48 bg-emerald-100/40 rounded-full blur-3xl"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}



















