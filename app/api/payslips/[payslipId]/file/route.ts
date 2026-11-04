import type { NextRequest } from "next/server";
import { requireClusterModule } from "@/lib/auth";
import { authErrorStatus, pdfResponse } from "@/lib/contracts/render-pdf";
import { requireEmployeeSession } from "@/lib/employee-auth";
import { isPdf, payslipIdSchema } from "@/lib/payslips";
import { clusterPayslipsWhere } from "@/lib/payslips/records";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

// Admins pass ?cluster= and need payroll.view plus the payslips module there; otherwise only the employee the
// payslip belongs to can open it.
export async function GET(request: NextRequest, { params }: RouteContext<"/api/payslips/[payslipId]/file">) {
  const { payslipId } = await params;
  const parsedId = payslipIdSchema.safeParse(payslipId);
  if (!parsedId.success) return Response.json({ error: "Unknown payslip." }, { status: 404 });

  const clusterParam = request.nextUrl.searchParams.get("cluster");
  let where: { id: bigint; employee_id?: bigint; employees?: { intermediano_company_id: bigint } };
  try {
    if (clusterParam !== null) {
      const { clusterId } = await requireClusterModule(clusterParam, "payroll.view", "payslips");
      where = { id: BigInt(parsedId.data), ...clusterPayslipsWhere(clusterId) };
    } else {
      const { employeeId } = await requireEmployeeSession();
      where = { id: BigInt(parsedId.data), employee_id: employeeId };
    }
  } catch (error) {
    return Response.json({ error: "You can't view this payslip." }, { status: authErrorStatus(error) });
  }

  try {
    const row = await prisma.payslips.findFirst({ where, select: { file_name: true, file_path: true } });
    if (!row) return Response.json({ error: "Unknown payslip." }, { status: 404 });

    // Legacy files live on R2 until they are copied under the storage folder.
    const file = await readStoredFile(row.file_path);
    if (!file) return Response.json({ error: "Payslip file not available." }, { status: 404 });

    if (isPdf(file)) return pdfResponse(file, row.file_name, "inline");
    // Legacy accepted any file type, so anything else is only offered as a download.
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.file_name)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("payslip read failed", { payslipId: parsedId.data, error });
    return Response.json({ error: "Could not load this payslip." }, { status: 500 });
  }
}
