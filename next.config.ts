import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin project root to this directory so the correct app (stir) is always built
  // when there are multiple lockfiles in parent folders (e.g. mealprep, pnpm).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
