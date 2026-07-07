# Sawa: Bidirectional Sign Language Translation System

**Sawa** is an intelligent, full-stack machine learning platform that bridges communication gaps between Deaf and hearing communities. Using deep learning and computer vision, it enables real-time translation between text, speech, and sign language gestures in both **American Sign Language (ASL)** and **Arabic Sign Language (ArSL)**.

---

## 🎯 Overview

Sawa provides three core translation modes:

| Mode | Functionality |
|------|---------------|
| **Text-to-Sign** | Convert typed text into animated hand sign visualizations |
| **Sign-to-Text** | Recognize hand gestures from camera feed and convert to text |
| **Speech-to-Sign** | Transcribe spoken audio and display corresponding sign animations |

This project delivers an end-to-end solution combining a **Python FastAPI backend** with a modern **React frontend**, powered by MediaPipe computer vision and TensorFlow neural networks.

---

## 📊 Tech Stack

### Backend
- **Language:** Python 3.11.x
- **Framework:** FastAPI with WebSocket support
- **Computer Vision:** MediaPipe (hand landmark detection)
- **ML Framework:** TensorFlow/Keras (deep neural networks)
- **Speech Processing:** Faster-Whisper (audio transcription)
- **Dependencies:** OpenCV, NumPy, Pandas, Scikit-learn

### Frontend
- **Language:** JavaScript (ES6+)
- **Framework:** React 18+ with Vite
- **Animation:** Framer Motion
- **Styling:** CSS Modules
- **Deployment:** Node.js runtime
- **Key Libraries:** React Router, Axios

### Data & Training
- **Notebook Environment:** Jupyter (Google Colab compatible)
- **Dataset:** ASL Alphabet (Kaggle, ~87k images)
- **Feature Extraction:** TensorFlow + MediaPipe hand landmarks
- **Model Formats:** Keras (.keras)

---

## 📁 Repository Structure

```
digital-egypt-pioneers-ai-capstone/
├── SawaNotebook.ipynb              # Full training pipeline (Colab)
├── backend/                        # FastAPI application
│   ├── main.py                     # REST/WebSocket endpoints
│   ├── hand_utils.py               # MediaPipe integration
│   ├── predictor.py                # Model inference wrapper
│   ├── sawa_asl_model.keras        # English ASL model
│   ├── sawa_arsl_model.keras       # Arabic sign language model
│   ├── asl_alphabet_features.npy   # Reference landmarks (EN)
│   ├── arsl_alphabet_features.npy  # Reference landmarks (AR)
│   └── requirements.txt            # Python dependencies
├── frontend/                       # React application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── TextToSign.jsx      # Text input → sign animation
│   │   │   ├── SignToText.jsx      # Camera → text recognition
│   │   │   └── SpeechToSign.jsx    # Audio recording/upload → signs
│   │   ├── components/
│   │   │   ├── HandSkeleton.jsx    # Canvas-based hand drawing
│   │   │   └── LangToggle.jsx      # EN/AR language switcher
│   │   ├── context/
│   │   │   └── AppContext.jsx      # Global state & i18n
│   │   └── App.jsx                 # Route definitions
│   ├── package.json
│   └── vite.config.js
└── README.md                       # (this file)
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11.x** with pip
- **Node.js 16+** with npm
- **Google Chrome/Chromium** (for camera access)
- *(Optional)* NVIDIA GPU + CUDA for faster training

### Step 1: Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Required model files** (place in `backend/`):
- `sawa_asl_model.keras` — English ASL classifier
- `sawa_arsl_model.keras` — Arabic sign language classifier
- `asl_alphabet_features.npy` — English reference landmarks
- `arsl_alphabet_features.npy` — Arabic reference landmarks
- `hand_landmarker.task` — MediaPipe hand landmark detector

You should see:
```
✅ EN landmark refs: 28 letters
✅ AR landmark refs: 32 letters
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Step 2: Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. The app will auto-reload on changes.

### Step 3: Test the System

1. **Text-to-Sign:** Type "HELLO" → see hand sign animations
2. **Sign-to-Text:** Click "Start Camera" → perform signs → see recognized text
3. **Speech-to-Sign:** Click "Start Recording" → speak → view sign animations

---

## 🔄 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Frontend (5173)                       │
│  ┌──────────────────┬──────────────────┬──────────────────────┐  │
│  │  TextToSign      │   SignToText     │   SpeechToSign       │  │
│  │  (REST API)      │  (WebSocket)     │  (REST + File API)   │  │
│  └──────────────────┴──────────────────┴──────────────────────┘  │
│                              ↕ HTTP/WS                            │
├─────────────────────────────────────────────────────────────────┤
│                   FastAPI Backend (8000)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  POST /transcribe           → Whisper (speech→text)      │   │
│  │  GET  /landmarks/{lang}/{ch} → Reference landmarks       │   │
│  │  WS   /ws/sign-to-text      → Real-time sign detection   │   │
│  └──────────────────────────────────────────────────────────┘   │
│         ↓              ↓                ↓                        │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐          │
│  │ MediaPipe   │ │ TensorFlow   │ │ Faster-Whisper   │          │
│  │ Hand Detect │ │ ASL/ArSL CNN │ │ Audio Transcribe │          │
│  └─────────────┘ └──────────────┘ └──────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

**Text → Sign:**
1. User types text (e.g., "HELLO")
2. Frontend splits into characters
3. For each character, calls `GET /landmarks/en/H` → gets 63-dim hand landmark vector
4. **HandSkeleton** component renders 3D hand on canvas with breathing animation

**Sign → Text:**
1. Browser sends camera frames over WebSocket
2. Backend runs MediaPipe → extracts 126-dim hand landmarks
3. TensorFlow model predicts letter class + confidence
4. Prediction sent back; frontend accumulates into text string

**Speech → Sign:**
1. User records audio or uploads file
2. Backend transcribes with Faster-Whisper
3. System treats transcribed text same as manual Text-to-Sign input

---

## 🧠 Machine Learning Pipeline

### Training (SawaNotebook.ipynb)
The included Jupyter notebook handles the complete ML workflow:

1. **Data Download:** Fetches ASL Alphabet dataset from Kaggle (~87k images, balanced across 29 classes)
2. **Feature Extraction:** Uses MediaPipe to extract hand landmarks from each image
   - 21 landmarks per hand × 3 coordinates (x, y, z) = 63-dim feature per hand
   - Normalized (centered on wrist, scale-invariant) for robustness
3. **Model Architecture:** Custom CNN trained with:
   - Data augmentation (rotations, shifts, crops)
   - Class weighting for imbalanced "nothing" class
   - Early stopping + learning rate reduction
4. **Output:** Trained `.keras` model + reference landmark `.npy` files

### Inference
- **Real-time:** WebSocket handler processes frames at ~30 FPS
- **Batch:** REST API returns pre-computed landmark references
- **Confidence:** Model outputs softmax probabilities; only high-confidence predictions displayed

---

## 🌐 API Reference

### REST Endpoints

#### Text-to-Sign: Get Reference Landmarks
```
GET /landmarks/{lang}/{letter}
```
**Parameters:**
- `lang` (string): `"en"` or `"ar"`
- `letter` (string): Single character or Unicode character

**Response:**
```json
{
  "found": true,
  "landmarks": [0.12, -0.34, 0.09, ...]  // 63 floats
}
```

#### Get Available Letters
```
GET /letters/{lang}
```
**Response:**
```json
{
  "letters": ["A", "B", "C", "SPACE", ...]
}
```

#### Speech-to-Text: Transcribe Audio
```
POST /transcribe
```
**Parameters:**
- `audio` (file): `.mp3`, `.wav`, `.webm`, `.m4a`, `.ogg`, etc.
- `language` (form): `"en"` or `"ar"`

**Response:**
```json
{
  "text": "hello world"
}
```

### WebSocket: Real-Time Sign Recognition
```
WS /ws/sign-to-text
```

**Client sends:**
```json
{
  "lang": "en",
  "frame": "iVBORw0KGgoAAAANSUh..."  // base64 JPEG
}
```

**Server responds:**
```json
{
  "letter": "A",
  "conf": 0.94
}
```

---

## 📚 Dataset & Model Details

| Aspect | English (ASL) | Arabic (ArSL) |
|--------|---------------|---------------|
| **Dataset Size** | ~87k images | Custom corpus |
| **Classes** | 29 (A-Z + SPACE + DEL + NOTHING) | 32 letters |
| **Samples/Class** | ~3000 | ~2500–3500 |
| **Model Size** | ~12 MB | ~12 MB |
| **Training Time** | ~40 min (Google Colab T4) | ~30 min |
| **Accuracy** | ~98% (validation set) | ~96% |

**Feature Normalization:**
- Wrist (landmark 0) used as origin
- All points centered relative to wrist position
- Scaled by bounding-box diagonal for view-invariance

---

## 🎨 Frontend Features

### Components

**HandSkeleton.jsx**
- Renders hand skeleton on HTML5 Canvas
- 21 joints + 20 bones per hand
- Optional "breathing" animation (glow effect)
- Responsive to landmark coordinate updates
- Projection from 3D (x, y, z) to 2D canvas

**LangToggle.jsx**
- Bilingual UI: English ↔ Arabic
- RTL text layout for Arabic
- Persistent language selection

**SpeechToSign.jsx**
- Microphone recording (Web Audio API)
- Audio file upload support
- Real-time transcription feedback
- Sign sequence auto-play with adjustable speed

**TextToSign.jsx**
- Text input with character validation
- Step-through or auto-play animation
- Displays confidence scores for each sign

### Internationalization
UI text fully localized to English and Arabic via `AppContext.jsx`

---

## ⚙️ Configuration & Customization

### Model Switching
Edit `backend/main.py` to swap trained models:
```python
en_predictor = SignPredictor(
    model_path="sawa_asl_model.keras",
    labels_path="sawa_label_classes.json"
)
```

### CORS Configuration
Allowed origins (update in `main.py`):
```python
allow_origins=["http://localhost:5173", "http://localhost:3000"]
```

### Hand Detection Parameters
In `backend/hand_utils.py`:
- `min_hand_detection_confidence`: Default 0.5 (lower = more lenient)
- `num_hands`: Set to 2 for two-hand gestures
- `running_mode`: Set to VIDEO for continuous frames

---

## 🛠️ Development & Contributing

### Running Tests
```bash
# Backend unit tests
cd backend
pytest tests/

# Frontend tests
cd frontend
npm test
```

### Code Structure

**Backend:**
- `main.py` — FastAPI app setup + endpoints
- `hand_utils.py` — MediaPipe wrapper (hand detection/landmark extraction)
- `predictor.py` — Model loading + inference
- `sawa_layers.py` — Custom Keras layers (if applicable)

**Frontend:**
- React hooks for state management
- Framer Motion for animations
- CSS Modules for scoped styles
- WebSocket client in `SignToText.jsx`

### Extending the System

**Add a new language:**
1. Train a new model on your dataset (using `SawaNotebook.ipynb` as template)
2. Export as `.keras` file + reference landmarks `.npy`
3. Register in `backend/main.py`:
   ```python
   xx_predictor = SignPredictor(
       model_path="sawa_xxl_model.keras",
       labels_path="sawa_xxl_label_classes.json"
   )
   ```
4. Add character-to-label mapping in `AR_CHAR_TO_LABEL` equivalent
5. Update frontend language selector in `AppContext.jsx`

---

## 📝 Training from Scratch

To retrain the models on your own data:

1. **Prepare dataset:**
   - Organize images in folders: `dataset/{class}/{image}.jpg`
   - Ensure at least 50 images per class

2. **Run SawaNotebook.ipynb:**
   - Update paths to your dataset in CELL 3
   - Execute cells in order (GPU recommended)
   - Models and reference landmarks saved automatically

3. **Deploy:**
   - Copy generated `.keras` files to `backend/`
   - Copy `.npy` landmark files to `backend/`
   - Restart FastAPI server

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Camera not accessible | Check browser permissions; use HTTPS in production |
| Predictions all wrong | Verify hand is fully visible and well-lit |
| "Model not found" error | Ensure `.keras` files in `backend/` directory |
| WebSocket connection fails | Check CORS settings; ensure backend on port 8000 |
| Audio transcription fails | Speak clearly; try shorter clips; check microphone levels |
| High latency on sign-to-text | GPU not detected; CPU slower (~200ms per frame) |

---

## 📄 License & Attribution

This project is developed as a **Digital Egypt Pioneers AI Capstone**.

**Datasets & Resources:**
- ASL Alphabet dataset: [Kaggle](https://www.kaggle.com/datasets/grassknoted/asl-alphabet)
- MediaPipe: [Google Research](https://github.com/google/mediapipe)
- Faster-Whisper: [OpenAI Whisper](https://github.com/openai/whisper)

---

## 📞 Support & Contact

For issues, suggestions, or contributions, please open a [GitHub Issue](https://github.com/passantelsherif/digital-egypt-pioneers-ai-capstone/issues).

---

**Sawa:** Building bridges through intelligent translation. 🤝
