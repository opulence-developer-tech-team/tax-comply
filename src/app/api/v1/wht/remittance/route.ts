import { NextRequest } from "next/server";
import { getWHTRemittances, createWHTRemittance, markWHTRemitted } from "../../../../../lib/server/wht/controller";

export async function GET(req: NextRequest) {
  return getWHTRemittances(req);
}

export async function POST(req: NextRequest) {
  return createWHTRemittance(req);
}

export async function PUT(req: NextRequest) {
  return markWHTRemitted(req);
}


