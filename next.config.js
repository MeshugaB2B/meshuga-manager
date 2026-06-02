/** @type {import('next').NextConfig} */
// rebuild trigger
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Empêche Next/webpack de bundler ces libs (binaire Chrome + CDP) : elles
    // doivent rester telles quelles dans node_modules côté fonction serverless.
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    // Force l'inclusion des fichiers brotli de Chromium (dossier bin/*.br) dans
    // le bundle de la/les fonction(s) PDF. Sans ça : "input directory .../bin does not exist".
    outputFileTracingIncludes: {
      "/api/hr/pdf-selftest": ["./node_modules/@sparticuz/chromium/**"],
    },
  },
}
module.exports = nextConfig
