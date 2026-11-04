import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireClusterModule } from "@/lib/auth";
import { authErrorStatus } from "@/lib/contracts/render-pdf";
import {
  isPdf,
  legacyClusterKey,
  MAX_PAYSLIP_BYTES,
  payslipPathFor,
  payslipUploadSchema,
  sanitizePayslipFileName,
  toStoredPeriod,
} from "@/lib/payslips";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, saveStoredFile } from "@/lib/storage";

// A route handler rather than a Server Action, whose request bodies are capped at 1 MB.

// Room for the multipart boundary, the other fields and headers around the file itself.
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

  let clusterId: bigint;
  try {
    ({ clusterId } = await requireClusterModule(
      request.nextUrl.searchParams.get("cluster") ?? "",
      "payslips.create",
      "payslips",
    ));
  } catch (error) {
    return Response.json({ error: "You can't upload payslips in this cluster." }, { status: authErrorStatus(error) });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_PAYSLIP_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return Response.json({ error: "Payslips can be at most 10 MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Choose a payslip PDF to upload." }, { status: 400 });
  }

  const fields = payslipUploadSchema.safeParse({ employeeId: form.get("employeeId"), period: form.get("period") });
  if (!fields.success) {
    return Response.json({ error: fields.error.issues[0]?.message ?? "Check the form and try again." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Choose a payslip PDF to upload." }, { status: 400 });
  }
  if (file.size > MAX_PAYSLIP_BYTES) {
    return Response.json({ error: "Payslips can be at most 10 MB." }, { status: 413 });
  }

  let path: string | null = null;
  try {
    const employee = await prisma.employees.findFirst({
      where: { id: BigInt(fields.data.employeeId), intermediano_company_id: clusterId, deleted_at: null },
      select: { id: true, intermediano_companies: { select: { name: true } } },
    });
    if (!employee) {
      return Response.json({ error: "This employee isn't in this cluster anymore." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdf(bytes)) return Response.json({ error: "Payslips must be PDF files." }, { status: 415 });

    path = payslipPathFor(clusterId, randomUUID());
    await saveStoredFile(path, bytes);

    const now = new Date();
    const row = await prisma.payslips.create({
      data: {
        employee_id: employee.id,
        payslip_period: toStoredPeriod(fields.data.period),
        cluster: legacyClusterKey(employee.intermediano_companies?.name ?? ""),
        file_name: sanitizePayslipFileName(file.name),
        file_path: path,
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });
    return Response.json({ id: row.id.toString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("payslip upload failed", { clusterId: clusterId.toString(), error });
    if (path) {
      await deleteStoredFile(path).catch((cleanupError) =>
        console.error("payslip upload cleanup failed", { path, error: cleanupError }),
      );
    }
    return Response.json({ error: "Could not upload this payslip. Try again." }, { status: 500 });
  }
}
