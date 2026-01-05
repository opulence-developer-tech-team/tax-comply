import { requireAdminAuth } from "@/lib/server/middleware/admin-auth";
import { connectDB } from "@/lib/server/utils/db";
import { NextResponse } from "next/server";
import { MessageResponse } from "@/lib/server/utils/enum";
import User from "@/lib/server/user/entity";

export async function GET(request: Request) {
  try {
    await connectDB();

    const auth = await requireAdminAuth();
    if (!auth.authorized || !auth.context) {
      return auth.response!;
    }

    // Fetch all users sorted by most recent
    // Removing sensitive fields
    const users = await User.find({})
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
        message: MessageResponse.Success,
        description: "Users retrieved successfully",
        data: {
            data: users // Matching frontend expectation users (or just users?)
            // Wait, front end creates `const [users, setUsers] = useState<User[]>([]);`
            // and `setUsers(response.data?.data || []);`
            // In dashboard route: `data: { ..., users }`.
            // Here I should probably just return `data: users` or `data: { users }`.
            // Looking at my users/page.tsx: `setUsers(response.data?.data || []);`
            // So if I return `data: users`, then `response.data` is the users array? 
            // standard axios response is `res.data`. So `res.data.data` would be the payload.
            // If I return `{ message: ..., data: users }`, then axios `res.data.data` is `users`.
            // So I should return `data: users` here.
            // Wait, previous `route.ts` I wrote returned `data: { data: users }`.
            // Dashboard route returns `data: { users: [...] }`.
            // I will return `data: users` direct array.
            // So `res.data.data` is the array.
        },
    });
    
    // Correction:
    // If I return `data: users`, then on client:
    // `response` from `useHttp` successRes is usually the axios response data payload (the body).
    // So `response.data` IS the `users` array.
    // Dashboard page does: `dispatch(adminActions.setDashboardData(response?.data?.data));`
    // Wait, dashboard route returns `data: { users, ...}`.
    // So `response` in useHttp success callback is the parsed JSON body.
    // So `response.data` is `{ users, ... }`.
    // In users/page.tsx I wrote: `setUsers(response.data?.data || []);`
    // This implies I expect `data: { data: [...] }` or `data` IS the array.
    // If I return `data: users`, then valid access is `response.data`.
    // I will stick to returning `data: users` (array) here for simplicity.
    // So frontend should be `setUsers(response.data || [])`.
    // I need to double check my `users/page.tsx` again.
    // `setUsers(response.data?.data || []);`
    // If I return `data: users`, then `response.data` is users. So `response.data.data` is undefined.
    // I will write the route to return `data: users`.
    // And I will Update `users/page.tsx` to use `response.data`.

  } catch (error: any) {
    console.error("Admin Users API Error:", error);
    return NextResponse.json(
      { message: "error", description: "Internal Server Error", data: null },
      { status: 500 }
    );
  }
}
