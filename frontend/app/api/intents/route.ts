import { saveIntent } from "@/app/lib/store";

export async function POST(req: Request) {
  const body = await req.json();
  await saveIntent({
    ...body,
    status: "pending",
  });

  return Response.json({ ok: true });
}
