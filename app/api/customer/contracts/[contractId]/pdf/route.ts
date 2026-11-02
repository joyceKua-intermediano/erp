import type { NextRequest } from "next/server";
import { contractIdSchema } from "@/lib/contracts";
import { authErrorStatus, pdfResponse, renderContractPdf } from "@/lib/contracts/render-pdf";
import { requireCustomerSession } from "@/lib/customer-auth";
import { customerContractsWhere } from "@/lib/customer-portal";
import { prisma } from "@/lib/prisma";

// Customers can only open their own company's contracts; rendering then uses the contract's own cluster.
export async function GET(request: NextRequest, { params }: RouteContext<"/api/customer/contracts/[contractId]/pdf">) {
  const { contractId } = await params;

  let companyId: bigint;
  try {
    ({ companyId } = await requireCustomerSession());
  } catch (error) {
    return Response.json({ error: "Sign in to view this contract." }, { status: authErrorStatus(error) });
  }

  const parsedId = contractIdSchema.safeParse(contractId);
  if (!parsedId.success) return Response.json({ error: "Unknown contract." }, { status: 404 });

  try {
    const id = BigInt(parsedId.data);
    const contract = await prisma.contracts.findFirst({
      where: { id, ...customerContractsWhere(companyId) },
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
    // Template diagnostics are for Intermediano's admins, so customers only see that it failed.
    console.error("customer contract pdf template error", { contractId: parsedId.data, diagnostics: result.diagnostics });
    return Response.json({ error: "This contract couldn't be generated. Contact Intermediano." }, { status: 422 });
  } catch (error) {
    console.error("customer contract pdf failed", { contractId: parsedId.data, companyId: companyId.toString(), error });
    return Response.json({ error: "Could not generate this contract's PDF." }, { status: 500 });
  }
}
