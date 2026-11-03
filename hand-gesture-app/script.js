const video = document.getElementById('webcam');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
const btnStart = document.getElementById('btn-start');
const outputText = document.getElementById('output-text');

// Variabel untuk melacak status gestur terakhir agar suara tidak spamming
let currentGesture = "";
let gestureHoldCount = 0; // Filter anti-flicker

// Fungsi Browser Berbicara (Text-to-Speech)
function speakWord(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Hentikan suara sebelumnya jika masih bicara
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';       // Menggunakan logat Bahasa Indonesia
    utterance.rate = 1.1;           // Kecepatan bicara sedikit energik
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

// Inisialisasi MediaPipe Hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6
});

// Logika Deteksi Jari
function detectGesture(landmarks) {
  const isIndexOpen  = landmarks[8].y  < landmarks[6].y;
  const isMiddleOpen = landmarks[12].y < landmarks[10].y;
  const isRingOpen   = landmarks[16].y < landmarks[14].y;
  const isPinkyOpen  = landmarks[20].y < landmarks[18].y;

  const distTipToPinky = Math.hypot(landmarks[4].x - landmarks[17].x, landmarks[4].y - landmarks[17].y);
  const distIpToPinky  = Math.hypot(landmarks[3].x - landmarks[17].x, landmarks[3].y - landmarks[17].y);
  const isThumbOpen    = distTipToPinky > (distIpToPinky * 1.15);

  if (isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen) {
    return isThumbOpen ? "5_JARI" : "4_JARI";
  }

  if (isIndexOpen && isMiddleOpen && isRingOpen && !isPinkyOpen) {
    return "3_JARI";
  }

  if (isIndexOpen && isPinkyOpen && !isMiddleOpen && !isRingOpen) {
    return "GACOR";
  }

  if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    return "2_JARI";
  }

  if (isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    return "1_JARI";
  }

  if (!isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    return "FIST";
  }

  return "UNKNOWN";
}

// Data Teks, Warna Neon Glow, dan Suara
const gestureConfig = {
  "1_JARI": {
    text: "Saya",
    color: "#00d4ff",
    shadow: "0 0 20px #00d4ff",
    speech: "Saya"
  },
  "2_JARI": {
    text: "Mahasiswa Semester 7",
    color: "#00ff88",
    shadow: "0 0 20px #00ff88",
    speech: "Mahasiswa Semester Tujuh"
  },
  "3_JARI": {
    text: "Mengatakan secara fakta",
    color: "#ffd700",
    shadow: "0 0 20px #ffd700",
    speech: "Mengatakan secara fakta"
  },
  "4_JARI": {
    text: "CODING ITU EZ DEK 😎",
    color: "#ff3366",
    shadow: "0 0 25px #ff3366",
    speech: "Koding itu gampang dek!"
  },
  "5_JARI": {
    text: "Izin tampil 🙌",
    color: "#ffffff",
    shadow: "0 0 20px #ffffff",
    speech: "Izin tampil!"
  },
  "GACOR": {
    text: "Gacooorrr 🔥",
    color: "#ff00ff",
    shadow: "0 0 30px #ff00ff",
    speech: "Gacor abis!"
  }
};

// Loop MediaPipe
hands.onResults((results) => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF88', lineWidth: 4 });
    drawLandmarks(ctx, landmarks, { color: '#FF0055', lineWidth: 2, radius: 4 });

    const detected = detectGesture(landmarks);

    // Filter Anti-Flicker: Gestur harus bertahan minimal 3 frame agar tidak salah deteksi saat transisi
    if (detected !== "UNKNOWN" && detected !== currentGesture) {
      gestureHoldCount++;
      if (gestureHoldCount >= 3) {
        currentGesture = detected;
        gestureHoldCount = 0;

        // Tangani perubahan gestur
        if (currentGesture === "FIST") {
          outputText.style.display = "none";
          window.speechSynthesis.cancel();
        } else if (gestureConfig[currentGesture]) {
          const config = gestureConfig[currentGesture];
          outputText.style.display = "block";
          outputText.innerText = config.text;
          outputText.style.color = config.color;
          outputText.style.boxShadow = config.shadow;

          // Picu animasi membal (pop)
          outputText.classList.remove('pop-anim');
          void outputText.offsetWidth; // Trigger reflow DOM
          outputText.classList.add('pop-anim');

          // Laptop bersuara
          speakWord(config.speech);
        }
      }
    } else {
      gestureHoldCount = 0;
    }
  } else {
    currentGesture = "";
    outputText.style.display = "block";
    outputText.innerText = "Arahkan tangan ke kamera...";
    outputText.style.color = "#888888";
    outputText.style.boxShadow = "none";
  }
});

// Jalankan Kamera
async function startWebcam() {
  btnStart.style.display = 'none';
  outputText.innerText = "Membuka kamera...";

  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480
  });

  camera.start().catch((err) => {
    console.error("Gagal kamera:", err);
    outputText.innerText = "Kamera gagal diakses.";
  });
}

btnStart.addEventListener('click', startWebcam);