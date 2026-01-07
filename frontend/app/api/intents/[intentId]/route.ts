import { getIntent, markClaimed } from "@/app/lib/store";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ intentId: string }> }
) {
  const { intentId } = await params;
  const intent = await getIntent(intentId);

  if (!intent) {
    return Response.json(null, { status: 404 });
  }

  return Response.json(intent);
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ intentId: string }> }
) {
  const { intentId } = await params;
  await markClaimed(intentId);
  return Response.json({ ok: true });
}
