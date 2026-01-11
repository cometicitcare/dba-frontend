import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type PrinterInfo = {
  name: string;
  status: string;
  driverName: string;
  portName: string;
  isDefault: boolean;
};

export type PageSize = "legal" | "a4" | "a5";

const VIRTUAL_PATTERNS: RegExp[] = [
  /pdf/i,
  /xps/i,
  /fax/i,
  /onenote/i,
  /microsoft print to pdf/i,
  /send to onenote/i,
  /snagit/i,
  /cutepdf/i,
  /novapdf/i,
  /dopdf/i,
  /foxit/i,
  /nitro/i,
  /adobe pdf/i,
  /print to file/i,
  /microsoft xps document writer/i,
  /evernote/i,
  /virtual/i,
  /save as/i,
];

function isVirtualPrinter(printerName: string, driverName = ""): boolean {
  return VIRTUAL_PATTERNS.some((pattern) => pattern.test(printerName) || pattern.test(driverName));
}

function normalizeToArray<T>(val: T | T[] | null | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

async function run(cmd: string, args: string[]) {
  const { stdout, stderr } = await execFileAsync(cmd, args, { encoding: "utf8" });
  return { stdout, stderr };
}

const CUPS_PAGE_SIZES: Record<PageSize, string> = {
  legal: "legal",
  a4: "a4",
  a5: "a5",
};

function normalizePdfBase64(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^data:application\/pdf;base64,(.+)$/i);
  return match ? match[1] : trimmed;
}

async function getWindowsPrinters(): Promise<PrinterInfo[]> {
  const ps = `
$printers = Get-CimInstance -ClassName Win32_Printer | Select-Object Name, DriverName, PortName, Default, PrinterStatus
$mapped = $printers | ForEach-Object {
  $status = switch ($_.PrinterStatus) {
    3 { 'Ready' }
    4 { 'Printing' }
    5 { 'WarmingUp' }
    6 { 'StoppedPrinting' }
    7 { 'Offline' }
    default { 'Unknown' }
  }
  [PSCustomObject]@{
    Name = $_.Name
    DriverName = $_.DriverName
    PortName = $_.PortName
    IsDefault = $_.Default
    Status = $status
  }
}
$mapped | ConvertTo-Json -Depth 3
`;

  const { stdout } = await run("powershell", ["-NoProfile", "-Command", ps]);
  let parsed: any;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    parsed = [];
  }

  const printers = normalizeToArray<any>(parsed)
    .filter((printer) => !isVirtualPrinter(printer.Name ?? "", printer.DriverName ?? ""))
    .map((printer) => ({
      name: String(printer.Name ?? "Unknown"),
      status: String(printer.Status ?? "Unknown"),
      driverName: String(printer.DriverName ?? "Unknown"),
      portName: String(printer.PortName ?? "Network/Local"),
      isDefault: Boolean(printer.IsDefault === true || printer.IsDefault === "True"),
    }));

  return printers.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });
}

async function getCupsPrinters(): Promise<PrinterInfo[]> {
  const { stdout: printersRaw } = await run("lpstat", ["-p"]);
  const printerLines = printersRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let defaultPrinter: string | null = null;
  try {
    const { stdout: defaultRaw } = await run("lpstat", ["-d"]);
    const match = defaultRaw.match(/system default destination:\s*(.+)\s*$/i);
    defaultPrinter = match?.[1]?.trim() || null;
  } catch {
    defaultPrinter = null;
  }

  const deviceMap = new Map<string, string>();
  try {
    const { stdout: deviceRaw } = await run("lpstat", ["-v"]);
    deviceRaw.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^device for\s+(.+?):\s+(.+)$/i);
      if (match) {
        deviceMap.set(match[1].trim(), match[2].trim());
      }
    });
  } catch {
    // ignore
  }

  const printers: PrinterInfo[] = [];
  printerLines.forEach((line) => {
    const match = line.match(/^printer\s+(\S+)\s+is\s+(.+?)\./i);
    if (!match) return;
    const name = match[1];
    const status = match[2];
    if (isVirtualPrinter(name)) {
      return;
    }
    printers.push({
      name,
      status,
      driverName: "CUPS",
      portName: deviceMap.get(name) ?? "CUPS",
      isDefault: defaultPrinter ? name === defaultPrinter : false,
    });
  });

  return printers.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getPrinters(): Promise<PrinterInfo[]> {
  if (process.platform === "win32") {
    return getWindowsPrinters();
  }
  return getCupsPrinters();
}

export async function printTestPage(printerName: string): Promise<{ jobId: string }> {
  const jobId = String(Date.now());
  const content = [
    "========================================",
    "PRINTER TEST PAGE",
    "",
    `Printer: ${printerName}`,
    `Date: ${new Date().toLocaleString()}`,
    "",
    "If you can read this, printing works.",
    "========================================",
  ].join(os.EOL);

  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `printer_test_${jobId}.txt`);
  await fs.writeFile(filePath, content + os.EOL, "utf8");

  try {
    if (process.platform === "win32") {
      const sanitizedFilePath = filePath.replace(/'/g, "''");
      const sanitizedPrinter = printerName.replace(/'/g, "''");
      const ps = `Get-Content -Raw -Encoding UTF8 '${sanitizedFilePath}' | Out-Printer -Name '${sanitizedPrinter}'`;
      await run("powershell", ["-NoProfile", "-Command", ps]);
    } else {
      await run("lp", ["-d", printerName, filePath]);
    }
    return { jobId };
  } finally {
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore
    }
  }
}

export async function printPdfBase64(
  printerName: string,
  pdfBase64: string,
  pageSize: PageSize = "legal"
): Promise<{ jobId: string }> {
  const jobId = String(Date.now());
  const normalizedBase64 = normalizePdfBase64(pdfBase64);
  if (!normalizedBase64) {
    throw new Error("pdfBase64 is required");
  }

  const pdfBuffer = Buffer.from(normalizedBase64, "base64");
  if (!pdfBuffer.length) {
    throw new Error("Invalid pdfBase64 payload");
  }

  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, `printer_pdf_${jobId}.pdf`);
  await fs.writeFile(filePath, pdfBuffer);

  try {
    if (process.platform === "win32") {
      const sumatraPath = process.env.SUMATRA_PDF_PATH;
      if (sumatraPath) {
        const printSettings = `paper=${pageSize}`;
        await run(sumatraPath, [
          "-silent",
          "-print-to",
          printerName,
          "-print-settings",
          printSettings,
          filePath,
        ]);
      } else {
        const sanitizedFilePath = filePath.replace(/'/g, "''");
        const sanitizedPrinter = printerName.replace(/'/g, "''");
        const ps = `Start-Process -FilePath '${sanitizedFilePath}' -Verb PrintTo -ArgumentList '${sanitizedPrinter}'`;
        try {
          await run("powershell", ["-NoProfile", "-Command", ps]);
        } catch (error: any) {
          const message = String(error?.message ?? error);
          if (message.includes("No application is associated")) {
            throw new Error("Printers are not connected.");
          }
          throw error;
        }
      }
    } else {
      const media = CUPS_PAGE_SIZES[pageSize] ?? "legal";
      await run("lp", ["-d", printerName, "-o", `media=${media}`, filePath]);
    }

    return { jobId };
  } finally {
    const cleanupDelayMs = process.platform === "win32" ? 5000 : 0;
    if (cleanupDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, cleanupDelayMs));
    }
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore
    }
  }
}
