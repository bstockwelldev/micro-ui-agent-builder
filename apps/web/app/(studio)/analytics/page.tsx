import { AnalyticsStudioView } from "@/components/studio/analytics-studio-view";
import { getAnalyticsDashboard } from "@/lib/server/analytics-dashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getAnalyticsDashboard();
  return <AnalyticsStudioView data={data} />;
}
