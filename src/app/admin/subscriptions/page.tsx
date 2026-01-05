"use client";

import { useState, useEffect } from "react";
import { useHttp } from "@/hooks/useHttp";
import { HttpMethod } from "@/lib/utils/http-method";
import { LoadingState } from "@/components/shared/LoadingState";
import { Input } from "@/components/ui/Input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/Table";
import { 
  Search, 
  MoreVertical, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from "lucide-react";
import { SubscriptionStatus } from "@/lib/utils/subscription-status";

interface Subscription {
  _id: string;
  plan: string;
  status: string;
  amount: number;
  billingCycle: string;
  startDate: string;
  endDate: string;
  user: {
      firstName: string;
      lastName: string;
      email: string;
  } | null;
}

export default function AdminSubscriptionsPage() {
  const { sendHttpRequest: fetchSubsReq } = useHttp();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubscriptions = () => {
    setIsLoading(true);
    fetchSubsReq({
      successRes: (response: any) => {
        setSubscriptions(response.data || []);
        setIsLoading(false);
      },
      errorRes: () => {
        setIsLoading(false);
        return false;
      },
      requestConfig: {
        url: "/admin/subscriptions",
        method: HttpMethod.GET,
      },
    });
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const filteredSubs = subscriptions.filter(sub => 
    sub.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    sub.plan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
           <p className="text-sm text-slate-500">Monitor active plans, revenue, and churn.</p>
        </div>
        <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search by email or plan..." 
             className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm w-full sm:w-64"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         {isLoading ? (
             <div className="p-12 flex justify-center">
                 <LoadingState message="Loading subscriptions..." />
             </div>
         ) : (
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan Details</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubs.length > 0 ? filteredSubs.map((sub) => (
                    <TableRow key={sub._id}>
                      <TableCell>
                        {sub.user ? (
                            <div>
                                <div className="font-medium text-slate-900">{sub.user.firstName} {sub.user.lastName}</div>
                                <div className="text-xs text-slate-500">{sub.user.email}</div>
                            </div>
                        ) : (
                            <span className="text-slate-400 italic">Deleted User</span>
                        )}
                      </TableCell>
                      <TableCell>
                         <div className="font-medium capitalize text-slate-900">{sub.plan}</div>
                         <div className="text-xs text-slate-500">₦{sub.amount.toLocaleString()} / {sub.billingCycle}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-500">
                            Start: {new Date(sub.startDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-500">
                            End: {new Date(sub.endDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            sub.status === SubscriptionStatus.Active ? "bg-green-100 text-green-800" :
                            sub.status === SubscriptionStatus.Expired ? "bg-red-100 text-red-800" :
                            "bg-slate-100 text-slate-800"
                        }`}>
                            {sub.status === SubscriptionStatus.Active && <CheckCircle2 className="w-3 h-3" />}
                            {sub.status === SubscriptionStatus.Expired && <XCircle className="w-3 h-3" />}
                            {sub.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )) : (
                     <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                            No subscriptions found.
                        </TableCell>
                     </TableRow>
                  )}
                </TableBody>
            </Table>
         )}
      </div>
    </div>
  );
}
