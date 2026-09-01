# MDMIS — Actions Log & Technical Changelog

**Platform:** Mineral Detection & Mining Intelligence System (MDMIS)  
**Target Region:** Rwanda & East Africa / Eastern DRC Mining Corridor  
**Date:** June 2026 / Active Sprint  
**Document Version:** 1.2.0  

---

## 📌 Executive Summary

This document tracks all frontend feature enhancements, technical fixes, architectural decisions, and visual upgrades applied to the **MDMIS** platform. It serves as an immutable action log and reference guide for the engineering and product team.

---

## 🛠️ Action Log

### 1. React Hydration Error Fix (`<button>` inside `<button>`)
- **Diagnosis:** In `components/map/cesium-explorer.tsx` and `components/map/mapbox-explorer.tsx`, the site list rendered an outer `<button>` wrapping the entire row with an inner `<button>` for the inspect terrain block action when active. In HTML5/React, button elements cannot have button descendants, throwing a React hydration error.
- **Fix:** Converted the outer row container into an accessible, interactive `role="button"` `<div>` with `tabIndex={0}`, keyboard navigation handling (`Enter`/`Space`), and `cursor-pointer`, eliminating the nested `<button>` invalid DOM hierarchy.

### 2. 3D Satellite Globe (Cesium) Full-Frame Rendering & Enhancements
- **Diagnosis:** On `/map/globe`, the 3D Cesium globe was either not rendering or appearing in a small corner box.
- **Fixes & Enhancements:**
  1. **Guaranteed Global Loader (`ensureCesium()`):** Implemented a browser loader in `cesium-globe.tsx` that ensures `Cesium.js` and `widgets.css` are linked and `CESIUM_BASE_URL = '/cesium/'` is set before instantiating the viewer.
  2. **Synchronous Key-Free High-Resolution Imagery:** Initialized viewer with `baseLayer: false` and attached Esri World Imagery (`ArcGisMapServerImageryProvider` / `UrlTemplateImageryProvider`) with zero external token dependencies.
  3. **Full-Frame Layout & Dynamic Resize:** Enforced full-height flex and grid constraints with a `ResizeObserver` on `containerRef` to dynamically trigger `viewer.resize()`.
  4. **Subsurface 3D Depth Beacons:** Added glowing 3D depth pillars from surface pins down/up to deposit depths for all 10 Rwandan mine sites.
  5. **Real-Time Transport Corridors:** Added 3D curved geodesic transport arcs for active convoys between Kigali and regional export ports.
  6. **Interactive Camera HUD & Basemap Switcher:** Added controls for Reset View (Rwanda overview at 45°), Zoom In/Out, 2D/3D Pitch, Basemap switcher (Satellite, Terrain, Streets), and Layer toggles.
