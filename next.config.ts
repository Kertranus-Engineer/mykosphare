import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // HOME V2 used to live in the design lab; the old links keep working and land on the official /home.
      { source: "/design-lab/home-v2", destination: "/home", permanent: false },
      { source: "/design-lab/home-v2/:path*", destination: "/home/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
