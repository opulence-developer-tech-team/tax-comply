"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { LandingFooter } from "@/components/layout/LandingFooter";
import { Button } from "@/components/ui/Button";
import { ButtonSize } from "@/lib/utils/client-enums";
import Link from "next/link";
import { 
  Search, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  FileText,
  Receipt,
  Calculator,
  Users,
  CreditCard,
  Shield,
  User,
  Sparkles,
  BookOpen,
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { VAT_RATE } from "@/lib/constants/tax";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  faqs: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: <Sparkles className="w-6 h-6" />,
    description: "Learn how to get started with TaxComply NG",
    faqs: [
      {
        question: "How do I create an account?",
        answer: "Click the 'Get Started' button in the header, fill in your email address and create a secure password. You'll receive a verification email with an OTP code. Enter the code to verify your email and complete registration."
      },
      {
        question: "What information do I need to onboard my company?",
        answer: "You'll need your CAC registration number, TIN (Tax Identification Number), company name, company type, and annual turnover. The platform automatically classifies your company as Small, Medium, or Large based on your turnover, which determines your tax obligations."
      },
      {
        question: "Is there a free plan available?",
        answer: "Yes! Our Free plan includes company onboarding, 10 invoices per month, automatic VAT calculation, compliance status indicator, and basic VAT summaries. You can upgrade anytime to unlock unlimited invoices and advanced features."
      },
      {
        question: "How do I verify my email?",
        answer: "After signing up, check your email inbox for a verification email from TaxComply NG. Enter the 6-digit OTP code on the verification page. If you didn't receive the email, click 'Resend OTP' or check your spam folder."
      }
    ]
  },
  {
    id: "e-invoicing",
    title: "E-Invoicing",
    icon: <Receipt className="w-6 h-6" />,
    description: "Everything about creating and managing invoices",
    faqs: [
      {
        question: "Are the invoices NRS-compliant?",
        answer: "Yes! All invoices generated on TaxComply NG are fully compliant with NRS (Federal Inland Revenue Service) requirements. They include mandatory fields, proper VAT calculations, and meet all Nigerian tax regulations."
      },
      {
        question: "How does automatic VAT calculation work?",
        answer: `The platform automatically calculates ${VAT_RATE}% VAT on all taxable items as per Nigeria's standard VAT rate. VAT is applied to the subtotal, and the invoice clearly shows the item total, VAT amount, and grand total.`
      },
      {
        question: "Can I customize invoice numbers?",
        answer: "Invoice numbers are automatically generated in a sequential format to maintain an audit trail. The system ensures each invoice has a unique, compliant invoice number for record-keeping and NRS requirements."
      },
      {
        question: "How do I add customers to my database?",
        answer: "When creating an invoice, you can add customer details (name, email, address, phone). The system saves these in your customer database, so you can quickly select them for future invoices. You can also manage your customer list from the invoices section."
      },
      {
        question: "Can I download invoices as PDF?",
        answer: "Yes! All invoices can be downloaded as PDF files. Starter plan and above get PDFs without watermarks. The PDFs are print-ready and suitable for official use and record-keeping."
      },
      {
        question: "What happens if I exceed my monthly invoice limit?",
        answer: "Free plan users are limited to 10 invoices per month. If you reach this limit, you'll be prompted to upgrade to a Starter or Company plan for unlimited invoices. Your existing invoices remain accessible."
      }
    ]
  },
  {
    id: "vat-tax",
    title: "VAT & Tax",
    icon: <Calculator className="w-6 h-6" />,
    description: "Understanding VAT tracking and tax calculations",
    faqs: [
      {
        question: "What is Input VAT vs Output VAT?",
        answer: `Output VAT is the VAT you collect from customers on sales (${VAT_RATE}% of taxable items). Input VAT is the VAT you pay on company purchases. The difference between Output and Input VAT determines whether you owe VAT or are due a refund.`
      },
      {
        question: "How often are VAT summaries generated?",
        answer: "VAT summaries are automatically generated monthly. The system tracks all your Input and Output VAT transactions throughout the month and provides a comprehensive summary showing your VAT position at month-end."
      },
      {
        question: "What does 'VAT Payable' vs 'VAT Refundable' mean?",
        answer: "If your Output VAT (collected) exceeds Input VAT (paid), you have VAT Payable - meaning you owe NRS. If Input VAT exceeds Output VAT, you have VAT Refundable - meaning you may be eligible for a refund from NRS."
      },
      {
        question: "How does the platform track my VAT automatically?",
        answer: "Every invoice you create records Output VAT automatically. You can also manually record Input VAT from purchases. The system calculates your monthly VAT position, tracks payable/refundable amounts, and alerts you to any discrepancies."
      },
      {
        question: "What tax brackets apply to my company?",
        answer: `PAYE tax brackets apply to employees: 7% (first ₦300k), 11% (next ₦300k), 15% (next ₦500k), 19% (next ₦500k), 21% (next ₦1.6M), 24% (above ₦3.2M). VAT is ${VAT_RATE}% standard rate. Small companies (turnover < ₦25M) are CIT-exempt.`
      }
    ]
  },
  {
    id: "payroll-paye",
    title: "Payroll & PAYE",
    icon: <Users className="w-6 h-6" />,
    description: "Managing employees and calculating PAYE",
    faqs: [
      {
        question: "Which plan includes payroll features?",
        answer: "Payroll and PAYE automation are available on the Company plan (₦8,500/month) and above. This includes employee management, automatic PAYE calculations, pension contributions, and NHF deductions."
      },
      {
        question: "How does PAYE calculation work?",
        answer: "The system uses Nigeria's progressive tax brackets to calculate PAYE automatically. It considers gross salary, applies the appropriate tax rate for each bracket, and deducts allowances, pension contributions, and NHF before calculating taxable income."
      },
      {
        question: "What are the pension and NHF contribution rates?",
        answer: "Employee pension contribution is 8% of gross salary. NHF (National Housing Fund) is 2.5% of gross salary, capped at ₦2,500,000 annual income. The platform calculates these automatically and includes them in payroll schedules."
      },
      {
        question: "Can I generate monthly PAYE schedules?",
        answer: "Yes! The Company plan includes automatic generation of monthly PAYE schedules. These show all employees, their gross salaries, deductions (PAYE, pension, NHF), and net pay. You can export these as PDF, CSV, or Excel files."
      },
      {
        question: "How do I add employees to the system?",
        answer: "Navigate to the Payroll section, click 'Add Employee', and enter employee details including name, email, gross salary, and tax identification number (if available). The system automatically calculates their PAYE, pension, and NHF deductions."
      }
    ]
  },
  {
    id: "subscriptions",
    title: "Subscriptions & Billing",
    icon: <CreditCard className="w-6 h-6" />,
    description: "Managing your subscription and payments",
    faqs: [
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major payment methods through Monnify(Moniepoint), including debit cards, credit cards, and bank transfers. All payments are processed securely and encrypted."
      },
      {
        question: "Can I pay annually instead of monthly?",
        answer: "Yes! All plans offer both monthly and annual payment options. Annual plans offer significant savings - for example, the Starter plan is ₦40,000/year (equivalent to ₦3,333/month) vs ₦4,000/month."
      },
      {
        question: "How do I upgrade or downgrade my plan?",
        answer: "Go to your Subscription page in the dashboard, select your desired plan, and complete the payment. Upgrading is immediate. Downgrading takes effect at the end of your current billing cycle. Data is preserved across plan changes."
      },
      {
        question: "What happens to my data if I cancel?",
        answer: "Your data remains accessible during your paid period. After cancellation, you'll be moved to the Free plan. Your invoices, VAT records, and reports remain accessible, but you'll be limited to 10 invoices per month."
      },
      {
        question: "Can I get a refund?",
        answer: "Refunds are handled on a case-by-case basis. Contact our support team at contact@taxcomply.com.ng with your request. Generally, refunds are not available for partial months, but we're happy to discuss your specific situation."
      },
      {
        question: "Do you offer plans for accountants or agencies?",
        answer: "Yes! Our Accountant/Agency plan (₦25,000/month) includes everything in the Company plan plus multi-company management, advanced reporting, priority support, and custom features. Contact us for enterprise pricing."
      }
    ]
  },
  {
    id: "compliance",
    title: "Compliance & Reporting",
    icon: <Shield className="w-6 h-6" />,
    description: "Staying compliant and audit-ready",
    faqs: [
      {
        question: "How does the compliance dashboard work?",
        answer: "The compliance dashboard shows your overall compliance status (Compliant/At Risk), a compliance score (0-100), and specific risk alerts. It checks for missing invoices, VAT discrepancies, payroll issues, and missing TIN/CAC information."
      },
      {
        question: "What are compliance risk alerts?",
        answer: "Risk alerts notify you of potential compliance issues: missing invoices in VAT calculations, VAT input/output mismatches, incomplete employee records, missing TIN or CAC numbers, and approaching tax deadlines. Each alert shows severity (High/Medium/Low)."
      },
      {
        question: "Can I export reports for my accountant?",
        answer: "Yes! All plans include export functionality. You can export invoices, VAT summaries, payroll schedules, and compliance reports as PDF, CSV, or Excel files. These are audit-ready and suitable for sharing with accountants or NRS."
      },
      {
        question: "How do I track tax deadlines?",
        answer: "The compliance dashboard includes a tax deadlines calendar showing all important dates: VAT filing deadlines, PAYE submission dates, and annual tax return deadlines. You'll receive alerts as deadlines approach."
      },
      {
        question: "Is my data secure and audit-ready?",
        answer: "Absolutely! All data is encrypted, backed up regularly, and stored securely. The platform maintains complete audit trails for all transactions. Reports generated are NRS-compliant and suitable for official audits."
      }
    ]
  },
  {
    id: "account",
    title: "Account Management",
    icon: <User className="w-6 h-6" />,
    description: "Managing your account and settings",
    faqs: [
      {
        question: "How do I reset my password?",
        answer: "Click 'Sign In', then 'Forgot Password'. Enter your email address, and you'll receive a password reset link. Click the link, create a new secure password, and you'll be able to sign in with your new credentials."
      },
      {
        question: "Can I have multiple users on my account?",
        answer: "Yes! Company plans and above support multi-user access with role-based permissions. You can invite team members as Owners, Accountants, or Staff with appropriate access levels. Free and Starter plans are single-user."
      },
      {
        question: "How do I update my company information?",
        answer: "Go to Company Settings in your dashboard. You can update company name, address, contact details, and other information. Note that CAC and TIN changes may require verification."
      },
      {
        question: "What if I forget my OTP code?",
        answer: "You can request a new OTP code by clicking 'Resend OTP' on the verification page. OTP codes expire after 10 minutes for security. If you continue to have issues, contact support at contact@taxcomply.com.ng."
      },
      {
        question: "Can I delete my account?",
        answer: "Yes, but this action is permanent and will delete all your data including invoices, VAT records, and payroll information. Before deleting, export any data you need. Contact support if you want to proceed with account deletion."
      }
    ]
  }
];

export default function HelpCenterPage() {
  const [inputValue, setInputValue] = useState(""); // What user is typing
  const [activeSearchQuery, setActiveSearchQuery] = useState(""); // What's actually being searched
  const [expandedFAQ, setExpandedFAQ] = useState<{ category: string; index: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-100px" });
  
  const categoriesRef = useRef(null);
  const categoriesInView = useInView(categoriesRef, { once: true, margin: "-50px" });
  const faqSectionRef = useRef<HTMLDivElement>(null);

  // Handle search execution
  const handleSearch = () => {
    setActiveSearchQuery(inputValue.trim());
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setInputValue("");
      setActiveSearchQuery("");
    }
  };

  // Clear search
  const clearSearch = () => {
    setInputValue("");
    setActiveSearchQuery("");
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      input?.focus();
    }, 100);
  };

  // Helper function to highlight search terms
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-emerald-200 text-emerald-900 font-semibold px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Filter FAQs based on active search query with memoization for performance
  const filteredCategories = useMemo(() => {
    if (!activeSearchQuery.trim()) {
      return faqCategories.map(category => ({
        ...category,
        faqs: category.faqs.map((faq, index) => ({
          ...faq,
          originalIndex: index,
        }))
      }));
    }
    
    const query = activeSearchQuery.toLowerCase();
    const filtered = faqCategories.map(category => {
      const filteredFAQs = category.faqs
        .map((faq, index) => ({
          ...faq,
          originalIndex: index,
        }))
        .filter(faq => 
          faq.question.toLowerCase().includes(query) || 
          faq.answer.toLowerCase().includes(query)
        );
      
      return { ...category, faqs: filteredFAQs };
    }).filter(category => category.faqs.length > 0);
    
    return filtered;
  }, [activeSearchQuery]);

  // Calculate total results count
  const totalResults = useMemo(() => {
    return filteredCategories.reduce((sum, category) => sum + category.faqs.length, 0);
  }, [filteredCategories]);

  // Auto-expand first matching FAQ when searching
  useEffect(() => {
    if (activeSearchQuery.trim() && filteredCategories.length > 0) {
      const firstCategory = filteredCategories[0];
      if (firstCategory.faqs.length > 0) {
        const firstFAQ = firstCategory.faqs[0];
        setExpandedFAQ({ 
          category: firstCategory.id, 
          index: firstFAQ.originalIndex ?? 0
        });
        // Scroll to FAQ section after a brief delay
        setTimeout(() => {
          faqSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    } else if (!activeSearchQuery.trim()) {
      // Collapse all when search is cleared
      setExpandedFAQ(null);
    }
  }, [activeSearchQuery, filteredCategories]);

  // Reset selected category when searching
  useEffect(() => {
    if (activeSearchQuery.trim()) {
      setSelectedCategory(null);
    }
  }, [activeSearchQuery]);

  const toggleFAQ = (categoryId: string, index: number) => {
    if (expandedFAQ?.category === categoryId && expandedFAQ?.index === index) {
      setExpandedFAQ(null);
    } else {
      setExpandedFAQ({ category: categoryId, index });
    }
  };

  const scrollToCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const element = document.getElementById(categoryId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="relative bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 overflow-hidden pt-24 pb-16"
      >
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl"
            animate={{
              x: [0, -80, 0],
              y: [0, -40, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl"
            animate={{
              x: [-50, 50, -50],
              y: [-30, 30, -30],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* Help/Question Mark Pattern - Balanced Visibility */}
        <div 
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M100 40c-11 0-20 9-20 20h8c0-6.6 5.4-12 12-12s12 5.4 12 12c0 8-12 10-12 18v4h8v-2c0-8 12-10 12-20 0-11-9-20-20-20zm-8 44h16v8H92v-8z' fill='%23ffffff'/%3E%3C/svg%3E")`,
            backgroundSize: '300px 300px',
            backgroundPosition: '50% 50%',
          }}
        ></div>

        {/* Accounting Grid Pattern - Balanced Visibility */}
        <div 
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 40px,
                rgba(255, 255, 255, 0.2) 40px,
                rgba(255, 255, 255, 0.2) 41px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 120px,
                rgba(255, 255, 255, 0.15) 120px,
                rgba(255, 255, 255, 0.15) 121px
              )
            `,
          }}
        ></div>

        {/* Document/Form Lines Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 100px,
                rgba(255, 255, 255, 0.18) 100px,
                rgba(255, 255, 255, 0.18) 101px
              )
            `,
            backgroundPosition: '40px 0',
          }}
        ></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            variants={containerVariants}
            className="text-center"
          >
            <motion.div variants={itemVariants} className="mb-6">
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 rounded-full text-emerald-200 text-sm font-medium mb-6"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Find answers to common questions</span>
              </motion.div>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6"
            >
              <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent">
                Help Center
              </span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-xl md:text-2xl text-emerald-100 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Everything you need to know about TaxComply NG, tax compliance, and staying audit-ready
            </motion.p>

            {/* Search Bar */}
            <motion.div variants={itemVariants} className="max-w-2xl mx-auto">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-300 w-5 h-5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search for answers... (e.g., 'invoice', 'VAT', 'subscription')"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border-2 border-emerald-400/30 rounded-xl text-white placeholder-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-300 text-lg"
                    autoComplete="off"
                    aria-label="Search help center"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={!inputValue.trim()}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Search
                </Button>
              </div>
              {(inputValue || activeSearchQuery) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 flex items-center justify-center gap-4"
                >
                  {activeSearchQuery && (
                    <button
                      onClick={clearSearch}
                      className="text-sm text-emerald-200 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <ChevronUp className="w-4 h-4 rotate-180" />
                      Clear search
                    </button>
                  )}
                  <p className="text-sm text-emerald-200 text-center">
                    Press <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Enter</kbd> to search
                  </p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Quick Categories */}
      <section className="bg-gradient-to-b from-emerald-50 to-white py-12 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            ref={categoriesRef}
            initial="hidden"
            animate={categoriesInView ? "visible" : "hidden"}
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4"
          >
            {faqCategories.map((category, index) => (
              <motion.button
                key={category.id}
                variants={itemVariants}
                onClick={() => scrollToCategory(category.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 text-center group ${
                  selectedCategory === category.id
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-lg scale-105"
                    : "bg-white border-emerald-200 text-emerald-900 hover:border-emerald-400 hover:shadow-md"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`${
                    selectedCategory === category.id ? "text-white" : "text-emerald-600"
                  } transition-colors`}>
                    {category.icon}
                  </div>
                  <span className="text-xs font-semibold">{category.title}</span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section ref={faqSectionRef} className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Results Count */}
          {activeSearchQuery.trim() && filteredCategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-emerald-50 border-l-4 border-emerald-600 rounded-r-lg"
            >
              <p className="text-emerald-900 font-medium">
                Found <span className="font-bold text-emerald-700">{totalResults}</span>{" "}
                {totalResults === 1 ? "result" : "results"} for "{activeSearchQuery}"
              </p>
            </motion.div>
          )}

          {activeSearchQuery.trim() && filteredCategories.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600 mb-6">
                No FAQs match "{activeSearchQuery}". Try different keywords or browse categories above.
              </p>
              <Button
                onClick={clearSearch}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              {filteredCategories.map((category) => (
                <motion.div
                  key={category.id}
                  id={category.id}
                  variants={itemVariants}
                  className="mb-16 scroll-mt-24"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                      {category.icon}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">{category.title}</h2>
                      <p className="text-gray-600 mt-1">{category.description}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {category.faqs.map((faq, filteredIndex) => {
                      // Get the original index for expansion tracking
                      const originalIndex = faq.originalIndex ?? filteredIndex;
                      const isExpanded = expandedFAQ?.category === category.id && 
                                       expandedFAQ?.index === originalIndex;
                      
                      return (
                        <motion.div
                          key={filteredIndex}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: filteredIndex * 0.05 }}
                          className="border-2 border-emerald-100 rounded-xl overflow-hidden hover:border-emerald-300 transition-colors duration-300"
                        >
                          <button
                            onClick={() => toggleFAQ(category.id, originalIndex)}
                            className="w-full px-6 py-5 text-left flex items-center justify-between bg-white hover:bg-emerald-50 transition-colors duration-200"
                          >
                            <span className="font-semibold text-gray-900 pr-4">
                              {activeSearchQuery.trim() 
                                ? highlightText(faq.question, activeSearchQuery)
                                : faq.question
                              }
                            </span>
                            <motion.div
                              animate={{ rotate: isExpanded ? 180 : 0 }}
                              transition={{ duration: 0.3 }}
                              className="shrink-0 text-emerald-600"
                            >
                              <ChevronDown className="w-5 h-5" />
                            </motion.div>
                          </button>
                          <motion.div
                            initial={false}
                            animate={{
                              height: isExpanded ? "auto" : 0,
                              opacity: isExpanded ? 1 : 0,
                            }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 py-5 bg-gradient-to-br from-emerald-50 to-white border-t border-emerald-100">
                              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                {activeSearchQuery.trim() 
                                  ? highlightText(faq.answer, activeSearchQuery)
                                  : faq.answer
                                }
                              </p>
                            </div>
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Contact CTA Section */}
      <section className="py-16 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <MessageSquare className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Still need help?
            </h2>
            <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
              Can't find what you're looking for? Our support team is here to help you stay compliant and audit-ready.
            </p>
            <Link href="/contact">
              <Button
                size={ButtonSize.Lg}
                className="bg-white text-white hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-4 text-lg font-semibold inline-flex items-center gap-2"
              >
                Contact Support
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}





