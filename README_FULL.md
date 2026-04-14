# 🗺️ Travel Route Video Generator (Leaflet Edition)

A web-based application that generates animated video of travel routes using Leaflet.js, OSRM API, and modern web standards.

## 📋 Features

### Phase 1: Setup & Routing ✅
- **Fullscreen Map Interface**: Interactive Leaflet.js map with real-time rendering
- **Coordinate Input**: Enter start and destination coordinates (latitude, longitude)
- **OSRM Integration**: Real routing via OSRM (Open Source Routing Machine)
- **Route Display**: Visual polyline overlay showing the calculated route

### Phase 2: Animation & Visuals ✅
- **Animated Route Path**: AntPath animation showing moving dashes along the route
- **Moving Marker**: Vehicle icon that travels along the route coordinates
- **Camera Following**: Dynamic map movement that follows the vehicle in real-time
- **Dynamic Zoom**: Camera zooms in progressively as animation progresses

### Phase 3: Video Recording ✅
- **Canvas Capture**: Records the map canvas at 30 FPS
- **Synchronized Recording**: Animation duration matches video recording duration
- **WebM Export**: Downloads recorded video as `.webm` file (VP9 codec)
- **Auto-Download**: One-click download after recording completes

### Phase 4: UI/UX Refinement ✅
- **Map Style Selector**: 
  - CartoDB Positron (light, clean)
  - CartoDB Voyager (detailed)
  - OpenStreetMap (standard)
  - Satellite (aerial view)
- **Animation Speed Slider**: Adjust playback speed (0.5x - 3.0x)
- **Auto-Zoom**: Automatically fits entire route in viewport at start
- **Status Messages**: Real-time feedback for user actions

## 🚀 Quick Start

### 1. Setup
Simply open `index.html` in a modern web browser. All dependencies are loaded via CDN:
- **Leaflet.js**: Map library
- **Leaflet.AntPath**: Animated polyline plugin
- **OSRM API**: Free routing service (no API key required)

### 2. Basic Usage

```
1. Enter start coordinates (e.g., -6.2088,106.8456 for Jakarta)
2. Enter destination coordinates (e.g., -6.1751,106.8291)
3. Click "Generate Route"
4. Wait for route to load
5. Click "Record Video" to start animation recording
6. Wait for animation to complete
7. Click "Download Video" to save as .webm file
```

## 📍 Example Coordinates

### Jakarta, Indonesia
- Start: `-6.2088,106.8456` (Kota Tua)
- End: `-6.1751,106.8291` (Menteng)

### Bangkok, Thailand
- Start: `13.7563,100.5018` (BTS Siam)
- End: `13.7346,100.5314` (Lumphini Park)

### Singapore
- Start: `1.3521,103.8198` (Marina Bay)
- End: `1.3644,103.9915` (Changi)

### Usage Format
Coordinates must be in **[Latitude, Longitude]** format, separated by comma and optional space.

## 🎮 Control Panel

### Route Generation Section
| Input | Purpose | Format |
|-------|---------|--------|
| Titik Awal | Starting point | `latitude,longitude` |
| Titik Tujuan | Destination | `latitude,longitude` |
| Generate Route | Fetch & display route | Button |
| Clear | Reset all | Button |

### Visualization Settings
| Control | Range | Effect |
|---------|-------|--------|
| Map Style | 4 options | Changes map appearance |
| Animation Speed | 0.5x - 3.0x | Adjusts playback speed |

### Video Recording
| Button | Function |
|--------|----------|
| Record Video | Start/Stop recording |
| Download Video | Save recorded video |

## 🔧 Technical Architecture

### File Structure
```
animap/
├── index.html          # Main HTML with Leaflet map & UI
├── app.js              # Core application logic
├── README.md           # Documentation (this file)
└── .git/               # Version control
```

### Core Technologies

**Frontend Stack:**
- HTML5 Canvas (via Leaflet)
- CSS3 (Flexbox layout)
- Vanilla JavaScript (ES6+)

**Libraries:**
- **Leaflet.js** (1.9.4): Map rendering & interactivity
- **Leaflet.AntPath** (1.1.2): Animated polyline visualization
- **OSRM API**: Open routing service (no authentication needed)
- **MediaRecorder API**: Native browser video capture

**APIs:**
```
OSRM Route API: https://router.project-osrm.org/route/v1/driving/{coords}
Response: GeoJSON with coordinates, distance, duration
```

### Data Flow Diagram

```
User Input
   ↓
[Start Lat,Lon] + [End Lat,Lon]
   ↓
OSRM API Request
   ↓
Receive GeoJSON Route
   ↓
Display Route + Polyline
   ↓
Start Recording (30 FPS)
   ↓
Animate Marker + Camera Follow
   ↓
Capture Canvas Frames
   ↓
Render WebM Video
   ↓
Download .webm File
```

## 🎯 How Each Phase Works

### Phase 1: Routing
1. Parse user coordinates input
2. Validate latitude/longitude format
3. Call OSRM API with coordinates
4. Receive GeoJSON geometry (coordinates array)
5. Display polyline on map
6. Place markers at start/end points

### Phase 2: Animation
1. Create animated AntPath from route coordinates
2. Create custom car/vehicle marker icon
3. During playback:
   - `animateMarkerAlongRoute()` loops through each coordinate
   - Updates marker position at calculated intervals
   - `cameraFollow()` keeps map centered on marker
   - Dynamic zoom increases as animation progresses
4. Animation duration based on route distance

### Phase 3: Video Recording
1. Get canvas element from Leaflet map
2. Call `canvas.captureStream(30)` - requests 30 FPS capture
3. Create MediaRecorder from stream
4. Start animation and recording simultaneously
5. Automatic stop when animation completes
6. Collected frame blobs encoded as WebM video

### Phase 4: Refinement Features
1. **Style Selector**: Switch tile layers without stopping
2. **Speed Slider**: Multiplier for animation duration
3. **Auto-Zoom**: `map.fitBounds()` on route generation
4. **Status Messages**: User feedback at each step

## 💾 Performance Considerations

### Optimization Tips
- Use **Satellite mode** for faster rendering (fewer map details)
- **Low speed** (0.5x-1x) for better video quality
- **Shorter routes** render and record faster
- Browser rendering uses GPU acceleration (CSS transforms on camera movement)

### Browser Requirements
- Chrome/Edge 65+ (MediaRecorder, WebP video)
- Firefox 55+ (similar support)
- Safari 14.1+ (WebM support may vary)
- Requires CORS access to OSRM API (works from any origin - no restrictions)

### Video Output Quality
- **Codec**: VP9 (WebM container)
- **Frame Rate**: 30 FPS
- **Resolution**: Current map canvas size (typically 1920x1080 if fullscreen)
- **File Size**: ~5-15 MB per minute (dependent on map complexity)

## 🐛 Common Issues & Solutions

### "Route not found"
- **Cause**: Coordinates outside valid road network or too close
- **Fix**: Try major cities/highways instead of remote areas
- Test with provided example coordinates

### No video downloads
- **Cause**: Browser canvas capture not available or blocked
- **Check**: Enable all permissions, use HTTPS in production
- **Workaround**: Check browser console (F12) for errors

### Stuttering animation
- **Cause**: Browser resource constraints
- **Fix**: Use simpler map style, reduce screen resolution
- **Try**: Disable other browser tabs/extensions

### OSRM API timeouts
- **Cause**: Network connectivity or route too complex
- **Fix**: Use shorter routes, check internet connection
- **Fallback**: Service may be temporarily unavailable

## 🔐 Security Notes

- **No server required**: Runs entirely in client-side JavaScript
- **No tracking**: No analytics or data collection
- **OSRM API**: Third-party service, review their privacy policy
- **Canvas data**: Never leaves your browser

## 📦 Dependencies (via CDN)

```html
<!-- Leaflet Core -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>

<!-- Leaflet AntPath Plugin -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet-ant-path/1.1.2/leaflet-ant-path.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet-ant-path/1.1.2/leaflet-ant-path.umd.min.js"></script>

<!-- Application -->
<script src="app.js"></script>
```

No npm/package.json required!

## 🧪 Testing Guide

### Test Case 1: Basic Route Generation
```
Input: -6.2088,106.8456 | -6.1751,106.8291
Expected: Blue polyline with AntPath animation, green start marker, red end marker
```

### Test Case 2: Animation Playback
```
Steps:
1. Generate route
2. Click Record Video
3. Observe car icon moving along route
4. Observe camera following the marker
Expected: Smooth movement for 5-20 seconds, camera zooms in progressively
```

### Test Case 3: Map Style Switching
```
Steps:
1. Generate route
2. Change "Map Style" dropdown
Expected: Map background changes, route and markers remain
```

### Test Case 4: Speed Adjustment
```
Steps:
1. Generate route
2. Set speed slider to 2.0x
3. Record video
Expected: Animation finishes faster, recording duration shorter
```

### Test Case 5: Video Download
```
Steps:
1. Generate route
2. Record video (wait for completion)
3. Click "Download Video"
Expected: .webm file downloads to downloads folder
```

## 🎨 Customization Guide

### Change Initial Map Center
In `app.js`, line ~45:
```javascript
map = L.map('map').setView([-6.2088, 106.8456], 12);
//                         [latitude, longitude], zoom
```

### Adjust Animation Duration Calculation
In `app.js`, line ~150 (displayRoute function):
```javascript
animationDuration = Math.max(5000, Math.min(20000, distance * 500));
//                                                  ↑ multiply by this value
```

### Change Vehicle Icon
In `app.js`, line ~272 (createCarIcon function):
```javascript
">🚗</div>  // Change emoji/HTML here
```

### Modify Route Colors
In `app.js`, line ~137-138:
```javascript
currentPolyline = L.polyline(coordinates, {
    color: '#0066cc', // Blue polyline
    ...
currentAntPath = L.polyline.antPath(coordinates, {
    color: '#ff6600', // Orange AntPath
```

## 🚀 Future Enhancements (Optional)

- [ ] Multiple route alternative display
- [ ] Support for more transport modes (cycling, walking, public transit)
- [ ] Waypoint support (multi-stop routes)
- [ ] Export as MP4 instead of WebM
- [ ] Speed profile visualization
- [ ] Route elevation profile graph
- [ ] Dark mode UI theme
- [ ] Batch route processing
- [ ] Share routes via URL parameters
- [ ] Integration with weather overlays

## 📄 License

This project uses open-source services:
- **Leaflet.js**: BSD 2-Clause License
- **OSRM**: Open Source (European Commission)
- **CartoDB**: Free tile layer for non-commercial use

See individual library documentation for terms.

## 📞 Support

For issues with:
- **Leaflet**: https://leafletjs.com/
- **OSRM**: https://project-osrm.org/
- **Application**: Check browser console (F12 → Console tab) for error messages

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-14  
**Status**: ✅ Production Ready
