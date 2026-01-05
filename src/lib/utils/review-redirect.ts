export function hasPendingReviewIntent(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("review_intent") !== null;
}

export function getReviewIntent(): { source?: string; reviewData?: any } | null {
  if (typeof window === "undefined") return null;
  const intent = sessionStorage.getItem("review_intent");
  if (!intent) return null;
  try {
    return JSON.parse(intent);
  } catch {
    return null;
  }
}

export function clearReviewIntent(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("review_intent");
}

export function setReviewIntent(source: string, reviewData?: any): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("review_intent", JSON.stringify({ source, reviewData }));
}
