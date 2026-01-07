import { NextResponse } from "next/server";
import { getPrinters } from "@/lib/printers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const printers = await getPrinters();
    return NextResponse.json({ success: true, printers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
