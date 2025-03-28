import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Configure redirects or rewrites if needed
  // async redirects() {
  //   return [
  //     // Add redirects here if needed
  //   ];
  // },
  
  // Explicitly set the directory where the app is built
  distDir: '.next',
  
  // Add environment variables that should be accessible to the browser
  env: {
    // You can add fallbacks here, but prefer Vercel dashboard for env vars
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  },
  
  // Exclude certain paths from the build
  webpack: (config, { isServer }) => {
    // Don't attempt to bundle Firebase Admin SDK on client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    
    return config;
  },
  
  // Handle images from external domains if using Firebase Storage
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      // Add other domains as needed
    ],
  },
};

export default nextConfig;
