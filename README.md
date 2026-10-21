# Iris

**Learn by talking. Play by speaking, signing, or drawing.**

Iris is a voice-first learning playground for kids who get left behind by click-and-type software — neurodivergent learners, kids with limb differences, and children learning American Sign Language. Instead of menus and keyboards, a friendly AI buddy talks with the player, asks questions out loud, and turns every right answer into progress inside a 3D world.

---

## Why we built it

Most educational apps quietly assume a child can read dense text, aim a mouse, and type quickly. For a lot of kids, that assumption is the whole barrier. We wanted a place where the default input is a conversation, and where signing or sketching an answer counts just as much as saying it.

---

## What's inside

Iris has three worlds. Each one pairs a subject with a different way of playing.

**🧮 Boss Battle — Math**
Face off against a boss in a shadowy arena. Each correct answer lands a hit. Questions range from simple arithmetic up to early calculus, and players who prefer to work it out by hand can sketch on a whiteboard that Gemini reads and checks.

**🌲 Word Adventure — Reading, Spelling & ASL**
Walk a forest trail, answer reading and spelling challenges, and collect keys to unlock the next stretch of path. A camera-powered signing overlay recognizes fingerspelled letters, so kids can spell words with their hands.

**🌀 Maze Quest — Science & Exploration**
Find your way through a foggy, procedurally built hedge maze. Every science question you answer correctly earns another step toward the exit.

---

## How a session flows

1. Open Iris and choose a subject: **Math**, **ASL**, or **Explore**.
2. Pick a companion: Brave Bear, Clever Fox, Helper Robot, or Curious Cat.
3. Jump in. Your companion talks you through the whole game in its own personality, offering hints and celebrating your wins.

Players never have to type. They speak, sign, or draw, and the game reacts right away.

---

## Built with

- **Next.js 16** with the App Router and **React 19**
- **TypeScript** in strict mode
- **React Three Fiber**, **drei**, and **Three.js** for the 3D worlds, plus `@react-three/postprocessing` for visual effects
- **ElevenLabs Conversational AI** for the talking companions
- **Google Gemini** for grading handwritten math
- **Zustand** for state, with one store per game and a shared hub store
- **Tailwind CSS v4** for styling
- **FastAPI**, **PyTorch**, and **MediaPipe** on the backend for ASL hand-sign recognition

---

## Project layout

```
app/
├── page.tsx              home screen
├── select-topic/         subject picker
├── select-character/     companion picker
├── play/
│   ├── boss/             math boss battle
│   ├── adventure/        reading + ASL forest trail
│   └── maze/             science maze
├── components/           3D scenes, HUDs, and voice bridges for each game
├── lib/                  stores, question banks, and companion personas
└── api/                  voice-session auth and drawing grader
backend/
├── main.py               FastAPI server for ASL prediction and voice auth
└── model/                trained hand-sign models
```

---

## Running it locally

**You'll need** Node.js 18 or newer and npm. For the ASL backend, you'll also need Python 3.

**1. Add your keys.** Create `.env.local` in the project root:

```
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
HACKDAVIS_GEMINI_API_KEY=...
```

**2. Start the web app.**

```bash
npm install
npm run dev
```

Then visit http://localhost:3000.

**3. (Optional) Start the ASL backend.**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Credits

Iris grew out of a project first prototyped at HackDavis 2026.
