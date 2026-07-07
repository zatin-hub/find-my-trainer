import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module used only for local dev; keep it out of
  // the bundle. On Cloudflare the data layer uses D1 instead (see lib/database.ts).
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
