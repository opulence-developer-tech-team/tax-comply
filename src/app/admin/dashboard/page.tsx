"use client";

import { AccountType } from "@/lib/utils/account-type";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useHttp } from "@/hooks/useHttp";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { adminActions } from "@/store/redux/admin/admin-slice";
import { LoadingState } from "@/components/shared/LoadingState";
import { LogoutConfirmationModal } from "@/components/shared/LogoutConfirmationModal";
import { performLogout } from "@/lib/utils/logout";
import { usePathname } from "next/navigation";
import {
  Users,
  Building2,
  CreditCard,
  CheckCircle2,
  LogOut,
  Shield,
} from "lucide-react";
import { LoadingStateSize, ButtonVariant } from "@/lib/utils/client-enums";
import { Button } from "@/components/ui/Button";
import { SubscriptionStatus } from "@/lib/utils/subscription-status";
import { HttpMethod } from "@/lib/utils/http-method";

export default function AdminDashboardPage() {
  const dispatch = useAppDispatch();
  const { sendHttpRequest: fetchDashboardReq } = useHttp();
  
  // Redux state
  const {
    dashboard,
    isLoadingDashboard,
    hasFetchedDashboard,
    dashboardError,
  } = useAppSelector((state: any) => state.admin);

  // Fetch dashboard data (with caching)
  useEffect(() => {
    if (!hasFetchedDashboard && !isLoadingDashboard) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFetchedDashboard, isLoadingDashboard]);

  const fetchDashboardData = () => {
    dispatch(adminActions.setDashboardLoading(true));
    fetchDashboardReq({
      successRes: (response: any) => {
        dispatch(adminActions.setDashboardData(response?.data?.data));
      },
      errorRes: (errorResponse: any) => {
        dispatch(adminActions.setDashboardError("Failed to load dashboard data"));
        return true;
      },
      requestConfig: {
        url: "/admin/dashboard",
        method: HttpMethod.GET,
      },
    });
  };

  if (isLoadingDashboard && !dashboard) {
    return <LoadingState message="Loading admin dashboard..." size={LoadingStateSize.Md} />;
  }

  if (dashboardError) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{dashboardError}</p>
          <Button onClick={fetchDashboardData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div>
           <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
           <p className="text-sm text-slate-500">Welcome back, here is what is happening today.</p>
       </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Users</p>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">
                  {dashboard?.totalUsers?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                 <span className="text-emerald-600 font-medium">+12%</span> from last month
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Companies</p>
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div>
               <p className="text-3xl font-bold text-slate-900">
                  {dashboard?.totalCompanies?.toLocaleString() || 0}
               </p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                 <span className="text-emerald-600 font-medium">+5%</span> from last month
               </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
               <p className="text-sm font-medium text-slate-500">Total Subscriptions</p>
              <div className="bg-purple-100 p-2 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div>
               <p className="text-3xl font-bold text-slate-900">
                  {dashboard?.totalSubscriptions?.toLocaleString() || 0}
               </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
               <p className="text-sm font-medium text-slate-500">Active Subscriptions</p>
               <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">
                  {dashboard?.activeSubscriptions?.toLocaleString() || 0}
               </p>
            </div>
          </div>
        </div>
        
        {/* Placeholder for future charts or activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-96 flex items-center justify-center text-slate-400">
                Revenue Chart (Coming Soon)
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-96 flex items-center justify-center text-slate-400">
                User Growth Chart (Coming Soon)
            </div>
        </div>
    </div>
  );
}











