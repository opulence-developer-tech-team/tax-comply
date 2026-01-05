"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard, 
  ShieldAlert, 
  Settings,
  Scale
} from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming standard utils path, will adjust if find_by_name returns otherwise

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Companies", href: "/admin/companies", icon: Building2 }, // Future-proofing
  { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { name: "Audit Logs", href: "/admin/audit", icon: ShieldAlert },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 px-6 pb-4 ring-1 ring-white/10 lg:w-72 lg:fixed lg:inset-y-0 lg:flex lg:flex-col border-r border-slate-800">
      <div className="flex h-16 shrink-0 items-center gap-2 mt-4">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-emerald-600">
           <Scale className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">TaxComply Admin</span>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-800",
                        "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors"
                      )}
                    >
                      <item.icon
                        className={cn(
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white",
                          "h-5 w-5 shrink-0"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
          
          <li className="mt-auto">
            <div className="text-xs font-semibold leading-6 text-slate-500">
                v1.0.0 (Production Build)
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}
