import type { NextConfig } from "next";

const LOCAL_DEV_ORIGINS = ["localhost:3001", "127.0.0.1:3001"];

function getHostFromUrl(urlValue?: string) {
  if (!urlValue) {
    return undefined;
  }

  try {
    return new URL(urlValue).host;
  } catch {
    return undefined;
  }
}

function getHostnameFromUrl(urlValue?: string) {
  if (!urlValue) {
    return undefined;
  }

  try {
    return new URL(urlValue).hostname;
  } catch {
    return undefined;
  }
}

function uniqueValues(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

const publicAppUrl = process.env.NEXTAUTH_URL;
const publicAppHost = getHostFromUrl(publicAppUrl);
const publicAppHostname = getHostnameFromUrl(publicAppUrl);

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: uniqueValues([publicAppHostname]),
  experimental: {
    serverActions: {
      allowedOrigins: uniqueValues([...LOCAL_DEV_ORIGINS, publicAppHost]),
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/api/**",
      },
    ],
  },
};

export default nextConfig;
