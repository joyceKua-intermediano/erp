import type { NextRequest } from "next/server";
import { requireClusterPermission } from "@/lib/auth";
import { authErrorStatus, pdfResponse } from "@/lib/contracts/render-pdf";
import { requireEmployeeSession } from "@/lib/employee-auth";
import { findEmployeeDocumentFile } from "@/lib/employee-profile/records";
import { employeeIdSchema } from "@/lib/employees";
import { detectImageType, receiptImageTypes } from "@/lib/expenses";
import { isPdf } from "@/lib/payslips";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

// `file` is "f-<employee_files.id>" or a social security file column. Admins pass ?cluster= and need employees.view
// there, with the employee in that cluster; otherwise only the employee the file belongs to can open it.
export async function GET(request: NextRequest, { params }: RouteContext<"/api/employee-documents/[employeeId]/[file]">) {
  const { employeeId, file } = await params;
  const parsedId = employeeIdSchema.safeParse(employeeId);
  if (!parsedId.success) return Response.json({ error: "Unknown file." }, { status: 404 });
  const ownerId = BigInt(parsedId.data);

  const clusterParam = request.nextUrl.searchParams.get("cluster");
  try {
    if (clusterParam !== null) {
      const { clusterId } = await requireClusterPermission(clusterParam, "employees.show");
      const employee = await prisma.employees.findFirst({
        where: { id: ownerId, intermediano_company_id: clusterId, deleted_at: null },
        select: { id: true },
      });
      if (!employee) return Response.json({ error: "Unknown file." }, { status: 404 });
    } else {
      const session = await requireEmployeeSession();
      if (session.employeeId !== ownerId) return Response.json({ error: "Unknown file." }, { status: 404 });
    }
  } catch (error) {
    return Response.json({ error: "You can't view this file." }, { status: authErrorStatus(error) });
  }

  try {
    const stored = await findEmployeeDocumentFile(ownerId, file);
    if (!stored) return Response.json({ error: "Unknown file." }, { status: 404 });

    // Legacy files live on the old public disk until they are copied under the storage folder.
    const bytes = await readStoredFile(stored.path);
    if (!bytes) return Response.json({ error: "This file isn't available yet." }, { status: 404 });

    if (isPdf(bytes)) return pdfResponse(bytes, stored.fileName, "inline");
    const imageType = detectImageType(bytes);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": imageType ? receiptImageTypes[imageType] : "application/octet-stream",
        "Content-Disposition": `${imageType ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(stored.fileName)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("employee document read failed", { employeeId: parsedId.data, file, error });
    return Response.json({ error: "Could not load this file." }, { status: 500 });
  }
}
