import { NextResponse } from "next/server";
import { PageSize, printPdfBase64 } from "@/lib/printers";

export const runtime = "nodejs";

const ALLOWED_PAGE_SIZES = new Set<PageSize>(["legal", "a4", "a5"]);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const printerName =
      typeof body?.printerName === "string" ? body.printerName.trim() : "";
    const pdfBase64 =
      typeof body?.pdfBase64 === "string" ? body.pdfBase64.trim() : "";
    const pageSizeRaw =
      typeof body?.pageSize === "string" ? body.pageSize.trim().toLowerCase() : "legal";
    const pageSize = ALLOWED_PAGE_SIZES.has(pageSizeRaw as PageSize)
      ? (pageSizeRaw as PageSize)
      : "legal";

    if (!printerName) {
      return NextResponse.json(
        { success: false, error: "printerName is required" },
        { status: 400 }
      );
    }

    if (!pdfBase64) {
      return NextResponse.json(
        { success: false, error: "pdfBase64 is required" },
        { status: 400 }
      );
    }

    const { jobId } = await printPdfBase64(printerName, pdfBase64, pageSize);
    return NextResponse.json({ success: true, jobId });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message ?? String(error) },
      { status: 500 }
    );
  }
}
