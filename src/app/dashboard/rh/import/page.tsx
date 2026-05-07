// src/app/dashboard/rh/import/page.tsx
// Page dédiée à l'import rétroactif de l'historique RH.
// URL : https://meshuga-manager.vercel.app/dashboard/rh/import
// SWC-safe.

"use client"
import RetroUploadWizard from "../RetroUploadWizard"

export default function RhImportPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", paddingBottom: 64 }}>
      {/* Bandeau de retour vers le dashboard RH */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #eee",
        padding: "12px 16px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={function () { window.location.href = "/dashboard" }}
            style={{
              background: "none",
              border: "none",
              color: "#FF82D7",
              cursor: "pointer",
              fontSize: 14,
              padding: 4,
              fontFamily: "Arial Narrow, sans-serif",
              fontWeight: "bold",
            }}
          >← Retour au dashboard</button>
          <div style={{ fontSize: 12, color: "#888", fontFamily: "Arial Narrow, sans-serif" }}>
            Module RH · Digitalisation rétroactive
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 16 }}>
        <RetroUploadWizard />
      </div>
    </div>
  )
}
