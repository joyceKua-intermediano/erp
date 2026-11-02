import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { authErrorStatus } from "@/lib/contracts/render-pdf";
import { requireEmployeeSession } from "@/lib/employee-auth";
import { detectImageType, MAX_RECEIPT_BYTES, receiptPathFor } from "@/lib/expenses";
import { saveStoredFile } from "@/lib/storage";

// A route handler rather than a Server Action, whose request bodies are capped at 1 MB.
// The receipt is only stored here; it joins a claim when the claim is saved with its path.

// Room for the multipart boundary and headers around the file itself.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return Response.json({ error: "Uploads must come from this site." }, { status: 403 });

  let employeeId: bigint;
  try {
    ({ employeeId } = await requireEmployeeSession());
  } catch (error) {
    return Response.json({ error: "Your session has expired. Sign in again." }, { status: authErrorStatus(error) });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RECEIPT_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return Response.json({ error: "Receipts can be at most 5 MB." }, { status: 413 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return Response.json({ error: "Choose a receipt image to upload." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Choose a receipt image to upload." }, { status: 400 });
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return Response.json({ error: "Receipts can be at most 5 MB." }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const imageType = detectImageType(bytes);
    if (!imageType) {
      return Response.json({ error: "Receipts must be PNG, JPEG or WebP images." }, { status: 415 });
    }

    const path = receiptPathFor(employeeId, `${randomUUID()}.${imageType}`);
    await saveStoredFile(path, bytes);
    return Response.json({ path }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("expense receipt upload failed", { employeeId: employeeId.toString(), error });
    return Response.json({ error: "Could not upload this receipt. Try again." }, { status: 500 });
  }
}
