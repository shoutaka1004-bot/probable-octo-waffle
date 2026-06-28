import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HTTPS self-signed cert for local network testing (smartphone access)
  // Run with: next dev --experimental-https
};

export default nextConfig;
