import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface NextStepCardProps {
  title: string;
  description: string;
  href: string;
  actionLabel?: string;
  className?: string;
}

export function NextStepCard({
  title,
  description,
  href,
  actionLabel = "Go to Next Step",
  className,
}: NextStepCardProps) {
  return (
    <div className={cn("mt-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl shadow-sm", className)}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-100 rounded-full shrink-0">
            <Lightbulb className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-emerald-900 mb-1">
              {title}
            </h3>
            <p className="text-emerald-700 text-sm leading-relaxed max-w-2xl">
              {description}
            </p>
          </div>
        </div>
        
        <Link href={href} className="w-full md:w-auto shrink-0">
          <button className="w-full md:w-auto group flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all shadow-sm hover:shadow-md">
            {actionLabel}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </Link>
      </div>
    </div>
  );
}
