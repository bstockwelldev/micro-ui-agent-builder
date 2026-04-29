import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["langfuse", "@langchain/langgraph"],
  turbopack: {
    // Monorepo lives here; avoids picking a parent-folder lockfile as workspace root.
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
