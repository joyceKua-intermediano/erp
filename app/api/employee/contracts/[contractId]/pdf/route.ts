import type { NextRequest } from "next/server";
import { contractIdSchema } from "@/lib/contracts";
import { authErrorStatus, pdfResponse, renderContractPdf } from "@/lib/contracts/render-pdf";
import { requireEmployeeSession } from "@/lib/employee-auth";
import { employeeContractsWhere } from "@/lib/employee-profile/records";
import { prisma } from "@/lib/prisma";

// Employees can only open their own contracts once Intermediano has sent them; rendering uses the contract's cluster.
export async function GET(request: NextRequest, { params }: RouteContext<"/api/employee/contracts/[contractId]/pdf">) {
  const { contractId } = await params;

  let employeeId: bigint;
  try {
    ({ employeeId } = await requireEmployeeSession());
  } catch (error) {
    return Response.json({ error: "Sign in to view this contract." }, { status: authErrorStatus(error) });
  }

  const parsedId = contractIdSchema.safeParse(contractId);
  if (!parsedId.success) return Response.json({ error: "Unknown contract." }, { status: 404 });

  try {
    const id = BigInt(parsedId.data);
    const contract = await prisma.contracts.findFirst({
      where: { id, ...employeeContractsWhere(employeeId) },
      select: { intermediano_company_id: true },
    });
    if (!contract?.intermediano_company_id) {
      return Response.json({ error: "This contract doesn't exist." }, { status: 404 });
    }

    const result = await renderContractPdf(id, contract.intermediano_company_id);
    if (result.ok) {
      const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
      return pdfResponse(result.pdf, result.fileName, disposition);
    }
    if (result.reason === "not_found") return Response.json({ error: "This contract doesn't exist." }, { status: 404 });
    if (result.reason === "no_template") {
      return Response.json({ error: "This contract isn't available as a PDF yet." }, { status: 409 });
    }
    // Template diagnostics are for Intermediano's admins, so employees only see that it failed.
    console.error("employee contract pdf template error", { contractId: parsedId.data, diagnostics: result.diagnostics });
    return Response.json({ error: "This contract couldn't be generated. Contact HR." }, { status: 422 });
  } catch (error) {
    console.error("employee contract pdf failed", { contractId: parsedId.data, employeeId: employeeId.toString(), error });
    return Response.json({ error: "Could not generate this contract's PDF." }, { status: 500 });
  }
}
