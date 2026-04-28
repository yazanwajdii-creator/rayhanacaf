#!/bin/bash
set -e
echo "Building index.html from source files..."

OUTFILE="index.html"

# ── HEAD (meta, fonts, CDN scripts) ──────────────────────────────────────────
cat > "$OUTFILE" << 'HTMLHEAD'
<!-- AUTO-GENERATED — edit files in src/ then run: bash build.sh -->
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=0.9,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0F2D18">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="ريحانة كافيه">
<title>ريحانة V24-3 PRO</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;600&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
<script src="supabase.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<link rel="manifest" id="pwaManifest">
HTMLHEAD

# ── CSS ──────────────────────────────────────────────────────────────────────
echo "<style>" >> "$OUTFILE"
for f in src/css/*.css; do
  cat "$f" >> "$OUTFILE"
done
echo "</style>" >> "$OUTFILE"
echo "</head>" >> "$OUTFILE"

# ── HTML BODY ─────────────────────────────────────────────────────────────────
cat src/html/body.html >> "$OUTFILE"

# ── JAVASCRIPT ───────────────────────────────────────────────────────────────
echo "<script>" >> "$OUTFILE"
for f in src/js/*.js; do
  cat "$f" >> "$OUTFILE"
done
echo "</script>" >> "$OUTFILE"
echo "</body>" >> "$OUTFILE"
echo "</html>" >> "$OUTFILE"

echo "Built $OUTFILE ($(wc -l < $OUTFILE) lines)"
