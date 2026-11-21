import {
  FilesetResolver,
  FaceLandmarker,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const $ = id => document.getElementById(id);

const video = $("video");
const canvas = $("overlay");
const ctx = canvas.getContext("2d");

let faceAI = null;
let stream = null;
let running = false;
let lastVideoTime = -1;
let frameCount = 0;

// ==============================
// TERMINAL
// ==============================
function log(message) {
  const terminal = $("terminal");
  const p = document.createElement("p");
  p.textContent = "> " + message;
  terminal.appendChild(p);

  while (terminal.children.length > 6) {
    terminal.removeChild(terminal.firstChild);
  }
}

// ==============================
// LOAD AI MODEL
// ==============================
async function loadAI() {
  if (faceAI) return;

  log("INITIALIZING AI ENGINE");

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  faceAI = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false
  });

  log("FACE TRACKING ENGINE READY");
}

// ==============================
// START CAMERA
// ==============================
$("start").addEventListener("click", startScanner);

async function startScanner() {
  if (running) return;

  try {
    $("message").textContent = "جاري تحميل نظام الذكاء الاصطناعي...";
    $("engineState").textContent = "LOADING";

    await loadAI();

    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    video.srcObject = stream;
    await video.play();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    running = true;

    $("placeholder").style.display = "none";
    $("scanLine").classList.add("active");

    $("cameraState").textContent = "ONLINE";
    $("cameraMetric").textContent = "ONLINE";
    $("engineState").textContent = "ACTIVE";
    $("resolution").textContent =
      video.videoWidth + " X " + video.videoHeight;

    $("message").textContent = "النظام يعمل. انظر أمام الكاميرا.";
    log("CAMERA CONNECTION ESTABLISHED");

    requestAnimationFrame(scanFrame);

  } catch (error) {
    console.error(error);

    $("engineState").textContent = "ERROR";
    $("message").textContent = "تعذر تشغيل النظام: " + error.message;

    log("ERROR: " + error.message);
  }
}

// ==============================
// STOP CAMERA
// ==============================
$("stop").addEventListener("click", stopScanner);

function stopScanner() {
  running = false;

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  video.srcObject = null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  $("placeholder").style.display = "flex";
  $("scanLine").classList.remove("active");

  $("cameraState").textContent = "OFFLINE";
  $("cameraMetric").textContent = "OFFLINE";
  $("trackingState").textContent = "IDLE";
  $("detectionState").textContent = "WAITING";
  $("engineState").textContent = "STANDBY";
  $("faceCount").textContent = "00";
  $("landmarkCount").textContent = "0";
  $("progressBar").style.width = "0%";
  $("resolution").textContent = "NO SIGNAL";

  $("message").textContent = "تم إيقاف الكاميرا.";

  log("CAMERA DISCONNECTED");
}

// ==============================
// FACE SCANNER
// ==============================
function scanFrame() {
  if (!running) return;

  if (
    video.readyState >= 2 &&
    video.currentTime !== lastVideoTime
  ) {
    lastVideoTime = video.currentTime;

    const result = faceAI.detectForVideo(
      video,
      performance.now()
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const faces = result.faceLandmarks || [];

    if (faces.length > 0) {
      const points = faces[0];

      $("faceCount").textContent = "01";
      $("detectionState").textContent = "DETECTED";
      $("trackingState").textContent = "ACTIVE";
      $("message").textContent =
        "تم اكتشاف وجه وتتبع نقاطه البصرية بنجاح.";

      $("landmarkCount").textContent = points.length;
      $("progressBar").style.width = "100%";

      // رسم حدود الوجه
      const drawing = new DrawingUtils(ctx);

      drawing.drawConnectors(
        points,
        FaceLandmarker.FACE_LANDMARKS_CONTOURS,
        {
          color: "#00eaff",
          lineWidth: 2
        }
      );

      // رسم نقاط الوجه المحددة
      drawing.drawLandmarks(
        points,
        {
          color: "#00ffad",
          lineWidth: 1,
          radius: 1.5
        }
      );

      frameCount++;

      if (frameCount === 1) {
        log("FACE LANDMARKS DETECTED");
        log("VISUAL TRACKING ACTIVE");
      }

    } else {
      $("faceCount").textContent = "00";
      $("detectionState").textContent = "SEARCHING";
      $("trackingState").textContent = "SEARCHING";
      $("landmarkCount").textContent = "0";
      $("progressBar").style.width = "0%";

      $("message").textContent =
        "جاري البحث عن وجه أمام الكاميرا...";

      $("terminal").lastElementChild.textContent =
        "> SEARCHING FOR FACE...";
    }
  }

  requestAnimationFrame(scanFrame);
}

// ==============================
// SYSTEM STARTUP
// ==============================
log("M7X AI SCANNER INITIALIZED");
log("VISUAL ENGINE LOADED");
log("WAITING FOR CAMERA INPUT");