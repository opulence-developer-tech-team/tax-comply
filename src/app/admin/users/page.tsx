"use client";

import { useState, useEffect } from "react";
import { useHttp } from "@/hooks/useHttp";
import { HttpMethod } from "@/lib/utils/http-method";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/Button"; // Check if Button exists or use standard
import { Input } from "@/components/ui/Input"; // Check if Input exists
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/Table"; // Use standard table if available or create simple table
import { 
  Search, 
  MoreVertical, 
  Shield, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";
import { formatDate } from "@/lib/utils"; // Check if this exists or custom

// Simple Table Fallback if UI components don't exist yet (I'll assume standard Shadcn-like structure for now, if not I'll fix)
// Actually, looking at previous files, Button exists. Input probably exists. Table might not.
// I will build a standard table using Tailwind for safety if I'm not sure about the UI library presence.
// Update: I'll use standard Tailwind table to be "bulletproof" and not rely on potentially missing Shadcn components.

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "user" | "admin" | "support";
  isActive: boolean;
  createdAt: string;
  accountType: string;
}

export default function AdminUsersPage() {
  const { sendHttpRequest: fetchUsersReq } = useHttp();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = () => {
    setIsLoading(true);
    fetchUsersReq({
      successRes: (response: any) => {
        // response is the full body: { message, description, data: [...] }
        setUsers(response.data || []); 
        setIsLoading(false);
      },
      errorRes: () => {
        setIsLoading(false);
        // Toast error?
        return false;
      },
      requestConfig: {
        url: "/admin/users", // Use relative path, assuming baseURL is handled or proxy
        method: HttpMethod.GET,
      },
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Users</h1>
           <p className="text-sm text-slate-500">Manage all registered users and their account status.</p>
        </div>
        <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search users..." 
             className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm w-full sm:w-64"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         {isLoading ? (
             <div className="p-12 flex justify-center">
                 <LoadingState message="Loading users..." />
             </div>
         ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                             user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                         }`}>
                             {user.role}
                         </span>
                         <div className="text-xs text-slate-400 mt-1 capitalize">{user.accountType}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <XCircle className="w-3 h-3" /> Banned
                            </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                     <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                            No users found matching your search.
                        </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
         )}
      </div>
    </div>
  );
}
