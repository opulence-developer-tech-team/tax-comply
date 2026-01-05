import { Types } from "mongoose";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  checkLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const key = identifier;
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + windowMs;
      this.store.set(key, {
        count: 1,
        resetTime,
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

export const rateLimiter = new RateLimiter();

export const RATE_LIMITS = {
  UPLOAD: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
  DELETE: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  FETCH: {
    maxRequests: 100,
    windowMs: 60 * 1000,
  },
  UPDATE: {
    maxRequests: 50,
    windowMs: 60 * 1000,
  },
} as const;

