"use client";

import type { UIMessage } from "ai";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { AgentSessionLogEntry } from "@/components/studio/agent-session-log";

export type ChatLogSnapshotState = {
  chatStatus: string;
  chatError: string | null;
  preferOllama: boolean;
  messages: UIMessage[];
};

const defaultChatSnapshot: ChatLogSnapshotState = {
  chatStatus: "ready",
  chatError: null,
  preferOllama: false,
  messages: [],
};

type StudioRunnerContextValue = {
  logEntries: AgentSessionLogEntry[];
  appendLog: (
    kind: AgentSessionLogEntry["kind"],
    message: string,
    detail?: unknown,
  ) => void;
  clearLog: () => void;
  chatLogSnapshot: ChatLogSnapshotState;
  setChatLogSnapshot: React.Dispatch<
    React.SetStateAction<ChatLogSnapshotState>
  >;
};

const StudioRunnerContext = createContext<StudioRunnerContextValue | null>(
  null,
);

export function StudioRunnerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [logEntries, setLogEntries] = useState<AgentSessionLogEntry[]>([]);
  const [chatLogSnapshot, setChatLogSnapshot] =
    useState<ChatLogSnapshotState>(defaultChatSnapshot);

  const appendLog = useCallback(
    (
      kind: AgentSessionLogEntry["kind"],
      message: string,
      detail?: unknown,
    ) => {
      setLogEntries((prev) => [
        ...prev,
        { at: new Date().toISOString(), kind, message, detail },
      ]);
    },
    [],
  );

  const clearLog = useCallback(() => setLogEntries([]), []);

  const value = useMemo(
    () => ({
      logEntries,
      appendLog,
      clearLog,
      chatLogSnapshot,
      setChatLogSnapshot,
    }),
    [logEntries, appendLog, clearLog, chatLogSnapshot],
  );

  return (
    <StudioRunnerContext.Provider value={value}>
      {children}
    </StudioRunnerContext.Provider>
  );
}

export function useStudioRunner() {
  const ctx = useContext(StudioRunnerContext);
  if (!ctx) {
    throw new Error("useStudioRunner must be used within StudioRunnerProvider");
  }
  return ctx;
}
