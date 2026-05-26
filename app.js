const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const ctx = canvasElement.getContext('2d');
const statusText = document.getElementById('status');
const loadingScreen = document.getElementById('loading');

const colorPicker = document.getElementById('colorPicker');
const brushSizeSlider = document.getElementById('brushSize');

let lastX = null;
let lastY = null;

let brushColor = colorPicker.value;
let brushSize = brushSizeSlider.value;

colorPicker.addEventListener('input', (e) => brushColor = e.target.value);
brushSizeSlider.addEventListener('input', (e) => brushSize = e.target.value);

// Helper function to calculate distance between hand landmarks
function getDistance(pt1, pt2) {
    return Math.sqrt(Math.pow(pt1.x - pt2.x, 2) + Math.pow(pt1.y - pt2.y, 2));
}

function onResults(results) {
    if (loadingScreen.style.opacity !== '0') {
        loadingScreen.style.opacity = '0';
        setTimeout(() => loadingScreen.style.display = 'none', 500);
    }

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        statusText.innerText = "No Hand Detected";
        statusText.style.color = "#aaa";
        lastX = null;
        lastY = null;
        return;
    }

    const landmarks = results.multiHandLandmarks[0];

    // Landmark tracking references
    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Mirror dynamic pixel positioning
    const cx = indexTip.x * canvasElement.width;
    const cy = indexTip.y * canvasElement.height;

    // Gesture logic metrics
    const dIndex = getDistance(indexTip, wrist);
    const dMiddle = getDistance(middleTip, wrist);
    const dRing = getDistance(ringTip, wrist);
    const dPinky = getDistance(pinkyTip, wrist);

    const handScale = getDistance(indexPip, wrist); 
    const openThreshold = handScale * 1.2; 

    let isIndexOpen = dIndex > openThreshold;
    let isMiddleOpen = dMiddle > openThreshold;
    let isRingOpen = dRing > openThreshold;
    let isPinkyOpen = dPinky > openThreshold;

    // Gesture State Machine Switches
    if (isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen) {
        // Gesture 1: Open Palm -> Erase
        statusText.innerText = "Eraser";
        statusText.style.color = "#ff4757";
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(cx, cy, 40, 0, Math.PI * 2);
        ctx.fill();
        
        lastX = null; 
        lastY = null;
    } 
    else if (!isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
        // Gesture 2: Closed Fist -> Pause
        statusText.innerText = "Paused";
        statusText.style.color = "#eccc68";
        lastX = null; 
        lastY = null;
    } 
    else if (isIndexOpen && !isMiddleOpen) {
        // Gesture 3: One Finger -> Neon Paint
        statusText.innerText = "Drawing";
        statusText.style.color = "#2ed573";
        
        ctx.globalCompositeOperation = 'source-over';

        if (lastX !== null && lastY !== null) {
            ctx.beginPath();
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Glow engine layers
            ctx.shadowColor = brushColor;
            ctx.shadowBlur = 15;

            ctx.moveTo(lastX, lastY);
            ctx.lineTo(cx, cy);
            ctx.stroke();
        }
        
        lastX = cx;
        lastY = cy;
    } else {
        lastX = null;
        lastY = null;
    }
}

// MediaPipe Setup
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 800,
    height: 600
});

camera.start();
