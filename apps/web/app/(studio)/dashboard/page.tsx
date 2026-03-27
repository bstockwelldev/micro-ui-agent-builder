import { redirect } from "next/navigation";

import { GenUICommandCenter } from "@/components/studio/dashboard/genui-command-center";
import { StudioPage } from "@/components/studio/studio-page";
import { getDashboardCommandCenterData } from "@/lib/server/dashboard-command-center";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const sp = await searchParams;
  const flowId = firstString(sp.flowId);
  if (flowId) {
    const q = new URLSearchParams();
    q.set("flowId", flowId);
    const agentId = firstString(sp.agentId);
    if (agentId) q.set("agentId", agentId);
    redirect(`/flows?${q.toString()}`);
  }

  const data = await getDashboardCommandCenterData();

  return (
    <StudioPage>
      <GenUICommandCenter data={data} />
    </StudioPage>
  );
}
