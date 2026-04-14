# ✅ Testing Checklist & Verification Guide

## Phase 1: Setup & Routing ✅

### Test 1.1: Basic HTML Structure
- [ ] Page loads without console errors
- [ ] Fullscreen map visible (100% viewport height)
- [ ] Control panel visible in top-left corner
- [ ] All input fields and buttons are clickable

**Test Command**: Open `index.html` in browser, press F12 (DevTools) → Console tab should have no red errors

---

### Test 1.2: Input Controls
- [ ] "Titik Awal" input accepts text
- [ ] "Titik Tujuan" input accepts text
- [ ] "Generate Route" button is clickable
- [ ] "Clear" button is clickable
- [ ] Pressing Enter in input fields triggers route generation

**Test Data:**
```
Start: -6.2088,106.8456
End: -6.1751,106.8291
Expected: Route loads with green → red markers
```

---

### Test 1.3: OSRM API Integration
- [ ] Clicking "Generate Route" shows status message: "Fetching route from OSRM..."
- [ ] After 1-3 seconds: Success message appears
- [ ] Network request shows in DevTools (F12 → Network tab)
- [ ] Route coordinates are valid (latitude between -90 to 90, longitude -180 to 180)

**Verification:**
```javascript
// In browser console:
fetch('https://router.project-osrm.org/route/v1/driving/106.8456,-6.2088;106.8291,-6.1751?geometries=geojson').then(r=>r.json()).then(d=>console.log(d))
```

Expected: Object with `routes[0].geometry.coordinates` array

---

### Test 1.4: Route Display (Polyline)
- [ ] Blue dashed polyline appears after route loads
- [ ] Orange animated line (AntPath) overlays the blue line
- [ ] Green circular marker at start point
- [ ] Red circular marker at end point
- [ ] Markers have popup labels ("Start Point", "End Point")

**Visual Verification:**
```
✓ Two different colored lines on map
✓ Green marker (left side) = Start
✓ Red marker (right side) = End
```

---

## Phase 2: Animation & Visuals ✅

### Test 2.1: Leaflet.AntPath Integration
- [ ] Orange line shows animated dashes when route loads
- [ ] Dashes move smoothly from start to end
- [ ] Animation loops / continues until stopped
- [ ] Visible at all zoom levels

**Check:** Zoom in/out while looking at the animated line (F12 → DevTools doesn't interfere)

---

### Test 2.2: Moving Marker (Vehicle)
- [ ] Car emoji (🚗) marker appears at start point
- [ ] Marker has orange background with border
- [ ] Marker moves smoothly along route coordinates
- [ ] Marker orientation points forward (90° rotation)

**Visual:** Watch marker move for 5+ seconds after "Record Video" starts

---

### Test 2.3: Camera Following
- [ ] Map view follows the moving marker
- [ ] Camera uses smooth animation (not jerky)
- [ ] Zoom level increases as animation progresses
- [ ] Final zoom shows destination area up close
- [ ] Pan and zoom are synchronized with marker movement

**Verification Steps:**
1. Generate route
2. Click "Record Video"
3. Observe map center and zoom changing
4. Expected: Map centers on car, zooms in gradually

---

### Test 2.4: Animation Duration
- [ ] Short routes (< 5 km) animate for ~5-10 seconds
- [ ] Medium routes (5-15 km) animate for ~10-20 seconds
- [ ] Long routes (> 15 km) animate for up to 20 seconds
- [ ] Animation duration based on route distance

**Check:** Time animation from start to finish, compare with route distance

---

## Phase 3: Video Recording (The Hard Part) ✅

### Test 3.1: Video Recording Start/Stop
- [ ] "Record Video" button changes text to "Stop Recording" when clicked
- [ ] Red recording indicator appears with ● and "Recording..."
- [ ] Indicator pulses (animated opacity effect)
- [ ] Animation starts immediately when recording starts
- [ ] "Stop Recording" button stops the recording

**Test Steps:**
1. Generate route
2. Click "Record Video"
3. Red indicator appears
4. Wait 5 seconds
5. Click "Stop Recording"
6. Indicator disappears, button text resets

---

### Test 3.2: Frame Capture (30 FPS)
- [ ] Canvas frames capture at 30 FPS
- [ ] No visual glitches or tearing during playback
- [ ] All map elements render correctly in video
- [ ] Route, marker, and map background all visible

**Check:**
```javascript
// In console while recording:
console.log('Expected frames for 15s: ', 15 * 30, ' = 450 frames')
```

---

### Test 3.3: Animation ↔ Recording Sync
- [ ] Recording starts when animation starts
- [ ] Recording duration matches animation duration
- [ ] When animation finishes, recording automatically stops
- [ ] No extra blank frames at end of video
- [ ] Map movements captured smoothly

**Verification:**
1. Record a route (note time)
2. Downloaded video duration should match animation duration
3. Video ends exactly when marker reaches destination

---

### Test 3.4: Video File Generation
- [ ] Status message: "Recording complete! Click 'Download Video' to save."
- [ ] "Download Video" button becomes enabled
- [ ] Recorded blobs are collected in `recordedBlobs` array
- [ ] Blob MIME type is "video/webm"

**Check:**
```javascript
// In browser console:
recordedBlobs.length  // Should be > 0
console.log(recordedBlobs[0].type)  // Should be "video/webm"
```

---

## Phase 4: UI/UX Refinement ✅

### Test 4.1: Map Style Selector
- [ ] Dropdown has 4 options:
  - [ ] CartoDB Positron (light, clean)
  - [ ] CartoDB Voyager (detailed)
  - [ ] OpenStreetMap (standard)
  - [ ] Satellite (aerial)
- [ ] Selecting different style changes map appearance instantly
- [ ] Route lines and markers remain visible after style change
- [ ] Each style has distinct visual characteristics

**Test:**
1. Generate route
2. Select each style option one by one
3. Verify map appearance changes 4 times

---

### Test 4.2: Animation Speed Slider
- [ ] Slider range: 0.5x to 3.0x
- [ ] Default value: 1.0x
- [ ] Current speed displays in label (e.g., "1.25x")
- [ ] Adjusting slider changes displayed value in real-time
- [ ] Speed affects how fast animation plays (higher = faster animation, shorter video)

**Test:**
```
Slider Position → Displayed Speed
Min (left)      → 0.5x
Middle          → 1.5x - 1.75x
Max (right)     → 3.0x

Speed Effect:
0.5x → 20-40 second animation
1.0x → 10-20 second animation (default)
2.0x → 5-10 second animation
3.0x → 3-7 second animation
```

---

### Test 4.3: Auto-Zoom Feature
- [ ] When route is generated, map automatically zooms to show entire route
- [ ] All route coordinates fit within map viewport
- [ ] Padding around route boundaries visible
- [ ] Initial zoom before animation shows full route context
- [ ] Zoom level resets when new route is generated

**Verification:**
1. Generate new route
2. Entire polyline should be visible without panning
3. Green and red markers visible
4. Some white space around the route edges

---

### Test 4.4: Status Messages
- [ ] "Fetching route from OSRM..." appears during API call (info style - blue)
- [ ] "Route loaded successfully!..." appears on success (success style - green)
- [ ] Error messages appear in error style (red background) for invalid input
- [ ] Messages auto-hide after 5 seconds (except info messages)
- [ ] Messages positioned at bottom of control panel
- [ ] Message text is readable and relevant

**Test Cases:**
```
Valid input               → Green success message
Invalid coordinates      → Red error message
Network error           → Red error message
Recording started       → Blue info message (stays)
Recording complete      → Green success message
```

---

## Integration Tests ✅

### Test 5.1: Complete Workflow
- [ ] **Step 1**: Open page - map loads ✓
- [ ] **Step 2**: Enter coordinates - input accepts text ✓
- [ ] **Step 3**: Generate route - polyline + markers appear ✓
- [ ] **Step 4**: Change map style - visualization updates ✓
- [ ] **Step 5**: Adjust speed slider - value updates ✓
- [ ] **Step 6**: Record video - animation & recording start ✓
- [ ] **Step 7**: Wait for completion - recording stops automatically ✓
- [ ] **Step 8**: Download video - file appears in downloads folder ✓

**Expected Time**: ~3-5 minutes per complete cycle

---

### Test 5.2: Multiple Routes
- [ ] Generate first route, record video, download
- [ ] Click "Clear" to reset
- [ ] Generate different route (different coordinates)
- [ ] Record second video and download
- [ ] Both video files saved successfully

**Verification:**
```bash
ls -la ~/Downloads/*.webm
# Should show 2+ files with different timestamps
```

---

### Test 5.3: Quick Recording Stop
- [ ] Start recording
- [ ] Wait 2-3 seconds (animation mid-way)
- [ ] Click "Stop Recording"
- [ ] Recording stops, partial video saved
- [ ] Download button works with partial video
- [ ] Downloaded video plays (but shorter duration)

---

### Test 5.4: Browser Refresh Persistence
- [ ] Generate route
- [ ] Refresh page (F5)
- [ ] Data clears (expected behavior)
- [ ] Control panel still functional
- [ ] Can generate new route immediately

---

## Edge Case Tests ✅

### Test 6.1: Invalid Coordinates
**Input**: `999, 999`  
**Expected**: Error message "Invalid coordinates"

**Input**: ` -6.2088` (single value)  
**Expected**: Error message or format error

---

### Test 6.2: Same Start & End Points
**Input**: Start = `-6.2088,106.8456` | End = `-6.2088,106.8456`  
**Expected**: Either "No route found" or very short animation

---

### Test 6.3: Very Long Route
**Input**: Start = `-6.2088,106.8456` | End = `-7.0,106.0` (50+ km)  
**Expected**: Route loads but animation may take long (20+ seconds)

---

### Test 6.4: Extreme Speed Values
**Speed**: 0.5x  
**Expected**: Very slow animation (20+ seconds)

**Speed**: 3.0x  
**Expected**: Very fast animation (3-5 seconds)

---

### Test 6.5: Recording with Speed 3.0x
- [ ] Animation completes in ~5 seconds
- [ ] Recording captures full animation
- [ ] Video file is still valid and playable
- [ ] Video size is smaller due to shorter duration

---

## Performance Tests ✅

### Test 7.1: Rendering Performance
- [ ] No lag when moving camera
- [ ] No stutter during animation playback
- [ ] Map remains responsive during recording
- [ ] Browser CPU usage reasonable (< 80%)

**Check:** DevTools → Performance tab monitors CPU usage

---

### Test 7.2: Memory Usage
- [ ] Application doesn't leak memory over time
- [ ] Multiple recordings don't cause crashes
- [ ] Browser memory stable after download

**Check:**
```javascript
// In console:
performance.memory.usedJSHeapSize / 1048576  // MB
```

---

### Test 7.3: Long Recording
- [ ] Record a route that takes 20+ seconds
- [ ] Monitor file size (should be ~5-15 MB per minute)
- [ ] Video plays without buffering
- [ ] Download completes without interruption

---

## Final Verification Checklist

### All Phases Complete?
- [ ] Phase 1: Routing ✅
  - [ ] HTML fullscreen map
  - [ ] Input controls
  - [ ] OSRM API integration
  - [ ] Polyline display

- [ ] Phase 2: Animation ✅
  - [ ] AntPath animation
  - [ ] Moving marker
  - [ ] Camera follow
  - [ ] Dynamic zoom

- [ ] Phase 3: Video Recording ✅
  - [ ] CCapture/MediaRecorder
  - [ ] Frame capture (30 FPS)
  - [ ] Animation sync
  - [ ] Video download

- [ ] Phase 4: UI/UX ✅
  - [ ] Map style selector
  - [ ] Speed slider
  - [ ] Auto-zoom
  - [ ] Status messages

### Quality Standards
- [ ] No JavaScript errors in console
- [ ] All buttons respond to clicks
- [ ] All inputs accept user data
- [ ] Video files play in standard players
- [ ] UI is intuitive and responsive
- [ ] Performance is acceptable on target devices

---

## Deployment Checklist

Before going live:
- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test on mobile (optional)
- [ ] Check CORS settings (OSRM API works globally)
- [ ] Verify all CDN links are current
- [ ] Test with multiple long routes
- [ ] Verify video download folder (user's ~/Downloads)
- [ ] Check for sensitive data in logs
- [ ] Create simple user instructions
- [ ] Share with beta testers

---

## Browser Compatibility Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Leaflet Map | ✅ | ✅ | ✅ | ✅ |
| OSRM API | ✅ | ✅ | ✅ | ✅ |
| Canvas Capture | ✅ | ✅ | ⚠️ | ✅ |
| WebM Video | ✅ | ✅ | ❌ | ✅ |
| MediaRecorder | ✅ | ✅ | ✅ | ✅ |
| Full Feature | ✅ | ✅ | ⚠️ | ✅ |

Legend: ✅ Full Support | ⚠️ Partial | ❌ Not Supported

---

**Last Updated**: 2026-04-14  
**Next Review**: After first user feedback
