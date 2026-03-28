/** @type {import('next').NextConfig} */
// rebuild trigger
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
}
module.exports = nextConfig
