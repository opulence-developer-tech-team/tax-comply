"use client";

import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText, CheckCircle2 } from "lucide-react";
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

export default function PrivacyPolicyPage() {
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
              <Shield className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
            <p className="text-lg text-slate-600">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </motion.div>

          {/* Introduction */}
          <motion.div variants={itemVariants}>
            <Card>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed">
                  At TaxTrack, we are committed to protecting your privacy and ensuring the security of your information. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use 
                  our tax management platform.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Company Information Collection */}
          <motion.div variants={itemVariants}>
            <Card title="Company Information Collection">
              <div className="flex items-center mb-4">
                <FileText className="w-5 h-5 text-emerald-600 mr-2" />
              </div>
              <div className="prose prose-slate max-w-none space-y-4">
                <p className="text-slate-700">
                  We collect company registration information to provide tax compliance services in accordance with 
                  Federal Inland Revenue Service (NRS) requirements. This information is essential for accurate tax 
                  calculations and compliance.
                </p>

                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-emerald-900 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    What We Collect
                  </h4>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start">
                      <span className="text-emerald-600 mr-2">•</span>
                      <span><strong>Company Name:</strong> Required for NRS-compliant invoices and tax documents</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-emerald-600 mr-2">•</span>
                      <span><strong>TIN (Tax Identification Number):</strong> Required for VAT-registered companies and tax filings</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-emerald-600 mr-2">•</span>
                      <span><strong>CAC Number:</strong> Used for company verification and compliance documentation</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-emerald-600 mr-2">•</span>
                      <span><strong>Annual Turnover:</strong> Determines tax classification (Small/Medium/Large) and tax obligations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-emerald-600 mr-2">•</span>
                      <span><strong>Company Address & Contact:</strong> Required for invoices, NRS correspondence, and tax records</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-blue-900 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    How We Use This Information
                  </h4>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Calculate accurate tax obligations based on NRS regulations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Generate NRS-compliant invoices and tax documents</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Ensure tax compliance and reduce audit risk</span>
                    </li>
                     <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Facilitate automated payroll and pension calculations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Verify company legitimacy and registration status</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>Provide compliance scoring and alerts</span>
                    </li>
                  </ul>
                </div>

                <p className="text-sm text-slate-600 italic">
                  <strong>Legal Basis:</strong> This information is required for tax compliance and is used solely for 
                  providing our tax management services. TIN and CAC numbers are company identifiers (not personal data) 
                  and are public registration numbers required by NRS for tax compliance.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Personal Information */}
          <motion.div variants={itemVariants}>
            <Card title="Personal Information">
              <div className="flex items-center mb-4">
                <Lock className="w-5 h-5 text-emerald-600 mr-2" />
              </div>
              <div className="prose prose-slate max-w-none space-y-4">
                <p className="text-slate-700">
                  We collect personal information necessary to provide our services and communicate with you:
                </p>
                <ul className="space-y-2 text-slate-700">
                  <li>• <strong>Account Information:</strong> Name, email address, phone number</li>
                  <li>• <strong>Authentication:</strong> Password (encrypted and never stored in plain text)</li>
                  <li>• <strong>Dashboard Activity:</strong> Logs of user actions within the dashboard for security and audit trails</li>
                  <li>• <strong>Financial Data:</strong> Invoices issued, expenses recorded, payroll data, and transaction history (used strictly for automated tax calculations)</li>
                </ul>
              </div>
            </Card>
          </motion.div>

          {/* How We Use Information */}
          <motion.div variants={itemVariants}>
            <Card title="How We Use Your Information">
              <div className="flex items-center mb-4">
                <Eye className="w-5 h-5 text-emerald-600 mr-2" />
              </div>
              <div className="prose prose-slate max-w-none space-y-4">
                <p className="text-slate-700">We use your information to:</p>
                <ul className="space-y-2 text-slate-700">
                  <li>• Provide automated tax calculation (VAT, CIT, WHT, PAYE) and compliance services</li>
                  <li>• Generate NRS-compliant invoices and tax documents</li>
                  <li>• Send tax reminders and important compliance updates via email</li>
                  <li>• Calculate compliance scores and provide alerts</li>
                  <li>• Improve our services and user experience</li>
                  <li>• Comply with legal obligations and respond to legal requests</li>
                </ul>
              </div>
            </Card>
          </motion.div>

          {/* Data Security */}
          <motion.div variants={itemVariants}>
            <Card title="Data Security">
              <div className="flex items-center mb-4">
                <Shield className="w-5 h-5 text-emerald-600 mr-2" />
              </div>
              <div className="prose prose-slate max-w-none space-y-4">
                <p className="text-slate-700">
                  We implement industry-standard security measures to protect your information:
                </p>
                <ul className="space-y-2 text-slate-700">
                  <li>• <strong>Encryption:</strong> All data is encrypted in transit (HTTPS) and at rest</li>
                  <li>• <strong>Access Controls:</strong> Only authorized personnel have access to your data</li>
                  <li>• <strong>Secure Storage:</strong> Data is stored in secure, monitored databases</li>
                  <li>• <strong>Regular Audits:</strong> We conduct regular security audits and assessments</li>
                  <li>• <strong>Data Backup:</strong> Regular backups ensure data availability and recovery</li>
                </ul>
              </div>
            </Card>
          </motion.div>

          {/* Data Retention */}
          <motion.div variants={itemVariants}>
            <Card title="Data Retention">
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700">
                  We retain your information for as long as your account is active and as necessary to provide our services. 
                  We may retain certain information for longer periods as required by law or for legitimate purposes, 
                  such as tax record keeping requirements.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Your Rights */}
          <motion.div variants={itemVariants}>
            <Card title="Your Rights">
              <div className="prose prose-slate max-w-none space-y-4">
                <p className="text-slate-700">You have the right to:</p>
                <ul className="space-y-2 text-slate-700">
                  <li>• <strong>Access:</strong> Request a copy of your data</li>
                  <li>• <strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li>• <strong>Deletion:</strong> Request deletion of your data (subject to legal retention requirements)</li>
                  <li>• <strong>Portability:</strong> Export your data in a machine-readable format</li>
                  <li>• <strong>Objection:</strong> Object to certain processing of your data</li>
                </ul>
                <p className="text-sm text-slate-600">
                  To exercise these rights, please contact us at{" "}
                  <a href="mailto:privacy@taxcomplycom" className="text-emerald-600 hover:underline">
                    privacy@taxcomplycom
                  </a>
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Contact */}
          <motion.div variants={itemVariants}>
            <Card title="Contact Us">
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700">
                  If you have questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="mt-4 space-y-2 text-slate-700">
                  <p>
                    <strong>Email:</strong>{" "}
                    <a href="mailto:privacy@taxcomplycom" className="text-emerald-600 hover:underline">
                      privacy@taxcomplycom
                    </a>
                  </p>
                  <p>
                    <Link href="/contact" className="text-emerald-600 hover:underline">
                      Contact Form
                    </Link>
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






