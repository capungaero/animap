// ============================================
// Travel Route Video Generator - Main App
// ============================================

// Global variables
let map;
let startMarker, endMarker, animatedMarker;
let currentRoute = null;
let currentPolyline = null;
let currentAntPath = null;
let isAnimating = false;
let isRecording = false;
let captureInstance = null;
let animationDuration = 10000; // milliseconds
let originalAnimationDuration = 10000; // Store original for speed calculations
let animationSpeed = 1.0;
let recordedBlobs = [];
let mapStyleLayers = {};
let autoZoomActive = false;
let mapClickMode = null; // 'start' or 'end' for selecting coordinates by clicking
let selectedIcon = '🚗'; // Default icon
let mediaRecorder = null; // Global media recorder instance
let customIconUrl = null; // To store the custom uploaded icon
let iconSize = 20; // Default icon size

// ============================================
// Version Control
// ============================================
function setAppVersion() {
    // Version is based on the timestamp of the last update
    const version = 'v.20260414.2215'; // Manual update on push
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
        versionElement.textContent = `App Version: ${version}`;
    }
}

// Tile layer configurations
const TILE_LAYERS = {
    'cartodb-positron': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
        crossOrigin: 'anonymous'
    }),
    'cartodb-voyager': L.tileLayer('https://{s}.basemaps.cartocdn.com/raster_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
        crossOrigin: 'anonymous'
    }),
    'osm': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        crossOrigin: 'anonymous'
    }),
    'satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
        crossOrigin: 'anonymous'
    }),
};

// ============================================
// Initialize Map
// ============================================
function initializeMap() {
    map = L.map('map', {
        preferCanvas: true  // Ensure canvas rendering is used
    }).setView([-6.2088, 106.8456], 12);
    
    // Add default tile layer
    const defaultLayer = TILE_LAYERS['cartodb-positron'];
    defaultLayer.addTo(map);
    mapStyleLayers['current'] = defaultLayer;

    // Map click handler for setting points
    map.on('click', function(e) {
        const coords = [e.latlng.lat, e.latlng.lng].join(',');
        const startInput = document.getElementById('startPoint');
        const endInput = document.getElementById('endPoint');
        
        // If neither field is empty, ask user which to update - prefer setting start first
        if (startInput.value && endInput.value) {
            const choice = confirm(
                `Start: ${startInput.value}\nEnd: ${endInput.value}\n\nClear Start and set new? (Cancel = set End)`
            );
            if (choice) {
                startInput.value = coords;
                showStatus('Start point set! Now click map or enter end point.', 'info');
            } else {
                endInput.value = coords;
                showStatus('End point set! Click "Generate Route" to proceed.', 'info');
            }
        } else if (startInput.value) {
            // Start already set, set end
            endInput.value = coords;
            showStatus('End point set! Click "Generate Route" to proceed.', 'info');
        } else {
            // Start not set, set start
            startInput.value = coords;
            showStatus('Start point set! Now click map or enter end point.', 'info');
        }
    });

    setupEventListeners();
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
    const generateBtn = document.getElementById('generateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const startInput = document.getElementById('startPoint');
    const endInput = document.getElementById('endPoint');
    const styleSelector = document.getElementById('styleSelector');
    const iconSelector = document.getElementById('iconSelector');
    const speedSlider = document.getElementById('speedSlider');
    const animateBtn = document.getElementById('animateBtn');
    const recordBtn = document.getElementById('recordBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    generateBtn.addEventListener('click', generateRoute);
    clearBtn.addEventListener('click', clearRoute);
    startInput.addEventListener('keypress', (e) => e.key === 'Enter' && generateRoute());
    endInput.addEventListener('keypress', (e) => e.key === 'Enter' && generateRoute());
    styleSelector.addEventListener('change', changeMapStyle);
        document.getElementById('iconSelector').addEventListener('change', (e) => {
        selectedIcon = e.target.value;
        // When an emoji is selected, disable the custom icon
        customIconUrl = null; 
        document.getElementById('customIconUpload').value = ''; // Reset file input
        document.getElementById('customIconPreview').style.display = 'none';
        if (animatedMarker) {
            updateMarkerIcon();
        }
    });
    speedSlider.addEventListener('input', updateSpeed);
    animateBtn.addEventListener('click', startAnimation);
    recordBtn.addEventListener('click', handleRecordClick);
    downloadBtn.addEventListener('click', downloadVideo);

    document.getElementById('recordingAspectRatio').addEventListener('change', updateRecordingAreaOverlay);

    // Icon customization listeners
    document.getElementById('iconSizeSlider').addEventListener('input', handleIconSizeChange);
    document.getElementById('customIconUpload').addEventListener('change', handleCustomIconUpload);

    // Set initial state on load
    updateRecordingAreaOverlay();
    setAppVersion(); // Set the version on load
}

// ============================================
// Phase 1: OSRM Routing
// ============================================
async function generateRoute() {
    const startInput = document.getElementById('startPoint').value.trim();
    const endInput = document.getElementById('endPoint').value.trim();

    if (!startInput || !endInput) {
        showStatus('Please enter both start and destination coordinates', 'error');
        return;
    }

    // Parse coordinates
    const [startLat, startLon] = parseCoordinates(startInput);
    const [endLat, endLon] = parseCoordinates(endInput);

    if (!startLat || !endLat) {
        showStatus('Invalid coordinates format. Use: latitude,longitude', 'error');
        return;
    }

    showStatus('Fetching route from OSRM...', 'info');

    try {
        const coordinates = `${startLon},${startLat};${endLon},${endLat}`;
        const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?geometries=geojson&overview=full`;

        console.log('Requesting OSRM route:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('OSRM Response:', data);

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            showStatus('No route found. Try different coordinates.', 'error');
            return;
        }

        // Store route data
        currentRoute = data.routes[0];
        console.log('Route stored:', currentRoute);
        
        const routeCoordinates = currentRoute.geometry.coordinates.map(coord => [coord[1], coord[0]]);

        // Show route on map
        displayRoute(routeCoordinates, startLat, startLon, endLat, endLon);

    } catch (error) {
        console.error('Error fetching route:', error);
        showStatus('Error: ' + error.message, 'error');
    }
}

function parseCoordinates(input) {
    const parts = input.split(',').map(p => p.trim());
    if (parts.length !== 2) return [null, null];
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    return isNaN(lat) || isNaN(lon) ? [null, null] : [lat, lon];
}

// ============================================
// Phase 1: Display Route
// ============================================
function displayRoute(coordinates, startLat, startLon, endLat, endLon) {
    try {
        // Clear only visual elements, NOT the route data
        clearVisualElements();

        // Add start marker
        startMarker = L.circleMarker([startLat, startLon], {
            radius: 8,
            fillColor: '#00ff00',
            color: '#000',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
        }).addTo(map).bindPopup('Start Point');

        // Add end marker
        endMarker = L.circleMarker([endLat, endLon], {
            radius: 8,
            fillColor: '#ff0000',
            color: '#000',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
        }).addTo(map).bindPopup('End Point');

        // Display standard polyline
        currentPolyline = L.polyline(coordinates, {
            color: '#0066cc',
            weight: 3,
            opacity: 0.6,
            dashArray: '5, 5',
        }).addTo(map);

        // Phase 2: Add animated AntPath (with fallback)
        try {
            if (L.polyline.antPath) {
                currentAntPath = L.polyline.antPath(coordinates, {
                    color: '#ff6600',
                    weight: 4,
                    opacity: 0.8,
                    dashArray: [10, 5],
                    delay: 400,
                }).addTo(map);
            } else {
                // Fallback: use animated polyline with CSS dash
                currentAntPath = L.polyline(coordinates, {
                    color: '#ff6600',
                    weight: 4,
                    opacity: 0.8,
                    dashArray: '10, 5',
                    className: 'animated-polyline',
                }).addTo(map);
            }
        } catch (error) {
            console.warn('AntPath not available, using fallback:', error);
            // Fallback: use standard polyline with CSS animation
            currentAntPath = L.polyline(coordinates, {
                color: '#ff6600',
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 5',
                className: 'animated-polyline',
            }).addTo(map);
        }

        // Phase 2: Add moving marker
        const markerIcon = createCarIcon();
        animatedMarker = L.marker([startLat, startLon], {
            icon: markerIcon,
            zIndexOffset: 1000,
        }).addTo(map).bindPopup('Vehicle Position');

        // Auto-zoom to route bounds
        const bounds = L.latLngBounds(coordinates);
        map.fitBounds(bounds, { padding: [50, 50] });
        autoZoomActive = true;

        // Store animation duration based on route distance
        if (currentRoute && currentRoute.distance) {
            const distance = currentRoute.distance / 1000; // meters to km
            originalAnimationDuration = Math.max(5000, Math.min(20000, distance * 500)); // Dynamic duration
            animationDuration = originalAnimationDuration;
        } else {
            originalAnimationDuration = 10000; // Default duration
            animationDuration = 10000;
        }
        
        console.log('Animation duration set to:', animationDuration, 'ms');

        // Enable video controls - Make sure the element exists!
        const videoControls = document.getElementById('videoControls');
        console.log('videoControls element:', videoControls);
        console.log('videoControls classList before:', videoControls?.classList);
        
        if (videoControls) {
            videoControls.classList.remove('active');
            videoControls.style.display = 'none';
            
            // Force repaint
            void videoControls.offsetHeight;
            
            videoControls.classList.add('active');
            videoControls.style.display = 'block';
            console.log('videoControls classList after:', videoControls.classList);
            console.log('videoControls style.display:', videoControls.style.display);
        } else {
            console.error('Video controls element NOT FOUND!');
        }

        showStatus('Route loaded successfully! Select animation options and click "Start Animation".', 'success');
    } catch (error) {
        console.error('Error displaying route:', error);
        showStatus('Error displaying route: ' + error.message, 'error');
    }
}

// ============================================
// Phase 2: Custom Marker Icon
// ============================================
function createCarIcon() {
    return L.divIcon({
        html: `
            <div style="
                width: 40px;
                height: 40px;
                background: #ff6600;
                border: 2px solid #333;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                color: white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                transform: rotate(90deg);
            ">${selectedIcon}</div>
        `,
        className: 'custom-marker-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });
}

// ============================================
// Phase 2: Animate Marker Along Route (Smooth with RAF)
// ============================================
async function animateMarkerAlongRoute() {
    if (!currentRoute || !animatedMarker) {
        console.error('Missing currentRoute or animatedMarker');
        return;
    }

    isAnimating = true;
    const coordinates = currentRoute.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    const totalDistance = calculateTotalDistance(coordinates);
    
    console.log('Starting smooth animation with', coordinates.length, 'coordinates');
    console.log('Total route distance:', totalDistance.toFixed(2), 'km');
    console.log('Animation duration:', animationDuration, 'ms');
    console.log('Animation speed:', animationSpeed);
    
    const startTime = Date.now();

    return new Promise((resolve) => {
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const adjustedDuration = animationDuration / animationSpeed;
            const progress = Math.min(elapsed / adjustedDuration, 1);

            // Get smooth position along route using interpolation
            const position = getPositionAlongRoute(coordinates, progress);
            
            if (position) {
                // ONLY animate the marker, keep map static
                animatedMarker.setLatLng(position);

                if (Math.round(progress * 100) % 10 === 0) {
                    console.log(`Animation progress: ${Math.round(progress * 100)}%`);
                }
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                isAnimating = false;
                console.log('Animation finished!');
                resolve();
            }
        };

        requestAnimationFrame(animate);
    });
}

// Helper: Calculate total distance of route (for reference)
function calculateTotalDistance(coordinates) {
    let distance = 0;
    for (let i = 1; i < coordinates.length; i++) {
        const [lat1, lon1] = coordinates[i - 1];
        const [lat2, lon2] = coordinates[i];
        distance += getDistance(lat1, lon1, lat2, lon2);
    }
    return distance;
}

// Helper: Haversine distance calculation (in km)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Helper: Get smooth position along route using linear interpolation
function getPositionAlongRoute(coordinates, progress) {
    if (coordinates.length === 0) return null;
    if (progress <= 0) return coordinates[0];
    if (progress >= 1) return coordinates[coordinates.length - 1];

    // Find which segment of the route we're on
    const index = progress * (coordinates.length - 1);
    const segmentIndex = Math.floor(index);
    const segmentProgress = index - segmentIndex;

    if (segmentIndex >= coordinates.length - 1) {
        return coordinates[coordinates.length - 1];
    }

    const start = coordinates[segmentIndex];
    const end = coordinates[segmentIndex + 1];

    // Linear interpolation between two points
    const lat = start[0] + (end[0] - start[0]) * segmentProgress;
    const lon = start[1] + (end[1] - start[1]) * segmentProgress;

    return [lat, lon];
}

// ============================================
// Phase 2: Camera Follow Function (Smooth)
// ============================================
function cameraFollowSmooth(lat, lon, progress) {
    // Smooth camera movement with easing
    const zoomLevel = calculateDynamicZoom(progress);
    
    // Use non-animated pan for smoother visual
    map.setView([lat, lon], zoomLevel, { animate: false });
}

function cameraFollow(lat, lon, currentStep, totalSteps) {
    // Legacy function - kept for compatibility
    const progress = Math.min(currentStep / totalSteps, 1);
    cameraFollowSmooth(lat, lon, progress);
}

function calculateDynamicZoom(progress) {
    // Smooth zoom: start at 12, end at 15
    return 12 + (Math.min(progress, 1) * 3);
}

// ============================================
// Phase 2: Start Animation Only
// ============================================
async function startAnimation() {
    console.log('startAnimation called');
    console.log('currentRoute:', currentRoute);
    console.log('animatedMarker:', animatedMarker);
    console.log('isAnimating:', isAnimating);
    
    if (!currentRoute) {
        console.error('No route available');
        showStatus('Please generate a route first', 'error');
        return;
    }

    if (!animatedMarker) {
        console.error('No animated marker available');
        showStatus('Animation marker not initialized', 'error');
        return;
    }

    if (isAnimating) {
        showStatus('Animation already running', 'warning');
        return;
    }

    showStatus('Animation started... (check console for details)', 'info');
    const animateBtn = document.getElementById('animateBtn');
    animateBtn.disabled = true;
    
    try {
        await animateMarkerAlongRoute();
        animateBtn.disabled = false;
        showStatus('Animation complete!', 'success');
    } catch (error) {
        console.error('Animation error:', error);
        showStatus('Animation error: ' + error.message, 'error');
        animateBtn.disabled = false;
    }
}

// ============================================
// Phase 3: Video Recording Logic
// ============================================
function handleRecordClick() {
    if (!currentRoute) {
        showStatus('Please generate a route first', 'error');
        return;
    }
    startRecording();
}

async function startRecording() {
    if (isRecording) return; // Prevent multiple recordings

    isRecording = true;
    recordedBlobs = [];
    
    // Update UI to 'recording' state
    const recordBtn = document.getElementById('recordBtn');
    const animateBtn = document.getElementById('animateBtn');
    const exportBtn = document.getElementById('downloadBtn');
    const recordingIndicator = document.getElementById('recordingIndicator');

    recordBtn.textContent = 'Recording...';
    recordBtn.disabled = true;
    animateBtn.disabled = true;
    exportBtn.disabled = true;
    recordingIndicator.classList.add('active');
    
    showStatus('Recording akan dimulai...', 'info');
    console.log('Recording sequence initiated');

    try {
        await recordAnimation();
        // On success, show the download dialog
        showDownloadDialog();
    } catch (error) {
        console.error('Recording error:', error);
        showStatus('Recording error: ' + error.message, 'error');
        // If an error occurs, reset the UI immediately
        resetUIAfterRecording();
    }
}

async function recordAnimation() {
    console.log('Starting recording sequence...');
    await sleep(1000); // Initial delay
    showStatus('Recording starting...', 'info');

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        throw new Error('Map container #map not found');
    }

    // Get recording options from UI
    const quality = parseInt(document.getElementById('recordingQuality').value, 10);
    const fps = parseInt(document.getElementById('recordingFps').value, 10);
    const aspectRatio = document.getElementById('recordingAspectRatio').value;
    console.log(`Recording options: Quality=${quality / 1000000}Mbps, FPS=${fps}, Aspect Ratio=${aspectRatio}`);

    // Determine recording canvas dimensions based on aspect ratio
    let recWidth = mapContainer.offsetWidth;
    let recHeight = mapContainer.offsetHeight;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = recWidth;
    let sourceHeight = recHeight;

    if (aspectRatio === '16:9') {
        recHeight = Math.round(recWidth / (16 / 9));
        // Capture from the vertical center of the map
        sourceY = (sourceHeight - recHeight) / 2;
        sourceHeight = recHeight;
    } else if (aspectRatio === '1:1') {
        if (recWidth > recHeight) { // Landscape window
            recWidth = recHeight;
            // Capture from the horizontal center
            sourceX = (sourceWidth - recWidth) / 2;
            sourceWidth = recWidth;
        } else { // Portrait window
            recHeight = recWidth;
            // Capture from the vertical center
            sourceY = (sourceHeight - recHeight) / 2;
            sourceHeight = recHeight;
        }
    }

    // Create a canvas to draw the captured frames onto
    const recordCanvas = document.createElement('canvas');
    recordCanvas.width = recWidth;
    recordCanvas.height = recHeight;
    const recordCtx = recordCanvas.getContext('2d');
    console.log(`Recording canvas created: ${recordCanvas.width}x${recordCanvas.height}`);

    // Set up the video stream and recorder
    const stream = recordCanvas.captureStream(fps);
    recordedBlobs = [];
    mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm',
        videoBitsPerSecond: quality,
    });

    let frameCount = 0;
    let chunkCount = 0;
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedBlobs.push(event.data);
            chunkCount++;
        }
    };
    mediaRecorder.onstop = () => console.log(`Recording stopped. Total chunks: ${chunkCount}`);
    mediaRecorder.onerror = (event) => console.error('MediaRecorder error:', event.error);

    // Start the recorder
    mediaRecorder.start();
    console.log('MediaRecorder started');

    // --- Frame Capture Loop using html2canvas ---
    let isCapturing = true;
    const frameInterval = 1000 / fps;

    const captureFrameLoop = async () => {
        if (!isCapturing) return;

        const startTime = performance.now();
        try {
            // Capture the entire #map div
            const canvas = await html2canvas(mapContainer, {
                useCORS: true,
                allowTaint: true, // Allow cross-origin images to be drawn
                backgroundColor: '#f0f0f0', // Set a fallback background color
                logging: false,
                scale: 1, // Capture at native resolution
            });
            // Draw the captured image onto our recording canvas, applying the crop for aspect ratio
            recordCtx.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, recWidth, recHeight);
            frameCount++;

        } catch (error) {
            console.warn('Frame capture failed:', error);
            // Stop capturing on error to prevent a loop of failures
            isCapturing = false;
        }

        const duration = performance.now() - startTime;
        // Adjust timeout to maintain FPS, but don't go below 0
        const timeout = Math.max(0, frameInterval - duration);
        setTimeout(captureFrameLoop, timeout);
    };

    // Start the capture loop and the animation simultaneously
    captureFrameLoop();
    showStatus('🎥 Recording...', 'info');
    console.log('Animation starting...');
    await animateMarkerAlongRoute();
    console.log('Animation finished.');

    // Wait for a couple of seconds to capture the end state
    showStatus('Finalizing video...', 'info');
    await sleep(2000);

    // Stop capturing frames and then stop the recorder
    isCapturing = false;
    await sleep(500); // Allow final frames to process
    mediaRecorder.stop();
    await sleep(500); // Allow onstop to fire

    console.log(`Recording finished. Captured ${frameCount} frames.`);
    showStatus('Recording complete!', 'success');

    if (recordedBlobs.length === 0) {
        throw new Error('No video data was captured. This may be a browser or security issue.');
    }
}

// Helper sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function resetUIAfterRecording() {
    const recordBtn = document.getElementById('recordBtn');
    const animateBtn = document.getElementById('animateBtn');
    const exportBtn = document.getElementById('downloadBtn');
    const recordingIndicator = document.getElementById('recordingIndicator');

    isRecording = false;
    recordBtn.textContent = 'Rekam Animasi';
    recordBtn.disabled = false;
    animateBtn.disabled = false;
    exportBtn.disabled = true; // Disable until a new recording is made
    recordingIndicator.classList.remove('active');
    document.getElementById('statusMessage').style.display = 'none';
    console.log("UI has been reset to idle state.");
}

function showDownloadDialog() {
    if (recordedBlobs.length === 0) {
        alert('❌ Maaf, tidak ada data video yang terekam.');
        resetUIAfterRecording(); // Reset UI if recording fails
        return;
    }
    
    document.getElementById('downloadBtn').disabled = false; // Enable download button

    const blob = new Blob(recordedBlobs, { type: 'video/webm' });
    const fileSize = (blob.size / 1024 / 1024).toFixed(2);

    const confirmation = confirm(
        `🎉 Rekaman selesai!\n\nUkuran File: ${fileSize} MB\n\nKlik "OK" untuk mengunduh video.`
    );

    if (confirmation) {
        downloadVideo();
    } else {
        // If user clicks "Cancel", reset the UI but keep the video available for download
        const recordBtn = document.getElementById('recordBtn');
        const animateBtn = document.getElementById('animateBtn');
        const recordingIndicator = document.getElementById('recordingIndicator');

        isRecording = false;
        recordBtn.textContent = 'Rekam Animasi';
        recordBtn.disabled = false;
        animateBtn.disabled = false;
        recordingIndicator.classList.remove('active');
    }
}

function downloadVideo() {
    if (recordedBlobs.length === 0) {
        alert('Tidak ada video untuk diunduh.');
        return;
    }
    const blob = new Blob(recordedBlobs, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `route-animation-${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        // Fully reset UI after download
        resetUIAfterRecording();
    }, 100);
}

// ============================================
// Phase 4: Map Style Selector
// ============================================
function changeMapStyle(e) {
    const styleKey = e.target.value;
    
    if (mapStyleLayers[styleKey]) {
        map.removeLayer(mapStyleLayers['current']);
    }

    const newLayer = TILE_LAYERS[styleKey];
    newLayer.addTo(map);
    mapStyleLayers['current'] = newLayer;
}

// ============================================
// Phase 4: Animation Speed Slider
// ============================================
function updateSpeed(e) {
    animationSpeed = parseFloat(e.target.value);
    document.getElementById('speedValue').textContent = animationSpeed.toFixed(2) + 'x';
    
    // Calculate duration based on speed (faster speed = shorter duration)
    animationDuration = originalAnimationDuration / animationSpeed;
    
    console.log('Animation speed:', animationSpeed, 'Duration:', animationDuration);
}

// ============================================
// Utility Functions
// ============================================
function clearVisualElements() {
    // Clear only visual elements, keep route data
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    if (animatedMarker) map.removeLayer(animatedMarker);
    if (currentPolyline) map.removeLayer(currentPolyline);
    if (currentAntPath) map.removeLayer(currentAntPath);

    startMarker = null;
    endMarker = null;
    animatedMarker = null;
    currentPolyline = null;
    currentAntPath = null;
}

function clearRoute() {
    // Clear all including route data
    clearVisualElements();
    
    currentRoute = null;
    recordedBlobs = [];
    animationDuration = 10000;
    originalAnimationDuration = 10000;
    animationSpeed = 1.0;
    isAnimating = false;
    isRecording = false;

    document.getElementById('videoControls').classList.remove('active');
    document.getElementById('downloadBtn').disabled = true;
    
    console.log('Route cleared completely');
}

function showStatus(message, type = 'info') {
    const status = document.getElementById('statusMessage');
    status.textContent = message;
    status.className = `status-message ${type}`;
    
    if (type !== 'info') {
        setTimeout(() => {
            status.className = 'status-message';
        }, 5000);
    }
}

// ============================================
// Initialize on Page Load
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    setupEventListeners();
});

function updateRecordingAreaOverlay() {
    const overlay = document.getElementById('recording-area-overlay');
    const mapContainer = document.getElementById('map');
    const aspectRatio = document.getElementById('recordingAspectRatio').value;

    if (!overlay || !mapContainer) return;

    if (aspectRatio === 'auto') {
        overlay.style.display = 'none';
        return;
    }

    let mapWidth = mapContainer.offsetWidth;
    let mapHeight = mapContainer.offsetHeight;
    
    let boxWidth, boxHeight, boxTop, boxLeft;

    if (aspectRatio === '16:9') {
        boxWidth = mapWidth;
        boxHeight = Math.round(mapWidth / (16 / 9));
        if (boxHeight > mapHeight) {
            boxHeight = mapHeight;
            boxWidth = Math.round(mapHeight * (16 / 9));
        }
    } else if (aspectRatio === '1:1') {
        if (mapWidth > mapHeight) {
            boxHeight = mapHeight;
            boxWidth = mapHeight;
        } else {
            boxWidth = mapWidth;
            boxHeight = mapWidth;
        }
    }

    boxTop = (mapHeight - boxHeight) / 2;
    boxLeft = (mapWidth - boxWidth) / 2;

    overlay.style.width = `${boxWidth}px`;
    overlay.style.height = `${boxHeight}px`;
    overlay.style.top = `${boxTop}px`;
    overlay.style.left = `${boxLeft}px`;
    overlay.style.display = 'block';
}
