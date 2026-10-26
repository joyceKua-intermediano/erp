import type { NextRequest } from "next/server";
import { requireClusterPermission } from "@/lib/auth";
import { contractIdSchema } from "@/lib/contracts";
import { authErrorStatus, pdfResponse, renderContractPdf } from "@/lib/contracts/render-pdf";

export async function GET(request: NextRequest, { params }: RouteContext<"/api/contracts/[contractId]/pdf">) {
  const { contractId } = await params;
  const searchParams = request.nextUrl.searchParams;

  let clusterId: bigint;
  try {
    ({ clusterId } = await requireClusterPermission(searchParams.get("cluster") ?? "", "contracts.view"));
  } catch (error) {
    return Response.json({ error: "You can't view contracts in this cluster." }, { status: authErrorStatus(error) });
  }

  const parsedId = contractIdSchema.safeParse(contractId);
  if (!parsedId.success) return Response.json({ error: "Unknown contract." }, { status: 404 });

  try {
    const result = await renderContractPdf(BigInt(parsedId.data), clusterId);
    if (result.ok) {
      return pdfResponse(result.pdf, result.fileName, searchParams.get("download") === "1" ? "attachment" : "inline");
    }
    if (result.reason === "not_found") {
      return Response.json({ error: "This contract doesn't exist in this cluster." }, { status: 404 });
    }
    if (result.reason === "no_template") {
      return Response.json({ error: "This contract has no Typst template to render." }, { status: 409 });
    }
    return Response.json(
      { error: "The contract template has errors.", diagnostics: result.diagnostics },
      { status: 422 },
    );
  } catch (error) {
    console.error("contract pdf failed", { contractId: parsedId.data, clusterId: clusterId.toString(), error });
    return Response.json({ error: "Could not generate this contract's PDF." }, { status: 500 });
  }
}
