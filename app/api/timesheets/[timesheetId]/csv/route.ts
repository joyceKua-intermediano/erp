import type { NextRequest } from "next/server";
import { requireClusterPermission } from "@/lib/auth";
import { authErrorStatus } from "@/lib/contracts/render-pdf";
import { timesheetFileName, timesheetIdSchema, toTimesheetCsv } from "@/lib/timesheets";
import { findClusterTimesheet } from "@/lib/timesheets/records";

function asciiFallback(fileName: string) {
  return fileName.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "");
}

export async function GET(request: NextRequest, { params }: RouteContext<"/api/timesheets/[timesheetId]/csv">) {
  const { timesheetId } = await params;

  let clusterId: bigint;
  try {
    ({ clusterId } = await requireClusterPermission(request.nextUrl.searchParams.get("cluster") ?? "", "timesheets.view"));
  } catch (error) {
    return Response.json({ error: "You can't view timesheets in this cluster." }, { status: authErrorStatus(error) });
  }

  const parsedId = timesheetIdSchema.safeParse(timesheetId);
  if (!parsedId.success) return Response.json({ error: "Unknown timesheet." }, { status: 404 });

  try {
    const timesheet = await findClusterTimesheet(clusterId, BigInt(parsedId.data));
    if (!timesheet) return Response.json({ error: "This timesheet doesn't exist in this cluster." }, { status: 404 });

    const fileName = timesheetFileName(timesheet);
    // The byte order mark lets Excel open accented employee names as UTF-8.
    return new Response(`\uFEFF${toTimesheetCsv(timesheet)}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${asciiFallback(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("timesheet csv failed", { timesheetId: parsedId.data, clusterId: clusterId.toString(), error });
    return Response.json({ error: "Could not export this timesheet." }, { status: 500 });
  }
}
