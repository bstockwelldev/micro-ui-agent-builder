import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy URL: opens flow workspace with settings modal (bookmark-safe). */
export default async function FlowSettingsRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/flows/${encodeURIComponent(id)}?flowSettings=1`);
}
