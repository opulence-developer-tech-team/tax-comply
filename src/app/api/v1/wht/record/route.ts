import { NextRequest } from "next/server";
import { createWHTRecord, getWHTRecords } from "../../../../../lib/server/wht/controller";

export async function POST(req: NextRequest) {
  return createWHTRecord(req);
}

export async function GET(req: NextRequest) {
  return getWHTRecords(req);
}











