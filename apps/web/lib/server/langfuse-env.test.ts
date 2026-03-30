import { afterEach, describe, expect, it } from "vitest";

import {
  isLangfuseTracingEnabled,
  requireLangfuseEnvIfEnabled,
} from "./langfuse-env";

const SNAPSHOT = {
  LANGFUSE_TRACING_ENABLED: process.env.LANGFUSE_TRACING_ENABLED,
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
  LANGFUSE_BASEURL: process.env.LANGFUSE_BASEURL,
};

afterEach(() => {
  process.env.LANGFUSE_TRACING_ENABLED = SNAPSHOT.LANGFUSE_TRACING_ENABLED;
  process.env.LANGFUSE_PUBLIC_KEY = SNAPSHOT.LANGFUSE_PUBLIC_KEY;
  process.env.LANGFUSE_SECRET_KEY = SNAPSHOT.LANGFUSE_SECRET_KEY;
  process.env.LANGFUSE_BASEURL = SNAPSHOT.LANGFUSE_BASEURL;
});

describe("langfuse telemetry gating", () => {
  it("returns disabled when toggle is not set", () => {
    delete process.env.LANGFUSE_TRACING_ENABLED;

    expect(isLangfuseTracingEnabled()).toBe(false);
    expect(requireLangfuseEnvIfEnabled()).toBeNull();
  });

  it("allows requests when enabled with full key set", () => {
    process.env.LANGFUSE_TRACING_ENABLED = "true";
    process.env.LANGFUSE_PUBLIC_KEY = "pk_test";
    process.env.LANGFUSE_SECRET_KEY = "sk_test";
    process.env.LANGFUSE_BASEURL = "https://us.cloud.langfuse.com";

    expect(isLangfuseTracingEnabled()).toBe(true);
    expect(requireLangfuseEnvIfEnabled()).toEqual({
      publicKey: "pk_test",
      secretKey: "sk_test",
      baseUrl: "https://us.cloud.langfuse.com",
    });
  });

  it("throws when enabled but missing keys", () => {
    process.env.LANGFUSE_TRACING_ENABLED = "1";
    delete process.env.LANGFUSE_PUBLIC_KEY;
    process.env.LANGFUSE_SECRET_KEY = "sk_test";

    expect(() => requireLangfuseEnvIfEnabled()).toThrow(
      "Langfuse tracing is enabled but LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY is missing.",
    );
  });

  it("uses default base URL when unset", () => {
    process.env.LANGFUSE_TRACING_ENABLED = "yes";
    process.env.LANGFUSE_PUBLIC_KEY = "pk_test";
    process.env.LANGFUSE_SECRET_KEY = "sk_test";
    delete process.env.LANGFUSE_BASEURL;

    expect(requireLangfuseEnvIfEnabled()).toMatchObject({
      baseUrl: "https://cloud.langfuse.com",
    });
  });
});
