"use client";

import { HttpMethod } from "@/lib/utils/http-method";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { adminActions } from "@/store/redux/admin/admin-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { LoadingStateSize } from "@/lib/utils/client-enums";
import { performLogout } from "@/lib/utils/logout";

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Admin Route Guard
 * 
 * Protects admin routes by:
 * 1. Checking if admin is authenticated
 * 2. Fetching admin user data if not already fetched
 * 3. Redirecting to admin login if not authenticated
 * 4. Handling automatic logout on token expiration
 */
export function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { sendHttpRequest: fetchAdminReq } = useHttp();

  const { user, isAuthenticated, hasFetched, isLoading } = useAppSelector(
    (state: any) => state.admin
  );

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip check if already authenticated and fetched
    if (isAuthenticated && hasFetched) {
      setIsChecking(false);
      return;
    }

    // Fetch admin user data
    if (!hasFetched && !isLoading) {
      dispatch(adminActions.setLoading(true));
      fetchAdminReq({
        successRes: (response: any) => {
          if (response?.data?.message === "success") {
            const adminData = response?.data?.data;
            dispatch(adminActions.setAdminUser({
              _id: adminData._id,
              email: adminData.email,
              firstName: adminData.firstName,
              lastName: adminData.lastName,
              phoneNumber: adminData.phoneNumber,
              role: "admin",
            }));
          }
          setIsChecking(false);
        },
        errorRes: (errorResponse: any) => {
          // If 401/403, logout will be handled automatically by useHttp
          // For other errors, redirect to login
          if (errorResponse?.status !== 401 && errorResponse?.status !== 403) {
            router.push("/admin/login");
          }
          setIsChecking(false);
          return false;
        },
        requestConfig: {
          url: "/admin/auth/me", // We'll need to create this endpoint
          method: HttpMethod.GET,
        },
      });
    }
  }, [isAuthenticated, hasFetched, isLoading, dispatch, router, fetchAdminReq]);

  // Show loading state while checking authentication
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Verifying admin access..." size={LoadingStateSize.Md} />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    // Save current path for redirect after login
    if (pathname && pathname !== "/admin/login") {
      sessionStorage.setItem("adminRedirectAfterLogin", pathname);
    }
    router.push("/admin/login");
    return null;
  }

  // Render protected content
  return <>{children}</>;
}












