# Iris

**Learn by talking. Play by speaking, signing, or drawing.**

Iris is a voice-first learning playground for kids who get left behind by click-and-type software — neurodivergent learners, kids with limb differences, and children learning American Sign Language. Instead of menus and keyboards, a friendly AI buddy talks with the player, asks questions out loud, and turns every right answer into progress inside a 3D world.

---

## Why we built it

Most educational apps quietly assume a child can read dense text, aim a mouse, and type quickly. For a lot of kids, that assumption is the whole barrier. We wanted a place where the default input is a conversation, and where signing or sketching an answer counts just as much as saying it.

---

## What's inside

Iris has four worlds. Each one pairs a subject with a different way of playing.

**🧮 Boss Battle — Math**
Face off against a boss in a glowing arena. Pick your grade, from kindergarten to 8th grade, then one of three levels, each with its own boss: counting and adding for the youngest players, then times tables, long division, fractions, order of operations, percents, exponents, equations, negative numbers, and the Pythagorean theorem by 8th grade. The numbers are new every fight, so there's nothing to memorize. Say the answer out loud or tap it on the number pad, and your hero fires a spell. Three right in a row charges your hero's special attack (Fox Fire, Bear Quake, Laser Blast or Star Pounce): press the button, hit Space, or say "special" to fire a beam that does triple damage. The boss winds up and throws fireballs back, and it changes form as its health drops. A miss shows the worked answer step by step, a Hint button gives a nudge, and you can sketch on a whiteboard that Gemini checks. Beat a level to earn up to three stars, and the game remembers your grade. "Play without voice" works with no microphone, and Calm mode turns off screen shake and flashing.

**🌲 Sign Trail — Reading, Spelling & ASL**
Walk a forest trail, answer reading and spelling challenges, and collect keys to unlock the next stretch of path. A camera-powered signing overlay recognizes fingerspelled letters, so kids can spell words with their hands.

**🌀 Star Maze — Science & Exploration**
Find your way through a foggy, procedurally built hedge maze. Every science question you answer correctly earns another step toward the exit.

**🌷 Feelings Garden — Social-Emotional Learning**
Visit four neighbors in a sunny village. Each one has a little moment (a dropped ice cream, a toppled block tower, a thunderstorm, a birthday), and their face shows how they feel. Name the feeling, then pick a kind way to help, and a flower blooms by their house. There's no losing here: a wrong guess gets a gentle clue. You can play by talking, or tap the picture cards with "Play without voice".

---

## How a session flows

1. Open Iris and choose a subject: **Math**, **ASL**, **Explore**, or **Feelings**.
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
│   ├── maze/             science maze
│   └── garden/           feelings garden
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
GEMINI_API_KEY=...
```

The whiteboard grader uses `gemini-2.5-flash` by default, which works on Gemini's free tier. Set `GEMINI_MODEL` to use a different model.

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

## Putting it online

The web app deploys to [Vercel](https://vercel.com) as a normal Next.js project: import the GitHub repo, then add these environment variables in the project settings:

```
ELEVENLABS_API_KEY=sk_...
GEMINI_API_KEY=...
```

Every push to `main` redeploys. The Python backend doesn't run on Vercel, so ASL hand-signing and video-to-questions are hidden on the hosted site. To bring them back, deploy `backend/` somewhere that runs Python and set `NEXT_PUBLIC_BACKEND_URL` and `BACKEND_URL` to its address.
