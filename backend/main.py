import base64
import os
import tempfile
from pathlib import Path

import cv2
import httpx
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from mediapipe import Image as MpImage, ImageFormat
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions, RunningMode
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent / ".env", override=True)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH = Path(__file__).parent / "model" / "asl_model.pth"
LANDMARK_MODEL_PATH = Path(__file__).parent / "model" / "landmark_model.pth"
LANDMARK_LABELS_PATH = Path(__file__).parent / "model" / "landmark_labels.npy"
LANDMARKER_PATH = Path(__file__).parent / "hand_landmarker.task"

CNN_LABELS = list("ABCDEFGHI") + list("KLMNOPQRSTUVWXY")


class ASLModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 75, 3, stride=1, padding=1)
        self.bn1 = nn.BatchNorm2d(75)
        self.pool1 = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(75, 50, 3, stride=1, padding=1)
        self.drop1 = nn.Dropout(0.2)
        self.bn2 = nn.BatchNorm2d(50)
        self.pool2 = nn.MaxPool2d(2, 2)
        self.conv3 = nn.Conv2d(50, 25, 3, stride=1, padding=1)
        self.bn3 = nn.BatchNorm2d(25)
        self.pool3 = nn.MaxPool2d(2, 2)
        self.flatten = nn.Flatten()
        self.fc1 = nn.Linear(25 * 3 * 3, 512)
        self.drop2 = nn.Dropout(0.3)
        self.fc2 = nn.Linear(512, 24)

    def forward(self, x):
        x = self.pool1(F.relu(self.bn1(self.conv1(x))))
        x = self.pool2(self.bn2(self.drop1(F.relu(self.conv2(x)))))
        x = self.pool3(F.relu(self.bn3(self.conv3(x))))
        x = self.flatten(x)
        x = F.relu(self.fc1(x))
        x = self.drop2(x)
        return self.fc2(x)


class LandmarkMLP(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(63, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 256), nn.BatchNorm1d(256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 128), nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        return self.net(x)


cnn_model = ASLModel()
cnn_model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True))
cnn_model.to(DEVICE)
cnn_model.eval()

landmark_model = None
landmark_labels = None
if LANDMARK_MODEL_PATH.exists() and LANDMARK_LABELS_PATH.exists():
    landmark_labels = np.load(LANDMARK_LABELS_PATH, allow_pickle=True)
    landmark_model = LandmarkMLP(num_classes=len(landmark_labels))
    landmark_model.load_state_dict(torch.load(LANDMARK_MODEL_PATH, map_location=DEVICE, weights_only=True))
    landmark_model.to(DEVICE)
    landmark_model.eval()
    print(f"Landmark model loaded ({len(landmark_labels)} classes)")
else:
    print("No landmark model — using CNN fallback")

_hand_options = HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=str(LANDMARKER_PATH)),
    running_mode=RunningMode.IMAGE,
    num_hands=1,
    min_hand_detection_confidence=0.5,
    min_hand_presence_confidence=0.5,
    min_tracking_confidence=0.5,
)
hand_landmarker = HandLandmarker.create_from_options(_hand_options)
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class PredictRequest(BaseModel):
    image: str  # base64-encoded JPEG


class BBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class PredictResponse(BaseModel):
    letter: str
    confidence: float
    bbox: BBox | None
    model_used: str


def normalize_landmarks(lm_list):
    lm = np.array([[l.x, l.y, l.z] for l in lm_list], dtype=np.float32)
    lm -= lm[0]
    lm /= np.max(np.abs(lm)) + 1e-6
    return lm.flatten()


def detect_hand(frame_bgr):
    h, w = frame_bgr.shape[:2]
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    result = hand_landmarker.detect(MpImage(image_format=ImageFormat.SRGB, data=rgb))
    return result, h, w


def get_bbox(lm_list, h, w):
    xs = [l.x * w for l in lm_list]
    ys = [l.y * h for l in lm_list]
    pad_x = int(max(20, (max(xs) - min(xs)) * 0.3))
    pad_y = int(max(20, (max(ys) - min(ys)) * 0.3))
    return BBox(
        x=max(0, int(min(xs)) - pad_x),
        y=max(0, int(min(ys)) - pad_y),
        w=min(w, int(max(xs)) + pad_x) - max(0, int(min(xs)) - pad_x),
        h=min(h, int(max(ys)) + pad_y) - max(0, int(min(ys)) - pad_y),
    )


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    frame = cv2.imdecode(np.frombuffer(base64.b64decode(req.image), np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        return PredictResponse(letter="", confidence=0.0, bbox=None, model_used="none")

    result, h, w = detect_hand(frame)
    if not result.hand_landmarks:
        return PredictResponse(letter="", confidence=0.0, bbox=None, model_used="none")

    lm_list = result.hand_landmarks[0]
    bbox = get_bbox(lm_list, h, w)

    if landmark_model is not None:
        tensor = torch.tensor(normalize_landmarks(lm_list)).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            probs = torch.softmax(landmark_model(tensor), dim=1)
            confidence, idx = probs.max(dim=1)
        return PredictResponse(
            letter=str(landmark_labels[idx.item()]),
            confidence=round(confidence.item(), 4),
            bbox=bbox,
            model_used="landmark",
        )

    x1, y1 = bbox.x, bbox.y
    crop = frame[y1:y1 + bbox.h, x1:x1 + bbox.w]
    if crop.size == 0:
        return PredictResponse(letter="", confidence=0.0, bbox=None, model_used="none")
    gray = clahe.apply(cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY))
    tensor = torch.tensor(cv2.resize(gray, (28, 28)).astype(np.float32) / 255.0).unsqueeze(0).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        probs = torch.softmax(cnn_model(tensor), dim=1)
        confidence, idx = probs.max(dim=1)
    return PredictResponse(
        letter=CNN_LABELS[idx.item()],
        confidence=round(confidence.item(), 4),
        bbox=bbox,
        model_used="cnn",
    )


async def _mint_signed_url(api_key: str, agent_id: str) -> str:
    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(
            "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
            params={"agent_id": agent_id},
            headers={"xi-api-key": api_key},
        )
    if res.status_code != 200:
        raise HTTPException(status_code=500, detail=f"ElevenLabs error: {res.status_code} {res.text}")
    return res.json()["signed_url"]


@app.get("/api/signed-url")
async def signed_url(game: str = Query(default="maze")):
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if game == "boss":
        agent_id = os.getenv("ELEVENLABS_BOSS_AGENT_ID") or os.getenv("ELEVENLABS_AGENT_ID")
    else:
        agent_id = os.getenv("ELEVENLABS_AGENT_ID")
    if not api_key or not agent_id:
        raise HTTPException(status_code=500, detail="Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID")
    return {"signedUrl": await _mint_signed_url(api_key, agent_id)}


@app.get("/api/signed-url/spell")
async def signed_url_spell():
    api_key = os.getenv("ELEVENLABS_API_KEY")
    agent_id = os.getenv("ELEVENLABS_AGENT_SPELL_ID")
    if not api_key or not agent_id:
        raise HTTPException(status_code=500, detail="Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_SPELL_ID")
    return {"signedUrl": await _mint_signed_url(api_key, agent_id)}


MCQ_PROMPT = """Generate exactly 3 MCQs from the transcript below.

Rules:
- Questions: short (under 8 words)
- Each answer option: 1-2 words only
- Mark the correct answer

Output ONLY this format, nothing else:
Q1. <question>
A) <1-2 words>
B) <1-2 words>
C) <1-2 words>
D) <1-2 words>
Answer: <letter>

Q2. <question>
A) <1-2 words>
B) <1-2 words>
C) <1-2 words>
D) <1-2 words>
Answer: <letter>

Q3. <question>
A) <1-2 words>
B) <1-2 words>
C) <1-2 words>
D) <1-2 words>
Answer: <letter>

TRANSCRIPT:
{transcript}"""


def _parse_mcqs(raw: str) -> list[dict]:
    blocks = [b for b in raw.strip().split("\n\n") if "Answer:" in b]
    results = []
    for i, block in enumerate(blocks[:3]):
        lines = [l.strip() for l in block.strip().splitlines()]
        question = next((l for l in lines if l[:2] in ("Q1", "Q2", "Q3")), "")
        question = question.split(".", 1)[-1].strip()
        def get_choice(letter):
            line = next((l for l in lines if l.startswith(f"{letter})")), "")
            return line[2:].strip() or "?"
        answer_line = next((l for l in lines if l.startswith("Answer:")), "Answer: A")
        answer = answer_line.replace("Answer:", "").strip()[:1].upper() or "A"
        results.append({
            "id": i + 1,
            "question": question or f"Question {i + 1}",
            "choices": {"A": get_choice("A"), "B": get_choice("B"), "C": get_choice("C"), "D": get_choice("D")},
            "answer": answer,
            "hint": "Think carefully and try a different letter.",
        })
    return results


@app.post("/api/generate-forest-questions")
async def generate_forest_questions(video: UploadFile = File(...)):
    import google.generativeai as genai
    from faster_whisper import WhisperModel

    api_key = os.getenv("HACKDAVIS_GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="HACKDAVIS_GEMINI_API_KEY not set")

    suffix = Path(video.filename or "video.mp4").suffix or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await video.read())
        tmp_path = tmp.name

    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        whisper = WhisperModel("tiny", device=device, compute_type=compute_type)
        segments, _ = whisper.transcribe(tmp_path, beam_size=5)
        transcript = " ".join(s.text.strip() for s in segments)
        if not transcript.strip():
            raise HTTPException(status_code=422, detail="Could not transcribe audio from video")

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.5-flash-lite")
        response = model.generate_content(MCQ_PROMPT.format(transcript=transcript))
        questions = _parse_mcqs(response.text)
        if len(questions) < 3:
            raise HTTPException(status_code=500, detail="Could not parse 3 questions from Gemini response")

        return {"questions": questions}
    finally:
        os.unlink(tmp_path)


OPEN_ENDED_PROMPT = """You are generating quiz questions for a young child (ages 5-10) based on a video transcript.

Generate exactly 8 short, simple questions. Each question must:
- Be under 10 words
- Have a clear, short answer (1-3 words)
- List 2-5 accepted answer keywords/synonyms

Output ONLY valid JSON — no markdown fences, no explanation:
[
  {{"text": "What color is the sky?", "accept": ["blue"]}},
  {{"text": "How many legs does a dog have?", "accept": ["4", "four"]}}
]

TRANSCRIPT:
{transcript}"""


def _parse_open_ended(raw: str) -> list[dict]:
    import json as _json
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
    questions = _json.loads(text)
    if not isinstance(questions, list):
        raise ValueError("Expected a JSON array")
    valid = []
    for q in questions:
        if isinstance(q, dict) and "text" in q and "accept" in q and isinstance(q["accept"], list):
            valid.append({"text": str(q["text"]), "accept": [str(a) for a in q["accept"]]})
    return valid[:8]


@app.post("/api/generate-maze-questions")
async def generate_maze_questions(video: UploadFile = File(...)):
    import time
    from google import genai
    from faster_whisper import WhisperModel

    t0 = time.time()
    print(f"[maze-questions] received video: {video.filename} ({video.size} bytes)")

    api_key = os.getenv("HACKDAVIS_GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="HACKDAVIS_GEMINI_API_KEY not set")

    suffix = Path(video.filename or "video.mp4").suffix or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await video.read())
        tmp_path = tmp.name

    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
        print(f"[maze-questions] loading whisper model (device={device}, compute_type={compute_type})")
        t1 = time.time()
        whisper = WhisperModel("tiny", device=device, compute_type=compute_type)
        print(f"[maze-questions] whisper model loaded in {time.time() - t1:.2f}s")

        t2 = time.time()
        segments, _ = whisper.transcribe(tmp_path, beam_size=5)
        transcript = " ".join(s.text.strip() for s in segments)
        print(f"[maze-questions] transcription done in {time.time() - t2:.2f}s ({len(transcript)} chars)")
        print(f"[maze-questions] transcript preview: {transcript[:200]}")
        if not transcript.strip():
            raise HTTPException(status_code=422, detail="Could not transcribe audio from video")

        client = genai.Client(api_key=api_key)
        t3 = time.time()
        print("[maze-questions] sending transcript to Gemini...")
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=OPEN_ENDED_PROMPT.format(transcript=transcript),
        )
        print(f"[maze-questions] Gemini responded in {time.time() - t3:.2f}s")
        print(f"[maze-questions] raw response: {response.text[:500]}")

        questions = _parse_open_ended(response.text)
        print(f"[maze-questions] parsed {len(questions)} questions")
        if len(questions) < 8:
            raise HTTPException(status_code=500, detail=f"Could only parse {len(questions)} questions from Gemini response, need 8")

        print(f"[maze-questions] total time: {time.time() - t0:.2f}s")
        return {"questions": questions}
    finally:
        os.unlink(tmp_path)
