"use client";

import { motion } from "framer-motion";
import { Scale, FileText, Globe, Shield, AlertTriangle, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { LandingFooter } from "@/components/layout/LandingFooter";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <LandingHeader />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Scale className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
            <p className="text-lg text-slate-600">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </motion.div>

          {/* Introduction */}
          <motion.div variants={itemVariants}>
            <Card>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed">
                  Welcome to TaxComply NG. By accessing or using our website and services, you agree to be bound by these 
                  Terms of Service and our Privacy Policy. If you strictly disagree with any part of these terms, 
                  please discontinue use of our services immediately.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Use of Service */}
          <motion.div variants={itemVariants}>
            <Card title="1. Use of Our Service">
              <div className="flex items-center mb-4">
                <Globe className="w-5 h-5 text-emerald-600 mr-2" />
              </div>
              <div className="prose prose-slate max-w-none space-y-4">
                <p className="text-slate-700">
                  TaxComply NG provides a tax management platform designed to help Nigerian businesses and individuals compliant 
                  with the Nigeria Revenue Service (NRS). You agree to use the service only for lawful purposes 
                  and in accordance with these Terms.
                </p>
                <ul className="space-y-2 text-slate-700">
                  <li>• You must provide accurate and complete information during registration.</li>
                  <li>• You are responsible for maintaining the confidentiality of your account credentials.</li>
                  <li>• You may not use the service to commit fraud or evade taxes.</li>
                  <li>• We reserve the right to suspend or terminate accounts that violate these terms.</li>
                </ul>
              </div>
            </Card>
          </motion.div>

          {/* User Responsibilities */}
          <motion.div variants={itemVariants}>
             <Card title="2. User Responsibilities">
                <div className="flex items-center mb-4">
                  <FileText className="w-5 h-5 text-emerald-600 mr-2" />
                </div>
                <div className="prose prose-slate max-w-none space-y-4">
                  <p className="text-slate-700">
                    While we automate calculations, you remain ultimately responsible for your tax compliance.
                  </p>
                  <ul className="space-y-2 text-slate-700">
                    <li>• <strong>Data Accuracy:</strong> You represent that all financial data (invoices, expenses, payroll) entered is accurate.</li>
                    <li>• <strong>Filing:</strong> You acknowledge that TaxComply NG assists with calculations and generation of reports, but the final responsibility for filing and payment to NRS lies with you, unless explicitly stated otherwise in a specific service agreement.</li>
                    <li>• <strong>Compliance:</strong> It is your duty to verify that your business structure and activities align with Nigerian laws.</li>
                  </ul>
                </div>
             </Card>
          </motion.div>

          {/* Subscriptions */}
          <motion.div variants={itemVariants}>
            <Card title="3. Subscription & Payments">
              <div className="prose prose-slate max-w-none space-y-4">
                <p className="text-slate-700">
                  Certain features of the Service are billed on a subscription basis ("Subscription(s)").
                </p>
                <ul className="space-y-2 text-slate-700">
                  <li>• <strong>Billing:</strong> You will be billed in advance on a recurring and periodic basis (monthly or annually).</li>
                  <li>• <strong>Payment Processing:</strong> Payments are processed securely via Monnify. We do not store your full card details.</li>
                  <li>• <strong>Cancellation:</strong> You may cancel your subscription at any time. Your access will continue until the end of the current billing period. Refunds are generally not provided for partial months.</li>
                  <li>• <strong>Price Changes:</strong> We reserve the right to adjust pricing, with reasonable notice provided to you.</li>
                </ul>
              </div>
            </Card>
          </motion.div>

          {/* Intellectual Property */}
           <motion.div variants={itemVariants}>
            <Card title="4. Intellectual Property">
              <div className="flex items-center mb-4">
                <Shield className="w-5 h-5 text-emerald-600 mr-2" />
              </div>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700">
                  The Service and its original content (excluding Content provided by users), features, and functionality 
                  are and will remain the exclusive property of TaxComply NG and its licensors. The Service is protected 
                  by copyright, trademark, and other laws of Nigeria.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Limitation of Liability */}
          <motion.div variants={itemVariants}>
            <Card title="5. Limitation of Liability">
               <div className="flex items-center mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              </div>
              <div className="prose prose-slate max-w-none space-y-4">
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                  <p className="text-amber-900 text-sm font-semibold">
                    Important Disclaimer
                  </p>
                  <p className="text-amber-800 mt-1">
                    TaxComply NG is a software tool, not a certified tax advisory firm. The information provided by the 
                    Platform is for general guidance and automation purposes.
                  </p>
                </div>
                <p className="text-slate-700">
                  In no event shall TaxComply NG, nor its directors, employees, partners, agents, suppliers, or affiliates, 
                  be liable for any indirect, incidental, special, consequential or punitive damages, including without 
                  limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your 
                  access to or use of or inability to access or use the Service; or any conduct or content of any third party 
                  on the Service.
                </p>
                <p className="text-slate-700">
                  We are not liable for any penalties, interest, or fines imposed by the NRS or other tax authorities 
                  resulting from data entry errors, misclassification by the user, or changes in tax laws not yet reflected in the system.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Governing Law */}
          <motion.div variants={itemVariants}>
            <Card title="6. Governing Law">
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700">
                  These Terms shall be governed and construed in accordance with the laws of the Federal Republic of Nigeria, 
                  without regard to its conflict of law provisions. Our failure to enforce any right or provision of these 
                  Terms will not be considered a waiver of those rights.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Contact */}
          <motion.div variants={itemVariants}>
            <Card title="Contact Us">
               <div className="flex items-center mb-4">
                <HelpCircle className="w-5 h-5 text-emerald-600 mr-2" />
              </div>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700">
                  If you have any questions about these Terms, please contact us:
                </p>
                <div className="mt-4 space-y-2 text-slate-700">
                   <p>
                    <Link href="/contact" className="text-emerald-600 hover:underline">
                      Contact Support
                    </Link>
                  </p>
                  <p>
                    <strong>Email:</strong>{" "}
                    <a href="mailto:legal@taxcomply.com.ng" className="text-emerald-600 hover:underline">
                      legal@taxcomply.com.ng
                    </a>
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Back Link */}
          <motion.div variants={itemVariants} className="text-center pt-8">
            <Link
              href="/"
              className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium"
            >
              ← Back to Home
            </Link>
          </motion.div>
        </motion.div>
      </div>
      <LandingFooter />
    </div>
  );
}
