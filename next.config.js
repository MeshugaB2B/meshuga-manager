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
    // le bundle de CHAQUE fonction qui rend du PDF.
    outputFileTracingIncludes: {
      "/api/hr/backfill-pdf": ["./node_modules/@sparticuz/chromium/**"],
      "/api/sign/[token]/submit": ["./node_modules/@sparticuz/chromium/**"],
      "/api/hr/hygiene-guide/preview": ["./node_modules/@sparticuz/chromium/**"],
    },
  },
}
module.exports = nextConfig
