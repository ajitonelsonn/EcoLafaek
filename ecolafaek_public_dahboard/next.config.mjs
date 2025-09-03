/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["tl-waste-monitoring-images.s3.amazonaws.com"],
  },
};

export default nextConfig;
