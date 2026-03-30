import type { UIMessage } from "ai";

export type RunExecutorRequestBody = {
  messages?: UIMessage[];
  flowId?: string;
  /** When set, merges that agent profile into the system prompt after the flow text. */
  agentId?: string;
  /** When true, use Ollama (OLLAMA_BASE_URL) for this request only. */
  preferOllama?: boolean;
};

export type GenUiExecutorRequestBody = {
  flowId?: string;
  instruction?: string;
  agentId?: string;
};

export type OrchestrationRouteResponse = Response;

export interface RunRouteExecutor {
  executeRun(req: Request): Promise<OrchestrationRouteResponse>;
}

export interface GenUiRouteExecutor {
  executeGenUi(req: Request): Promise<OrchestrationRouteResponse>;
}

export type OrchestrationRouteExecutor = RunRouteExecutor & GenUiRouteExecutor;
