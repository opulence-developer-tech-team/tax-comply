import axios from "axios";
import { shouldTriggerLogout } from "@/lib/utils/logout";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for global error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Note: We don't perform logout here because:
    // 1. We need access to Redux dispatch and router (not available in axios interceptor)
    // 2. useHttp hook already handles 401/403 errors
    // 3. This interceptor is kept for potential future use (logging, metrics, etc.)
    
    // Log error for debugging (optional)
    if (process.env.NODE_ENV === "development") {
      const status = error.response?.status;
      if (status && shouldTriggerLogout(status)) {
        console.warn("API request failed with auth error:", {
          status,
          url: error.config?.url,
          message: "Logout will be handled by useHttp hook",
        });
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;










