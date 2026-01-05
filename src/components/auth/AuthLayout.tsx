"use client";

import React from "react";
import Link from "next/link";
import { Scale, ArrowLeft, Lock, UserPlus, KeyRound, Mail, Shield } from "lucide-react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname();
  
  // More robust pathname matching
  const isSignIn = pathname?.startsWith("/sign-in") || pathname === "/sign-in";
  const isSignUp = pathname?.startsWith("/sign-up") || pathname === "/sign-up";
  const isForgotPassword = pathname?.startsWith("/forgot-password") || pathname === "/forgot-password";
  const isResetPassword = pathname?.startsWith("/reset-password") || pathname?.includes("/reset-password/");
  const isVerifyEmail = pathname?.startsWith("/verify-email") || pathname === "/verify-email";

  // Determine background variant
  let backgroundVariant = "default";
  if (isSignIn) backgroundVariant = "signin";
  else if (isSignUp) backgroundVariant = "signup";
  else if (isForgotPassword) backgroundVariant = "forgot";
  else if (isResetPassword) backgroundVariant = "reset";
  else if (isVerifyEmail) backgroundVariant = "verify";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
      {/* Background Layers - Dynamic based on page */}
      <div className="absolute inset-0 z-0">
        {backgroundVariant === "signin" && (
          <>
            {/* Security/Access Theme - Lock icons, secure documents */}
            <motion.div
              animate={{
                opacity: [0.3, 0.4, 0.3],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.35),transparent_60%)]"
            />
            <motion.div
              animate={{
                opacity: [0.25, 0.35, 0.25],
                scale: [1, 1.15, 1]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(34,197,94,0.3),transparent_60%)]"
            />
            {/* Lock pattern overlay */}
            <div 
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px),
                                 repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)`,
                backgroundSize: '40px 40px'
              }}
            />
            {/* Floating lock icons */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${12 + i * 20}%`,
                  top: `${18 + i * 18}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.12, 0.2, 0.12],
                  rotate: [0, 5, 0]
                }}
                transition={{
                  duration: 6 + i,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5
                }}
              >
                <Lock className="w-20 h-20 text-emerald-400/35" />
              </motion.div>
            ))}
          </>
        )}

        {backgroundVariant === "signup" && (
          <>
            {/* Growth/Registration Theme - Rising charts, documents */}
            <motion.div
              animate={{
                opacity: [0.35, 0.45, 0.35],
                scale: [1, 1.1, 1],
                y: [0, -10, 0]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.4),transparent_65%)]"
            />
            <motion.div
              animate={{
                opacity: [0.3, 0.4, 0.3],
                scale: [1, 1.2, 1],
                y: [0, 15, 0]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.35),transparent_65%)]"
            />
            {/* Document pattern */}
            <div 
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.15) 10px, rgba(255,255,255,0.15) 20px)`,
                backgroundSize: '60px 60px'
              }}
            />
            {/* Floating user plus icons */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${15 + i * 20}%`,
                  top: `${20 + i * 15}%`,
                }}
                animate={{
                  y: [0, -25, 0],
                  opacity: [0.15, 0.25, 0.15],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 5 + i * 0.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.7
                }}
              >
                <UserPlus className="w-24 h-24 text-emerald-400/40" />
              </motion.div>
            ))}
          </>
        )}

        {backgroundVariant === "forgot" && (
          <>
            {/* Recovery/Reset Theme - Key icons, refresh patterns */}
            <motion.div
              animate={{
                opacity: [0.3, 0.4, 0.3],
                scale: [1, 1.15, 1],
                rotate: [0, 5, 0]
              }}
              transition={{
                duration: 9,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_25%_40%,rgba(16,185,129,0.35),transparent_60%)]"
            />
            <motion.div
              animate={{
                opacity: [0.25, 0.35, 0.25],
                scale: [1, 1.2, 1],
                rotate: [0, -5, 0]
              }}
              transition={{
                duration: 11,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.5
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_75%_60%,rgba(34,197,94,0.3),transparent_60%)]"
            />
            {/* Circular refresh pattern */}
            <div 
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
                backgroundSize: '50px 50px'
              }}
            />
            {/* Floating key icons */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${10 + i * 20}%`,
                  top: `${15 + i * 18}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, 10, 0],
                  opacity: [0.12, 0.2, 0.12],
                  rotate: [0, 15, 0]
                }}
                transition={{
                  duration: 7 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.4
                }}
              >
                <KeyRound className="w-18 h-18 text-emerald-400/35" />
              </motion.div>
            ))}
          </>
        )}

        {backgroundVariant === "reset" && (
          <>
            {/* Security Update Theme - Shield icons, protection patterns */}
            <motion.div
              animate={{
                opacity: [0.35, 0.45, 0.35],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_40%_50%,rgba(16,185,129,0.4),transparent_65%)]"
            />
            <motion.div
              animate={{
                opacity: [0.3, 0.4, 0.3],
                scale: [1, 1.15, 1]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_60%_50%,rgba(34,197,94,0.35),transparent_65%)]"
            />
            {/* Shield pattern overlay */}
            <div 
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `repeating-linear-gradient(30deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 16px),
                                 repeating-linear-gradient(-30deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 16px)`,
                backgroundSize: '45px 45px'
              }}
            />
            {/* Floating shield icons */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${15 + i * 20}%`,
                  top: `${20 + i * 18}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0.15, 0.25, 0.15],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 6 + i * 0.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.5
                }}
              >
                <Shield className="w-20 h-20 text-emerald-400/40" />
              </motion.div>
            ))}
          </>
        )}

        {backgroundVariant === "verify" && (
          <>
            {/* Verification Theme - Mail icons, check patterns */}
            <motion.div
              animate={{
                opacity: [0.32, 0.42, 0.32],
                scale: [1, 1.12, 1]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_35%_45%,rgba(16,185,129,0.38),transparent_63%)]"
            />
            <motion.div
              animate={{
                opacity: [0.28, 0.38, 0.28],
                scale: [1, 1.18, 1]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.2
              }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_65%_55%,rgba(34,197,94,0.33),transparent_63%)]"
            />
            {/* Checkmark pattern */}
            <div 
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(255,255,255,0.15) 15px, rgba(255,255,255,0.15) 30px),
                                 repeating-linear-gradient(90deg, transparent, transparent 15px, rgba(255,255,255,0.15) 15px, rgba(255,255,255,0.15) 30px)`,
                backgroundSize: '55px 55px'
              }}
            />
            {/* Floating mail icons */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${15 + i * 20}%`,
                  top: `${20 + i * 18}%`,
                }}
                animate={{
                  y: [0, -22, 0],
                  opacity: [0.15, 0.22, 0.15],
                  scale: [1, 1.08, 1]
                }}
                transition={{
                  duration: 6.5 + i * 0.7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.6
                }}
              >
                <Mail className="w-20 h-20 text-emerald-400/40" />
              </motion.div>
            ))}
          </>
        )}

        {/* Default background for other pages */}
        {backgroundVariant === "default" && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.15),transparent_70%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(34,197,94,0.1),transparent_70%)]"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.02]"></div>
          </>
        )}

        {/* Tax compliance document pattern overlay - common to all */}
        <motion.div
          animate={{
            opacity: [0.05, 0.08, 0.05],
            x: [0, 20, 0],
            y: [0, 20, 0]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>
      
      {/* Top Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
      
      {/* Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-20 w-full border-b border-emerald-800/50 bg-emerald-950/80 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center shadow-lg group-hover:from-emerald-500 group-hover:to-emerald-600 transition-all duration-300 ring-2 ring-emerald-500/20">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white leading-tight">
                  TaxComply
                </span>
                <span className="text-xs text-emerald-300 leading-tight">NG</span>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="flex items-center gap-2 text-emerald-200 hover:text-white transition-colors font-medium text-sm px-3 py-2 rounded-lg hover:bg-emerald-900/50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </Link>
              
              {isSignIn && (
                <Link href="/sign-up">
                  <button className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-white hover:bg-emerald-50 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                    Sign Up
                  </button>
                </Link>
              )}
              
              {isSignUp && (
                <Link href="/sign-in">
                  <button className="px-4 py-2 text-sm font-semibold text-emerald-200 hover:text-white transition-colors">
                    Sign In
                  </button>
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>
      
      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8 sm:pb-12">
        {children}
      </div>
      
      {/* Bottom Border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
    </div>
  );
}
