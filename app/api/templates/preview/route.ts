import { requireClusterPermission, requirePermission } from "@/lib/auth";
import { authErrorStatus, pdfResponse, renderContractPdf } from "@/lib/contracts/render-pdf";
import { templatePreviewSchema } from "@/lib/templates";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send the template as JSON." }, { status: 400 });
  }

  const parsed = templatePreviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid preview request." }, { status: 400 });
  }
  const { source, contractId, clusterId: requestedClusterId } = parsed.data;

  let clusterId: bigint;
  try {
    await requirePermission("settings.view");
    ({ clusterId } = await requireClusterPermission(requestedClusterId, "contracts.view"));
  } catch (error) {
    return Response.json({ error: "You can't preview contracts in this cluster." }, { status: authErrorStatus(error) });
  }

  try {
    const result = await renderContractPdf(BigInt(contractId), clusterId, source);
    if (result.ok) return pdfResponse(result.pdf, result.fileName, "inline");
    if (result.reason === "not_found") {
      return Response.json({ error: "The sample contract no longer exists." }, { status: 404 });
    }
    if (result.reason === "no_template") {
      return Response.json({ error: "Write the template to see a preview." }, { status: 422 });
    }
    return Response.json({ error: "The template has errors.", diagnostics: result.diagnostics }, { status: 422 });
  } catch (error) {
    console.error("template preview failed", { contractId, clusterId: clusterId.toString(), error });
    return Response.json({ error: "Could not render the preview." }, { status: 500 });
  }
}
