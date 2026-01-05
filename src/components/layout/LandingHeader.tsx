"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ButtonSize, AppRoutes } from "@/lib/utils/client-enums";
import { Menu, X, Scale, User } from "lucide-react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { motion, AnimatePresence } from "framer-motion";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAppSelector(
    (state) => state.user
  );

  // User data is now persisted from login - no need to fetch

  /**
   * Handle authenticated user icon click - navigate to dashboard
   */
  const handleUserIconClick = () => {
    router.push("/dashboard");
  };



  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 border-b border-emerald-700/50 shadow-xl backdrop-blur-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-md flex items-center justify-center shadow-lg group-hover:from-emerald-500 group-hover:to-emerald-600 transition-all duration-300 ring-2 ring-emerald-500/20">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white leading-tight">
                  TaxComply
                </span>
                <span className="text-xs text-emerald-300 leading-tight">NG</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href={AppRoutes.Features} 
              className={`transition-colors font-medium text-sm ${pathname === AppRoutes.Features ? "text-white" : "text-emerald-100 hover:text-white"}`}
            >
              Features
            </Link>
            <Link 
              href={AppRoutes.Pricing} 
              className={`transition-colors font-medium text-sm ${pathname === AppRoutes.Pricing ? "text-white" : "text-emerald-100 hover:text-white"}`}
            >
              Pricing
            </Link>
            <Link 
              href={AppRoutes.Compliance} 
              className={`transition-colors font-medium text-sm ${pathname === AppRoutes.Compliance ? "text-white" : "text-emerald-100 hover:text-white"}`}
            >
              Compliance
            </Link>
            <Link 
              href={AppRoutes.Resources} 
              className={`transition-colors font-medium text-sm ${pathname === AppRoutes.Resources ? "text-white" : "text-emerald-100 hover:text-white"}`}
            >
              Resources
            </Link> 
            <Link 
              href="/help-center"
              className="text-emerald-100 hover:text-white transition-colors font-medium text-sm"
            >
              Help
            </Link>
            <div className="h-6 w-px bg-emerald-700/50"></div>
            
            {/* Show authenticated user icon or sign in/sign up buttons */}
            {isAuthenticated && user ? (
              <button
                onClick={handleUserIconClick}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-emerald-800/50 hover:bg-emerald-700/50 transition-all duration-200 group"
                aria-label="Go to dashboard"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center ring-2 ring-emerald-400/50 group-hover:ring-emerald-300/50 transition-all">
                  {user.firstName && user.lastName ? (
                    <span className="text-white text-xs font-bold">
                      {user.firstName.charAt(0)}
                      {user.lastName.charAt(0)}
                    </span>
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <span className="text-emerald-100 group-hover:text-white transition-colors font-medium text-sm hidden sm:inline">
                  {user.firstName} {user.lastName}
                </span>
              </button>
            ) : (
              <>
                <Link 
                  href="/sign-in" 
                  className="text-emerald-100 hover:text-white transition-colors font-medium text-sm"
                >
                  Sign In
                </Link>
                <Link href="/sign-up">
                  <Button 
                    size={ButtonSize.Sm} 
                    className="bg-white text-white hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-md font-semibold"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-emerald-100 hover:text-white p-2 rounded-md hover:bg-emerald-800/50 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                closed: { 
                  opacity: 0, 
                  height: 0, 
                  overflow: "hidden",
                  transition: { duration: 0.3, ease: "easeInOut", when: "afterChildren" }
                },
                open: { 
                  opacity: 1, 
                  height: "auto",
                  overflow: "hidden",
                  transition: { duration: 0.3, ease: "easeInOut", when: "beforeChildren", staggerChildren: 0.1 }
                }
              }}
              className="md:hidden border-t border-emerald-700/50 bg-emerald-900/95 backdrop-blur-xl absolute left-0 right-0 shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                {[
                  { href: AppRoutes.Features, label: "Features" },
                  { href: AppRoutes.Pricing, label: "Pricing" },
                  { href: AppRoutes.Compliance, label: "Compliance" },
                  { href: AppRoutes.Resources, label: "Resources" },
                  { href: AppRoutes.HelpCenter, label: "Help" },
                ].map((item) => (
                  <motion.div
                    key={item.href}
                    variants={{
                      closed: { opacity: 0, x: -20 },
                      open: { opacity: 1, x: 0 }
                    }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block text-lg font-medium transition-colors ${pathname === item.href ? "text-white" : "text-emerald-100 hover:text-white"}`}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}

                <motion.div 
                   variants={{
                      closed: { opacity: 0, x: -20 },
                      open: { opacity: 1, x: 0 }
                    }}
                   className="h-px bg-emerald-700/50 my-4"
                />
                
                {/* Show authenticated user icon or sign in/sign up buttons */}
                {isAuthenticated && user ? (
                  <motion.div
                    variants={{
                      closed: { opacity: 0, x: -20 },
                      open: { opacity: 1, x: 0 }
                    }}
                  >
                    <button
                      onClick={() => {
                        handleUserIconClick();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-emerald-800/50 hover:bg-emerald-700/50 transition-all duration-200 border border-emerald-700/30"
                      aria-label="Go to dashboard"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center ring-2 ring-emerald-400/50 shadow-lg">
                        {user.firstName && user.lastName ? (
                          <span className="text-white text-sm font-bold">
                            {user.firstName.charAt(0)}
                            {user.lastName.charAt(0)}
                          </span>
                        ) : (
                          <User className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-semibold text-base">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-emerald-300 text-sm">Access Dashboard</p>
                      </div>
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-3 pt-2">
                    <motion.div
                       variants={{
                          closed: { opacity: 0, x: -20 },
                          open: { opacity: 1, x: 0 }
                        }}
                    >
                      <Link
                        href="/sign-in"
                        className="block w-full text-center text-emerald-100 hover:text-white transition-colors font-medium py-3 rounded-lg hover:bg-emerald-800/30"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                    </motion.div>
                    <motion.div
                       variants={{
                          closed: { opacity: 0, x: -20 },
                          open: { opacity: 1, x: 0 }
                        }}
                    >
                      <Link href="/sign-up" onClick={() => setMobileMenuOpen(false)} className="block">
                        <Button 
                          size={ButtonSize.Lg} 
                          className="w-full bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl font-bold shadow-lg"
                        >
                          Get Started
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
