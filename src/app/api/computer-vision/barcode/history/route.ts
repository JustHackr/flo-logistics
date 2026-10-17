import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireApiRole(["ADMIN", "OPS_MANAGER", "WAREHOUSE"]);
  if (!access.ok) return access.response;
  const params = new URL(request.url).searchParams;
  const code = params.get("code")?.trim().toUpperCase();
  const rows = await prisma.parcelVerificationScan.findMany({
    where: code ? { code } : undefined,
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, code: true, format: true, outcome: true, source: true, message: true, checksJson: true, fixtureId: true, createdAt: true, actorUser: { select: { name: true } } },
  });
  return NextResponse.json({ scans: rows.map((row) => ({ ...row, checks: (() => { try { return JSON.parse(row.checksJson); } catch { return []; } })(), createdAt: row.createdAt.toISOString(), actorName: row.actorUser?.name ?? "System" })) });
}
