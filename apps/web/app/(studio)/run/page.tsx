import { redirect } from "next/navigation";

type RunPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RunPage({ searchParams }: RunPageProps) {
  const resolved = (await searchParams) ?? {};

  const flowId =
    typeof resolved.flowId === "string" && resolved.flowId.length > 0
      ? resolved.flowId
      : undefined;
  const agentId =
    typeof resolved.agentId === "string" && resolved.agentId.length > 0
      ? resolved.agentId
      : undefined;

  if (flowId) {
    const q = new URLSearchParams();
    if (agentId) q.set("agentId", agentId);
    const qs = q.toString();
    redirect(`/flows/${encodeURIComponent(flowId)}${qs ? `?${qs}` : ""}`);
  }

  redirect("/flows");
}
