/** @type {import('next').NextConfig} */
// rebuild trigger
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Libs à ne PAS bundler (binaires/CDP Chrome + pdfjs embarqué dans unpdf).
    serverComponentsExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "unpdf"],
    // Inclusion du Chromium brotli dans chaque fonction qui rend du PDF.
    outputFileTracingIncludes: {
      "/api/hr/backfill-pdf": ["./node_modules/@sparticuz/chromium/**"],
      "/api/sign/[token]/submit": ["./node_modules/@sparticuz/chromium/**"],
      "/api/hr/hygiene-guide/preview": ["./node_modules/@sparticuz/chromium/**"],
      "/api/sign-attestation/[token]/submit": ["./node_modules/@sparticuz/chromium/**"],
    },
  },
}
module.exports = nextConfig
