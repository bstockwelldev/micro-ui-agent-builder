import { StudioPage } from "@/components/studio/studio-page";
import { StudioPageHeader } from "@/components/studio/studio-page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const environments = [
  {
    name: "Preview",
    status: "healthy" as const,
    detail: "Maps to Vercel preview + file-backed studio store.",
  },
  {
    name: "Production",
    status: "planned" as const,
    detail: "Promote when runner persistence and auth are wired.",
  },
];

export default function DeploymentsPage() {
  return (
    <StudioPage>
      <StudioPageHeader
        title="Deployments"
        description="Environment matrix, revision pins, and rollout notes. Hook CI/CD metadata here when deployments are tracked."
      />
      <ul className="grid gap-5 md:grid-cols-2">
        {environments.map((env) => (
          <li key={env.name}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{env.name}</CardTitle>
                  <Badge variant={env.status === "healthy" ? "secondary" : "outline"}>
                    {env.status}
                  </Badge>
                </div>
                <CardDescription>{env.detail}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground font-mono text-xs">
                  Endpoints and secrets: configure via env templates in the repo.
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </StudioPage>
  );
}
