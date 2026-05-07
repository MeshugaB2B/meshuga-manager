// src/app/dashboard/rh/PhotoUploader.tsx
// Composant d'upload multi-photos avec preview, reorder, suppression.
// Utilisé par RetroUploadWizard.
// SWC-safe : var dans JSX, pas de generics, function() {}.

"use client"
import { useState, useRef, useEffect } from "react"

// Types (commentaires only — pas de generics dans useState pour SWC compat)
// Page = { id: string, file: File, preview: string|null, sizeMb: number, mime: string }

var MAX_FILE_MB = 20
var MAX_PAGES = 30 // garde-fou
var MESHUGA_PINK = "#FF82D7"
var MESHUGA_YELLOW = "#FFEB5A"
var MESHUGA_DARK = "#191923"

function makePageFromFile(file: any) {
  var sizeMb = file.size / (1024 * 1024)
  var mime = (file.type || "").toLowerCase()
  // HEIC/HEIF : pas de preview navigateur (Chrome/Firefox), Safari oui
  // On affichera une icône fallback dans ces cas
  var preview = null
  if (mime === "image/jpeg" || mime === "image/jpg" || mime === "image/png" || mime === "image/webp") {
    preview = URL.createObjectURL(file)
  }
  return {
    id: Math.random().toString(36).slice(2),
    file: file,
    preview: preview,
    sizeMb: sizeMb,
    mime: mime,
  }
}

export default function PhotoUploader(props: any) {
  // props : { pages, onChange, label?, maxPages?, disabled? }
  var pages = props.pages || []
  var onChange = props.onChange || function () {}
  var label = props.label || "Photos du document"
  var maxPagesProp = props.maxPages || MAX_PAGES
  var disabled = props.disabled === true

  var fileInputRef = useRef<any>(null)
  var [dragOver, setDragOver] = useState(false)

  // Cleanup URLs au démontage
  useEffect(function () {
    return function () {
      pages.forEach(function (p: any) {
        if (p.preview) {
          try { URL.revokeObjectURL(p.preview) } catch (e) {}
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addFiles(fileList: any) {
    if (disabled) return
    var newPages = []
    var rejected = []
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i]
      if (!f) continue
      var mime = (f.type || "").toLowerCase()
      var isImage = mime.indexOf("image/") === 0
      if (!isImage) {
        rejected.push(f.name + " (pas une image)")
        continue
      }
      var sizeMb = f.size / (1024 * 1024)
      if (sizeMb > MAX_FILE_MB) {
        rejected.push(f.name + " (" + sizeMb.toFixed(1) + " MB > " + MAX_FILE_MB + " MB)")
        continue
      }
      newPages.push(makePageFromFile(f))
    }
    if (rejected.length > 0) {
      window.alert("Fichiers ignorés :\n" + rejected.join("\n"))
    }
    var combined = pages.concat(newPages).slice(0, maxPagesProp)
    onChange(combined)
  }

  function handleInputChange(e: any) {
    var files = e.target && e.target.files ? e.target.files : []
    if (files.length > 0) addFiles(files)
    // Reset le input pour pouvoir re-uploader le même fichier
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleDrop(e: any) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (disabled) return
    var dt = e.dataTransfer
    if (dt && dt.files && dt.files.length > 0) addFiles(dt.files)
  }

  function handleDragOver(e: any) {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setDragOver(true)
  }

  function handleDragLeave(e: any) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  function movePage(idx: number, direction: number) {
    var newIdx = idx + direction
    if (newIdx < 0 || newIdx >= pages.length) return
    var copy = pages.slice()
    var tmp = copy[idx]
    copy[idx] = copy[newIdx]
    copy[newIdx] = tmp
    onChange(copy)
  }

  function removePage(idx: number) {
    var page = pages[idx]
    if (page && page.preview) {
      try { URL.revokeObjectURL(page.preview) } catch (e) {}
    }
    var copy = pages.slice()
    copy.splice(idx, 1)
    onChange(copy)
  }

  var totalSizeMb = pages.reduce(function (acc: number, p: any) { return acc + (p.sizeMb || 0) }, 0)

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontFamily: "Arial Narrow, sans-serif", fontWeight: "bold", fontSize: 14, color: MESHUGA_DARK }}>
          {label}
        </div>
        <div style={{ fontFamily: "Arial Narrow, sans-serif", fontSize: 12, color: "#666" }}>
          {pages.length} page{pages.length > 1 ? "s" : ""} • {totalSizeMb.toFixed(1)} MB
        </div>
      </div>

      {/* Zone drop / upload */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={function () { if (!disabled && fileInputRef.current) fileInputRef.current.click() }}
        style={{
          border: "2px dashed " + (dragOver ? MESHUGA_PINK : "#ccc"),
          borderRadius: 12,
          padding: 24,
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          background: dragOver ? "#FFF5FB" : "#FAFAFA",
          transition: "all 0.2s",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
        <div style={{ fontFamily: "Arial Narrow, sans-serif", fontSize: 14, color: MESHUGA_DARK }}>
          {pages.length === 0 ? "Glissez vos photos ici, ou cliquez pour en ajouter" : "Ajouter d'autres pages"}
        </div>
        <div style={{ fontFamily: "Arial Narrow, sans-serif", fontSize: 11, color: "#888", marginTop: 4 }}>
          JPEG, PNG, HEIC (iPhone), WEBP — max {MAX_FILE_MB} MB par photo
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          disabled={disabled}
          style={{ display: "none" }}
        />
      </div>

      {/* Liste des pages avec reorder */}
      {pages.length > 0 ? (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {pages.map(function (page: any, idx: number) {
            return (
              <div
                key={page.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                {/* Numéro de page */}
                <div
                  style={{
                    minWidth: 32,
                    height: 32,
                    background: MESHUGA_PINK,
                    color: "#fff",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Arial Narrow, sans-serif",
                    fontWeight: "bold",
                    fontSize: 14,
                  }}
                >
                  {idx + 1}
                </div>

                {/* Preview */}
                <div
                  style={{
                    width: 60,
                    height: 60,
                    background: "#f0f0f0",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {page.preview ? (
                    <img
                      src={page.preview}
                      alt={"page " + (idx + 1)}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ fontSize: 24 }}>🖼️</div>
                  )}
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "Arial Narrow, sans-serif",
                      fontSize: 13,
                      color: MESHUGA_DARK,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {page.file.name || "page-" + (idx + 1)}
                  </div>
                  <div style={{ fontFamily: "Arial Narrow, sans-serif", fontSize: 11, color: "#888" }}>
                    {page.sizeMb.toFixed(1)} MB • {page.mime || "?"}
                  </div>
                </div>

                {/* Boutons reorder */}
                <button
                  type="button"
                  onClick={function () { movePage(idx, -1) }}
                  disabled={idx === 0 || disabled}
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    border: "1px solid #ddd",
                    background: idx === 0 ? "#f5f5f5" : "#fff",
                    cursor: idx === 0 ? "not-allowed" : "pointer",
                    fontSize: 16,
                  }}
                  title="Monter"
                >↑</button>
                <button
                  type="button"
                  onClick={function () { movePage(idx, 1) }}
                  disabled={idx === pages.length - 1 || disabled}
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    border: "1px solid #ddd",
                    background: idx === pages.length - 1 ? "#f5f5f5" : "#fff",
                    cursor: idx === pages.length - 1 ? "not-allowed" : "pointer",
                    fontSize: 16,
                  }}
                  title="Descendre"
                >↓</button>
                <button
                  type="button"
                  onClick={function () { removePage(idx) }}
                  disabled={disabled}
                  style={{
                    width: 32, height: 32, borderRadius: 6,
                    border: "1px solid #f5b5b5",
                    background: "#fff",
                    color: "#c92a2a",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                  title="Supprimer"
                >×</button>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
