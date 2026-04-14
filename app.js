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

// Tile layer configurations
const TILE_LAYERS = {
    'cartodb-positron': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
    }),
    'cartodb-voyager': L.tileLayer('https://{s}.basemaps.cartocdn.com/raster_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
    }),
    'osm': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
    }),
    'satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
    }),
};

// ============================================
// Initialize Map
// ============================================
function initializeMap() {
    map = L.map('map').setView([-6.2088, 106.8456], 12);
    
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
    iconSelector.addEventListener('change', (e) => {
        selectedIcon = e.target.value;
        showStatus(`Icon changed to ${selectedIcon}`, 'info');
    });
    speedSlider.addEventListener('input', updateSpeed);
    animateBtn.addEventListener('click', startAnimation);
    recordBtn.addEventListener('click', handleRecordClick);
    downloadBtn.addEventListener('click', downloadVideo);
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
        clearRoute();

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
// Phase 2: Animate Marker Along Route
// ============================================
async function animateMarkerAlongRoute() {
    if (!currentRoute || !animatedMarker) {
        console.error('Missing currentRoute or animatedMarker');
        return;
    }

    isAnimating = true;
    const coordinates = currentRoute.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    const stepCount = coordinates.length;
    
    console.log('Starting animation with', stepCount, 'coordinates');
    console.log('Animation duration:', animationDuration, 'ms');
    console.log('Animation speed:', animationSpeed);
    
    const stepDuration = animationDuration / stepCount;
    console.log('Step duration:', stepDuration, 'ms');
    
    let currentStep = 0;

    return new Promise((resolve) => {
        const animationInterval = setInterval(() => {
            if (currentStep < stepCount) {
                const [lat, lon] = coordinates[currentStep];
                animatedMarker.setLatLng([lat, lon]);

                // Phase 2: Camera follow with flyTo
                cameraFollow(lat, lon, currentStep, stepCount);

                if (currentStep % Math.ceil(stepCount / 10) === 0) {
                    console.log(`Animation progress: ${currentStep}/${stepCount} (${Math.round(currentStep/stepCount*100)}%)`);
                }

                currentStep++;
            } else {
                clearInterval(animationInterval);
                isAnimating = false;
                console.log('Animation finished!');
                resolve();
            }
        }, stepDuration / animationSpeed);
    });
}

// ============================================
// Phase 2: Camera Follow Function
// ============================================
function cameraFollow(lat, lon, currentStep, totalSteps) {
    // Smooth camera movement
    const zoomLevel = calculateDynamicZoom(currentStep, totalSteps);
    
    // Use no animation for faster updates, only every 5th step
    if (currentStep % 5 === 0) {
        map.setView([lat, lon], zoomLevel, { animate: false });
    }
}

function calculateDynamicZoom(step, total) {
    // Start zoomed out, gradually zoom in
    const progress = Math.min(step / total, 1);
    return 12 + (progress * 3); // Zoom from 12 to 15
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
// Phase 3: Video Recording with CCapture
// ============================================
async function handleRecordClick() {
    if (!currentRoute) {
        showStatus('Please generate a route first', 'error');
        return;
    }

    if (isRecording) {
        stopRecording();
        return;
    }

    startRecording();
}

async function startRecording() {
    isRecording = true;
    recordedBlobs = [];
    
    const recordBtn = document.getElementById('recordBtn');
    const animateBtn = document.getElementById('animateBtn');
    const recordingIndicator = document.getElementById('recordingIndicator');
    recordBtn.textContent = 'Stop Recording';
    recordBtn.disabled = false;
    animateBtn.disabled = true;
    recordingIndicator.classList.add('active');

    showStatus('Recording animation... Press "Stop Recording" to finish.', 'info');

    // Try to capture using Leaflet's canvas element
    const leafletCanvas = document.querySelector('.leaflet-canvas-container canvas');
    
    if (leafletCanvas && leafletCanvas.captureStream) {
        // Premium path: Use canvas.captureStream if available
        recordUsingCanvasStream(leafletCanvas);
    } else {
        // Fallback: Frame-by-frame capture
        await recordUsingFrameCapture();
    }
}

function recordUsingCanvasStream(canvas) {
    try {
        const stream = canvas.captureStream(30); // 30 FPS
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 5000000, // 5 Mbps
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedBlobs.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            console.log('Recording stopped via stream');
            stopRecording();
        };

        mediaRecorder.start();

        // Start animation and stop recording when complete
        animateMarkerAlongRoute().then(() => {
            mediaRecorder.stop();
        });
    } catch (error) {
        console.error('Canvas stream capture failed:', error);
        showStatus('Canvas capture unavailable. Try a different browser.', 'error');
        isRecording = false;
        const recordBtn = document.getElementById('recordBtn');
        const animateBtn = document.getElementById('animateBtn');
        recordBtn.textContent = 'Record Animation';
        recordBtn.disabled = false;
        animateBtn.disabled = false;
    }
}

async function recordUsingFrameCapture() {
    // Fallback: Capture frames manually (slower but more compatible)
    if (!currentRoute) return;

    const coordinates = currentRoute.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    const stepCount = coordinates.length;
    const stepDuration = animationDuration / stepCount;
    let currentStep = 0;
    let frameCount = 0;
    const fps = 30;
    const frameDuration = 1000 / fps;
    let lastFrameTime = Date.now();

    const canvas = document.querySelector('.leaflet-canvas-container canvas') || 
                   document.querySelector('canvas');

    if (!canvas) {
        showStatus('Cannot access map canvas for recording', 'error');
        isRecording = false;
        return;
    }

    // Create hidden MediaRecorder-compatible format
    try {
        const stream = canvas.captureStream(fps);
        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedBlobs.push(event.data);
            }
        };

        mediaRecorder.start();

        isAnimating = true;

        const captureLoop = setInterval(() => {
            if (!isRecording) {
                clearInterval(captureLoop);
                mediaRecorder.stop();
                return;
            }

            const now = Date.now();
            if (now - lastFrameTime >= frameDuration - 5) {
                // Frame ready to capture
                if (currentStep < stepCount) {
                    const [lat, lon] = coordinates[currentStep];
                    animatedMarker.setLatLng([lat, lon]);
                    cameraFollow(lat, lon, currentStep, stepCount);
                    currentStep++;
                    frameCount++;
                    lastFrameTime = now;

                    // Update progress
                    const progress = Math.round((frameCount / (stepCount * 2)) * 100);
                    const statusMsg = document.getElementById('statusMessage');
                    if (statusMsg) {
                        statusMsg.textContent = `Recording in progress... [${Math.min(progress, 99)}%]`;
                    }
                } else {
                    clearInterval(captureLoop);
                    mediaRecorder.stop();
                }
            }
        }, 5);

    } catch (error) {
        console.error('Frame capture failed:', error);
        showStatus('Recording failed. Try a different browser.', 'error');
        isRecording = false;
    }
}

function stopRecording() {
    isRecording = false;
    isAnimating = false;
    
    const recordBtn = document.getElementById('recordBtn');
    const animateBtn = document.getElementById('animateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const recordingIndicator = document.getElementById('recordingIndicator');
    
    recordBtn.textContent = 'Record Animation';
    recordBtn.disabled = false;
    animateBtn.disabled = false;
    recordingIndicator.classList.remove('active');
    downloadBtn.disabled = recordedBlobs.length === 0;

    showStatus('Recording complete! Click "Export Video" to download.', 'success');
}

// ============================================
// Phase 3: Download Video
// ============================================
function downloadVideo() {
    if (recordedBlobs.length === 0) {
        showStatus('No recorded video to download', 'error');
        return;
    }

    const blob = new Blob(recordedBlobs, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-${new Date().toISOString().split('T')[0]}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('Video downloaded successfully!', 'success');
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
function clearRoute() {
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    if (animatedMarker) map.removeLayer(animatedMarker);
    if (currentPolyline) map.removeLayer(currentPolyline);
    if (currentAntPath) map.removeLayer(currentAntPath);

    currentRoute = null;
    currentPolyline = null;
    currentAntPath = null;
    recordedBlobs = [];

    document.getElementById('videoControls').classList.remove('active');
    document.getElementById('downloadBtn').disabled = true;
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
document.addEventListener('DOMContentLoaded', initializeMap);
