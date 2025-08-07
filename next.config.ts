import type { NextConfig } from "next";

const isTauri = process.env.IS_TAURI === 'true';

const nextConfig: NextConfig = {
  // Apply Tauri-specific settings only when IS_TAURI is true
  ...(isTauri && {
    output: 'export',
    images: {
      unoptimized: true,
    },
  }),
  webpack: (config) => {
    if (process.env.NODE_ENV === "development") {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: "@dyad-sh/nextjs-webpack-component-tagger",
      });
    }
    return config;
  },
};

export default nextConfig;