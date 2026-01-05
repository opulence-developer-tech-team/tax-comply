"use client";

import { AdminRouteGuard } from "@/components/auth/AdminRouteGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useState } from "react";
import { useHttp } from "@/hooks/useHttp";
import { HttpMethod } from "@/lib/utils/http-method";
import { performLogout } from "@/lib/utils/logout";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { LogoutConfirmationModal } from "@/components/shared/LogoutConfirmationModal";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { sendHttpRequest: logoutReq } = useHttp();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await new Promise<void>((resolve) => {
        logoutReq({
          successRes: () => resolve(),
          errorRes: () => {
            resolve();
            return false;
          },
          requestConfig: {
            url: "/admin/auth/logout",
            method: HttpMethod.POST,
          },
        });
      });
    } catch (error) {
       // Ignore network errors on logout
    }

    await performLogout({
      dispatch,
      router: {
        push: router.push.bind(router),
        replace: router.replace?.bind(router),
      },
      currentPathname: pathname || undefined,
      saveRedirectPath: true,
      redirectPath: "/admin/login",
      isAdmin: true,
    });
    
    setIsLoggingOut(false);
    setShowLogoutModal(false);
  };

  return (
    <AdminRouteGuard>
       <div className="min-h-screen bg-slate-50">
          {/* Sidebar - Desktop */}
          <AdminSidebar />

          {/* Main Content Area */}
          <div className="">
             <AdminHeader onLogout={() => setShowLogoutModal(true)} />
             
             <main className="py-10 lg:pl-72">
                <div className="px-4 sm:px-6 lg:px-8">
                  {children}
                </div>
             </main>
          </div>

          <LogoutConfirmationModal 
             isOpen={showLogoutModal}
             onClose={() => setShowLogoutModal(false)}
             onConfirm={handleLogoutConfirm}
             isLoading={isLoggingOut}
          />
       </div>
    </AdminRouteGuard>
  );
}












