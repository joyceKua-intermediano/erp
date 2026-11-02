import type { NextRequest } from "next/server";
import { requireClusterPermission } from "@/lib/auth";
import { authErrorStatus } from "@/lib/contracts/render-pdf";
import { requireEmployeeSession } from "@/lib/employee-auth";
import { detectImageType, expenseIdSchema, parseStoredItems, receiptImageTypes, toExpenseLine } from "@/lib/expenses";
import { clusterExpensesWhere } from "@/lib/expenses/records";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

// Admins pass ?cluster= and need expenses.view there; otherwise only the employee who owns the claim can see it.
export async function GET(request: NextRequest, { params }: RouteContext<"/api/expenses/[expenseId]/receipts/[item]">) {
  const { expenseId, item } = await params;
  const parsedId = expenseIdSchema.safeParse(expenseId);
  const index = /^\d+$/.test(item) ? Number(item) : Number.NaN;
  if (!parsedId.success || !Number.isSafeInteger(index)) {
    return Response.json({ error: "Unknown receipt." }, { status: 404 });
  }

  const clusterParam = request.nextUrl.searchParams.get("cluster");
  let where: { id: bigint; employee_id?: bigint; employees?: { intermediano_company_id: bigint } };
  try {
    if (clusterParam !== null) {
      const { clusterId } = await requireClusterPermission(clusterParam, "expenses.view");
      where = { id: BigInt(parsedId.data), ...clusterExpensesWhere(clusterId) };
    } else {
      const { employeeId } = await requireEmployeeSession();
      where = { id: BigInt(parsedId.data), employee_id: employeeId };
    }
  } catch (error) {
    return Response.json({ error: "You can't view this receipt." }, { status: authErrorStatus(error) });
  }

  try {
    const row = await prisma.employee_expenses.findFirst({ where, select: { expenses: true } });
    const stored = row ? parseStoredItems(row.expenses)[index] : undefined;
    const receipt = stored ? toExpenseLine(stored).receipt : null;
    if (!receipt) return Response.json({ error: "This expense has no receipt." }, { status: 404 });

    const file = await readStoredFile(receipt);
    if (!file) return Response.json({ error: "Receipt not available." }, { status: 404 });

    const imageType = detectImageType(file);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": imageType ? receiptImageTypes[imageType] : "application/octet-stream",
        ...(imageType ? {} : { "Content-Disposition": "attachment" }),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("expense receipt read failed", { expenseId: parsedId.data, index, error });
    return Response.json({ error: "Could not load this receipt." }, { status: 500 });
  }
}
