import { NextRequest } from "next/server";
import { getWHTSummary } from "../../../../../lib/server/wht/controller";

export async function GET(req: NextRequest) {
  return getWHTSummary(req);
}











