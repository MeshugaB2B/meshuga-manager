// src/app/dashboard/rh/import/page.tsx
// Page dédiée à l'import rétroactif de l'historique RH.
// URL : https://meshuga-manager.vercel.app/dashboard/rh/import
// SWC-safe.

"use client"
import RetroUploadWizard from "../RetroUploadWizard"

export default function RhImportPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", paddingTop: 16, paddingBottom: 64 }}>
      <RetroUploadWizard />
    </div>
  )
}
