"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { ButtonVariant, ButtonSize } from "@/lib/utils/client-enums";

interface ReferralLinkCardProps {
  referralLink: string;
  copied: boolean;
  onCopy: () => void;
  email?: string;
}

export function ReferralLinkCard({
  referralLink,
  copied,
  onCopy,
  email,
}: ReferralLinkCardProps) {
  const username = email ? email.split('@')[0] : 'User';
  const initial = username.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 border-2 border-emerald-100 shadow-sm relative overflow-hidden">
        {/* Decorative Background */}
         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          
          {/* User Icon / Avatar */}
           <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-white shadow-md">
                 <span className="text-3xl font-bold text-emerald-700">{initial}</span>
              </div>
              <p className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                @{username}
              </p>
           </div>

          <div className="flex-1 w-full text-center md:text-left">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Your Unique Referral Link
            </h3>
            <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto md:mx-0">
               Share this link. When your friends sign up, they will see <strong>@{username}</strong> referred them!
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white rounded-xl p-2 pl-4 border border-slate-200 shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
              <code className="flex-1 text-sm text-slate-600 font-mono truncate py-2">
                {referralLink || "Loading your unique link..."}
              </code>
              
              <div className="flex gap-2 shrink-0">
                {/* Share Button (Web Share API) */}
                <Button
                  onClick={async () => {
                     if (!referralLink) return;
                     
                     const shareTitle = 'Simplify Your Taxes with TaxTrack';
                     const shareText = "Stop struggling with NRS deadlines! 🛡️ I use TaxTrack to automate my Personal Income Tax, VAT, and Withholding Tax effortlessly. It's the smartest way to stay compliant and save money in Nigeria. Sign up with my link:";
                     
                     // RUTHLESS FEEDBACK: Web Share API is not supported everywhere (e.g., Desktop Chrome/Firefox).
                     // We MUST provide a fallback.
                     if (navigator.share) {
                       try {
                         await navigator.share({
                           title: shareTitle,
                           text: shareText,
                           url: referralLink,
                         });
                       } catch (err) {
                          // User cancelled or share failed
                          console.log('Share cancelled', err);
                       }
                     } else {
                        // FALLBACK: Copy to clipboard if sharing isn't native
                        // We include the message here as requested "add a message to the link"
                        const fullMessage = `${shareTitle}\n\n${shareText} ${referralLink}`;
                        navigator.clipboard.writeText(fullMessage);
                        toast.success("Message & Link copied!", { description: "Paste it on WhatsApp, Twitter, or Email." });
                     }
                  }}
                  variant={ButtonVariant.Outline}
                  size={ButtonSize.Md}
                  disabled={!referralLink}
                  className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                >
                  <Share2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Share</span>
                </Button>

                {/* Copy Button */}
                <Button
                  onClick={onCopy}
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Md}
                  disabled={!referralLink}
                  className={`transition-all ${copied ? 'bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}











