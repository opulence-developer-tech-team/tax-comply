import crypto from "crypto";

const SECRET = process.env.JWT_SECRET || "default-secret-change-in-production";
const ALLOWED_PATHS = [
  "/reviews/write",
  "/dashboard",
  "/dashboard/expenses",
];

export function createReturnUrl(targetPath: string): string {
  if (!ALLOWED_PATHS.includes(targetPath)) {
    return "";
  }

  const timestamp = Date.now();
  const data = `${targetPath}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(data);
  const signature = hmac.digest("hex");

  const token = Buffer.from(`${data}:${signature}`).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return token;
}

export function validateReturnUrl(token: string): string | null {
  try {
    const decoded = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    const [data, signature] = decoded.split(":");
    
    if (!data || !signature) {
      return null;
    }

    const [path, timestamp] = data.split(":");
    if (!path || !timestamp) {
      return null;
    }

    const hmac = crypto.createHmac("sha256", SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      return null;
    }

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > 3600000) {
      return null;
    }

    if (!ALLOWED_PATHS.includes(path)) {
      return null;
    }

    return path;
  } catch (error) {
    return null;
  }
}

