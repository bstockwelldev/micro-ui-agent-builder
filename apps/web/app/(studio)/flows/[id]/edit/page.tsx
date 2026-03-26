import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FlowEditRedirect({ params }: PageProps) {
  const { id } = await params;
  redirect(`/flows/${id}`);
}
