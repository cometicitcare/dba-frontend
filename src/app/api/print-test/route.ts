import { NextResponse } from "next/server";
import { printTestPage } from "@/lib/printers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const printerName =
      typeof body?.printerName === "string" ? body.printerName.trim() : "";

    if (!printerName) {
      return NextResponse.json(
        { success: false, error: "printerName is required" },
        { status: 400 }
      );
    }

    const { jobId } = await printTestPage(printerName);
    return NextResponse.json({ success: true, jobId });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
