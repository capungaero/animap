# 🚀 Quick Setup Guide

## Installation (2 minutes)

### Option 1: Local File (Simplest)
```bash
# 1. Navigate to project folder
cd /workspaces/animap

# 2. Open in browser
# Method A: VS Code
#   - Right-click index.html → Open with Live Server

# Method B: Python HTTP Server
python3 -m http.server 8000

# Method C: Direct file (may have CORS issues)
# Open file:///workspaces/animap/index.html
```

### Option 2: Deploy to Web
Upload the three files to any web hosting:
- `index.html`
- `app.js`
- Include link to this README if desired

All dependencies load from CDN - no build step needed!

---

## First Run Checklist

- [ ] index.html opens without errors
- [ ] Map is visible and centered
- [ ] Input fields are accessible
- [ ] "Generate Route" button responds to clicks
- [ ] Try example: `-6.2088,106.8456` to `-6.1751,106.8291`
- [ ] Route displays with blue polyline and orange animated line
- [ ] Green marker at start, red marker at end
- [ ] Recording button appears after route loads

---

## 🧪 Minimal Test (30 seconds)

```
1. Copy this into "Titik Awal": -6.2088,106.8456
2. Copy this into "Titik Tujuan": -6.1751,106.8291
3. Click "Generate Route"
4. Wait 2 seconds for route to load
5. Observe: Blue polyline + Orange animated line + Green/Red markers
6. Success! ✅
```

---

## 🎥 Recording Test (2 minutes)

```
1. After route loads
2. Click "Record Video"
3. Watch the car icon move along the route
4. Wait for animation to complete (~10-15 seconds)
5. "Recording complete" message appears
6. Click "Download Video"
7. File saves as "route-2026-04-14.webm"
8. Success! ✅
```

---

## ⚠️ Troubleshooting

### Map not showing
- **Check browser console** (F12 → Console tab)
- Ensure you have **internet connection** (Leaflet CDN required)
- Try a different browser (Chrome/Firefox recommended)

### Route not found
- **Invalid coordinates?** Use format: `latitude,longitude` (no spaces after comma)
- **Test coordinates**: `-6.2088,106.8456` (known to work)
- **Check if valid roads**: OSRM only finds routes on mapped roads

### Recording not working
- **Browser issue?** Chrome/Firefox work best
- **Canvas capture unsupported?** Some browsers don't support canvas.captureStream()
- **Try alternative**: Use `screen.getDisplayMedia()` fallback (with user permission)

### Video file won't open
- **Wrong codec?** WebM files need VP9 decoder
- **Try in**: Chrome, Firefox, VLC Player
- **Fallback**: Convert `.webm` to `.mp4` using FFmpeg:
  ```bash
  ffmpeg -i input.webm -vcodec libx264 output.mp4
  ```

---

## 📱 Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 85+ | ✅ Full | Best compatibility |
| Firefox 78+ | ✅ Full | Works great |
| Safari 14.1+ | ⚠️ Partial | Limited WebM support |
| Edge 85+ | ✅ Full | Same as Chrome |

---

## 📊 Performance Tips

**For faster performance:**
- Use "CartoDB Positron" or "OpenStreetMap" style (fastest rendering)
- Select shorter routes (< 10 km)
- Use 1.0x-1.5x animation speed
- Close other browser tabs

**For better video quality:**
- Use fullscreen browser window (larger canvas = higher resolution)
- Slower animation speed (0.5x-1.0x) = smoother video
- Use "CartoDB Voyager" or "Satellite" for visual interest

---

## 🔧 File Overview

| File | Purpose | Size |
|------|---------|------|
| `index.html` | UI & Layout | ~15 KB |
| `app.js` | Logic & Features | ~18 KB |
| `README_FULL.md` | Complete documentation | ~25 KB |
| `SETUP.md` | This file | ~3 KB |

**Total**: ~61 KB (All CDN libraries loaded separately)

---

## 📞 Common Questions

**Q: Do I need an API key?**  
A: No! OSRM is completely free and open.

**Q: Can I use this offline?**  
A: No, Leaflet & tile maps require internet. OSRM API also needs connection.

**Q: How long can routes be?**  
A: Up to ~500 km works well. Longer routes may timeout.

**Q: Can I record my screen instead?**  
A: Yes, modify app.js to use `navigator.mediaDevices.getDisplayMedia()` instead of canvas.captureStream()

**Q: Where do I report bugs?**  
A: Check the main [README_FULL.md](README_FULL.md#🐛-common-issues--solutions) for troubleshooting.

---

## 🎓 Next Steps

1. **Explore features**: Try different map styles and animation speeds
2. **Customize**: Edit `app.js` to change colors, icons, behavior
3. **Deploy**: Upload files to web server or hosting service
4. **Share**: Send `index.html` link to friends!

---

**Status**: Ready to use ✅  
**Created**: 2026-04-14
