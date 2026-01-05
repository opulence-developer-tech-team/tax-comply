"use client";

import { HttpMethod } from "@/lib/utils/http-method";
import { SubmitStatus } from "@/lib/utils/submit-status";
import { ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { LandingHeader } from "@/components/layout/LandingHeader";
import { LandingFooter } from "@/components/layout/LandingFooter";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Building2,
  Globe,
  RefreshCw
} from "lucide-react";
import { getErrorMessage, getErrorType } from "@/components/shared/errorUtils";

interface FormData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  company?: string;
  phone?: string;
}

export default function ContactPage() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>(SubmitStatus.Idle);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRetryable, setIsRetryable] = useState<boolean>(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate all fields using the validateField function
    const fieldsToValidate: (keyof FormData)[] = ["name", "email", "subject", "message", "company", "phone"];
    
    fieldsToValidate.forEach((field) => {
      const error = validateField(field, formData[field] || "");
      if (error) {
        newErrors[field as keyof FormErrors] = error;
      }
    });

    setErrors(newErrors);
    
    // If there are errors, scroll to the first error field
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0] as keyof FormErrors;
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`) || 
                          document.querySelector(`#${firstErrorField}`) ||
                          document.querySelector(`input[aria-label*="${firstErrorField}"]`);
      
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
        (errorElement as HTMLElement).focus();
      }
    }
    
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Standardized error handler using error utilities
   * CRITICAL: All server errors (500+) return "Something went wrong"
   */
  const handleError = (response: Response | null, error: Error | null): { message: string; retryable: boolean } => {
    // Create a mock error object for standardized error handling
    let errorObj: any = error;
    
    // If we have a response, create an axios-like error structure
    if (response) {
      errorObj = {
        response: {
          status: response.status,
          statusText: response.statusText,
          data: null, // Will be populated if needed
        },
      };
    }
    
    // Use standardized error utilities
    const errorType = getErrorType(errorObj);
    const errorMessage = getErrorMessage(errorObj);
    
    // Determine if error is retryable (network errors and server errors)
    const retryable = errorType === "network" || errorType === "server";
    
    return { message: errorMessage, retryable };
  };

  const submitForm = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitStatus(SubmitStatus.Idle);
    setErrorMessage("");
    setIsRetryable(false);
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const url = `${apiUrl}/api/v1/contact`;
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        method: HttpMethod.POST,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is ok (status 200-299)
      if (response.ok) {
        try {
          const data = await response.json();
          
          // Check if server returned success message
          if (data?.message === "success" || response.status === 200) {
            setSubmitStatus(SubmitStatus.Success);
            setErrorMessage("");
            setFormData({
              name: "",
              email: "",
              company: "",
              phone: "",
              subject: "",
              message: "",
            });
            setErrors({});

            // Reset success message after 8 seconds
            setTimeout(() => setSubmitStatus(SubmitStatus.Idle), 8000);
            return;
          } else {
            // Server returned non-success message
            const { message, retryable } = handleError(response, null);
            setErrorMessage(message);
            setIsRetryable(retryable);
            setSubmitStatus(SubmitStatus.Error);
            setTimeout(() => {
              setSubmitStatus(SubmitStatus.Idle);
              setErrorMessage("");
            }, 10000);
            return;
          }
        } catch (parseError) {
          // Failed to parse response, but status is ok
          setSubmitStatus(SubmitStatus.Success);
          setErrorMessage("");
          setFormData({
            name: "",
            email: "",
            company: "",
            phone: "",
            subject: "",
            message: "",
          });
          setErrors({});
          setTimeout(() => setSubmitStatus(SubmitStatus.Idle), 8000);
          return;
        }
      } else {
        // Response not ok, handle error
        const { message, retryable } = handleError(response, null);
        setErrorMessage(message);
        setIsRetryable(retryable);
        setSubmitStatus(SubmitStatus.Error);
        setTimeout(() => {
          setSubmitStatus(SubmitStatus.Idle);
          setErrorMessage("");
        }, 10000);
        return;
      }
    } catch (error) {
      // Catch network errors, timeouts, and other exceptions
      let errorInstance: Error | null = null;
      
      if (error instanceof Error) {
        errorInstance = error;
      } else if (typeof error === "string") {
        errorInstance = new Error(error);
      } else {
        errorInstance = new Error("Unknown error occurred");
      }

      // Handle error using standardized error utilities
      const { message, retryable } = handleError(null, errorInstance);
      setErrorMessage(message);
      setIsRetryable(retryable);
      
      setSubmitStatus(SubmitStatus.Error);
      setTimeout(() => {
        setSubmitStatus(SubmitStatus.Idle);
        setErrorMessage("");
      }, 10000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitForm();
  };

  const handleRetry = () => {
    submitForm();
  };

  const validateField = (field: keyof FormData, value: string): string | undefined => {
    switch (field) {
      case "name":
        if (!value.trim()) {
          return "Name is required";
        }
        if (value.trim().length < 2) {
          return "Name must be at least 2 characters";
        }
        if (value.trim().length > 100) {
          return "Name must be less than 100 characters";
        }
        break;
      case "email":
        if (!value.trim()) {
          return "Email is required";
        }
        if (!validateEmail(value)) {
          return "Please enter a valid email address";
        }
        if (value.length > 255) {
          return "Email must be less than 255 characters";
        }
        break;
      case "subject":
        if (!value.trim()) {
          return "Subject is required";
        }
        if (value.trim().length < 3) {
          return "Subject must be at least 3 characters";
        }
        if (value.trim().length > 200) {
          return "Subject must be less than 200 characters";
        }
        break;
      case "message":
        if (!value.trim()) {
          return "Message is required";
        }
        if (value.trim().length < 10) {
          return "Message must be at least 10 characters";
        }
        if (value.trim().length > 5000) {
          return "Message must be less than 5000 characters";
        }
        break;
      case "company":
        if (value.trim().length > 200) {
          return "Company name must be less than 200 characters";
        }
        break;
      case "phone":
        if (value.trim() && value.trim().length > 20) {
          return "Phone number must be less than 20 characters";
        }
        // Optional phone validation - basic format check
        if (value.trim() && !/^[\d\s\-\+\(\)]+$/.test(value)) {
          return "Please enter a valid phone number";
        }
        break;
    }
    return undefined;
  };

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation for required fields
    if (field === "name" || field === "email" || field === "subject" || field === "message") {
      const error = validateField(field, value);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof FormErrors];
          return newErrors;
        });
      }
    } else {
      // Optional fields - validate but don't show error until blur
      const error = validateField(field, value);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      } else if (errors[field as keyof FormErrors]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof FormErrors];
          return newErrors;
        });
      }
    }
  };

  const handleBlur = (field: keyof FormData) => (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    const error = validateField(field, value);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative py-12 lg:py-16 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-900/20 to-emerald-950"></div>
        
        {/* Floating Orbs */}
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"
          animate={{
            y: [0, 20, 0],
            x: [0, -15, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: 0.1,
                type: "spring",
                stiffness: 200
              }}
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-md bg-emerald-900/50 border border-emerald-700/50 mb-6 backdrop-blur-sm"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >
                <MessageSquare className="w-4 h-4 text-emerald-300" />
              </motion.div>
              <span className="text-sm font-semibold text-emerald-100">Get in Touch</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight"
            >
              Let's Talk About
              <br />
              <motion.span 
                className="bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent inline-block"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  backgroundSize: "200% 200%",
                }}
              >
                Your Tax Needs
              </motion.span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg sm:text-xl text-slate-300 leading-relaxed"
            >
              Our team is ready to help you stay compliant, avoid penalties, and streamline your tax processes.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section ref={ref} className="relative py-20 lg:py-24 bg-gradient-to-b from-white via-emerald-50/30 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-24 space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-6">Contact Information</h2>
                  <p className="text-slate-600 mb-8 leading-relaxed">
                    Reach out to us through any of these channels. We typically respond within 24 hours.
                  </p>
                </div>

                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex items-start space-x-4 p-6 rounded-xl bg-white border-2 border-emerald-100 shadow-md hover:shadow-lg transition-all duration-300 hover:border-emerald-300"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Email</h3>
                      <a 
                        href="mailto:contact@taxcomply.com.ng" 
                        className="text-emerald-700 hover:text-emerald-800 transition-colors font-medium"
                      >
                        contact@taxcomply.com.ng
                      </a>
                      <p className="text-sm text-slate-500 mt-1">support@taxcomply.com.ng</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex items-start space-x-4 p-6 rounded-xl bg-white border-2 border-emerald-100 shadow-md hover:shadow-lg transition-all duration-300 hover:border-emerald-300"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Phone</h3>
                      <a 
                        href="tel:+2348000000000" 
                        className="text-emerald-700 hover:text-emerald-800 transition-colors font-medium"
                      >
                        +234 (0) 800 000 0000
                      </a>
                      <p className="text-sm text-slate-500 mt-1">Mon-Fri, 9AM-5PM WAT</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="flex items-start space-x-4 p-6 rounded-xl bg-white border-2 border-emerald-100 shadow-md hover:shadow-lg transition-all duration-300 hover:border-emerald-300"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Office</h3>
                      <p className="text-slate-700 leading-relaxed">
                        Lagos, Nigeria
                        <br />
                        <span className="text-sm text-slate-500">Visit by appointment only</span>
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="flex items-start space-x-4 p-6 rounded-xl bg-white border-2 border-emerald-100 shadow-md hover:shadow-lg transition-all duration-300 hover:border-emerald-300"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Company Hours</h3>
                      <p className="text-slate-700">
                        Monday - Friday: 9:00 AM - 5:00 PM
                        <br />
                        <span className="text-sm text-slate-500">Saturday & Sunday: Closed</span>
                      </p>
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200"
                >
                  <div className="flex items-start space-x-3">
                    <Building2 className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-emerald-900 mb-2">Enterprise Solutions</h3>
                      <p className="text-sm text-emerald-800 leading-relaxed mb-3">
                        Need custom enterprise solutions or dedicated support? Let's discuss your requirements.
                      </p>
                      <a 
                        href="mailto:enterprise@taxcomply.com.ng" 
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors inline-flex items-center"
                      >
                        enterprise@taxcomply.com.ng
                        <Globe className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-100 p-8 lg:p-12">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 mb-3">Send us a Message</h2>
                  <p className="text-slate-600">
                    Fill out the form below and we'll get back to you as soon as possible.
                  </p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                  {/* Status Messages */}
                  {submitStatus === SubmitStatus.Success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-emerald-50 border-2 border-emerald-200 flex items-start space-x-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-900">Message sent successfully!</p>
                        <p className="text-sm text-emerald-800 mt-1">
                          We've received your message and will respond within 24 hours.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {submitStatus === SubmitStatus.Error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="p-4 rounded-lg bg-red-50 border-2 border-red-200 flex items-start space-x-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-red-900 mb-1">Failed to send message</p>
                        <p className="text-sm text-red-800 leading-relaxed">
                          {errorMessage || "An error occurred. Please try again or contact us directly via email."}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-3">
                          {isRetryable && (
                            <Button
                              type="button"
                              variant={ButtonVariant.Primary}
                              size={ButtonSize.Sm}
                              onClick={handleRetry}
                              disabled={isLoading}
                              className="flex items-center space-x-2"
                            >
                              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                              <span>Retry</span>
                            </Button>
                          )}
                          <a 
                            href="mailto:contact@taxcomply.com.ng" 
                            className="text-sm text-red-700 hover:text-red-900 underline font-medium inline-flex items-center"
                          >
                            Send email directly →
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Input
                        label="Full Name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange("name")}
                        onBlur={handleBlur("name")}
                        error={errors.name}
                        placeholder="John Doe"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Input
                        label="Email Address"
                        name="email"
                        type="text"
                        value={formData.email}
                        onChange={handleChange("email")}
                        onBlur={handleBlur("email")}
                        error={errors.email}
                        placeholder="john@example.com"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Input
                        label="Company (Optional)"
                        name="company"
                        type="text"
                        value={formData.company}
                        onChange={handleChange("company")}
                        onBlur={handleBlur("company")}
                        error={errors.company}
                        placeholder="Your Company Name"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Input
                        label="Phone (Optional)"
                        name="phone"
                        type="text"
                        value={formData.phone}
                        onChange={handleChange("phone")}
                        onBlur={handleBlur("phone")}
                        error={errors.phone}
                        placeholder="+234 800 000 0000"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <Input
                      label="Subject"
                      name="subject"
                      type="text"
                      value={formData.subject}
                      onChange={handleChange("subject")}
                      onBlur={handleBlur("subject")}
                      error={errors.subject}
                      placeholder="What is this regarding?"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange("message")}
                      onBlur={handleBlur("message")}
                      rows={6}
                      placeholder="Tell us how we can help you..."
                      autoComplete="off"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none ${
                        errors.message ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-slate-300"
                      }`}
                    />
                    {errors.message && (
                      <p className="mt-1 text-sm text-red-600">{errors.message}</p>
                    )}
                    {!errors.message && (
                      <p className="mt-1 text-sm text-gray-500">
                        Minimum 10 characters required
                      </p>
                    )}
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      size={ButtonSize.Lg}
                      disabled={isLoading}
                      loading={isLoading}
                      className="w-full md:w-auto px-10 py-4 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Send className="w-5 h-5" />
                      Send Message
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
















