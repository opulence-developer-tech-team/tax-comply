"use client";

import { useAppSelector } from "@/hooks/useAppSelector";
import { User, LogOut, Bell } from "lucide-react";

interface AdminHeaderProps {
    onLogout: () => void;
}

export function AdminHeader({ onLogout }: AdminHeaderProps) {
    const { user } = useAppSelector((state) => state.admin);

    return (
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 lg:ml-72">
            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end">
                <div className="flex items-center gap-x-4 lg:gap-x-6">
                    {/* Notifications (Future) */}
                    <button type="button" className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500">
                        <span className="sr-only">View notifications</span>
                        <Bell className="h-6 w-6" aria-hidden="true" />
                    </button>
                    
                    <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
                    
                    {/* Profile dropdown */}
                    <div className="flex items-center gap-x-4 lg:gap-x-6">
                         <div className="flex items-center gap-x-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="h-5 w-5 text-slate-500" />
                            </div>
                            <span className="hidden lg:flex lg:items-center">
                                <span className="text-sm font-semibold leading-6 text-slate-900" aria-hidden="true">
                                    {user?.firstName || 'Admin'}
                                </span>
                            </span>
                         </div>
                         
                         <button 
                            onClick={onLogout}
                            className="text-sm font-semibold leading-6 text-red-600 hover:text-red-500 flex items-center gap-1"
                         >
                            <LogOut className="h-4 w-4" />
                            Logout
                         </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
