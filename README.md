# ZenCode — Smart Friendly Code Editor v2.0
## AIET Innovation & Design Thinking Project 2026

---

## 🌿 What is Ze?

ZenCode is a **browser-based smart code editor** that combines:
- Real-time code analysis via **Claude AI**
- **Camera-based facial emotion detection** (happy, sad, frustrated, focused)
- Beginner-friendly error explanations
- Motivational messages based on your emotional state
- Voice assistant support
- Session mood tracking dashboard

---

## 🚀 Quick Start (Zero Setup!)

Just open `index.html` in any modern browser.

```
double-click index.html → opens in Chrome/Firefox/Edge
```

That's it. No npm, no Node.js, no build step required.

---

## 📁 Project Structure

```
zencode/
├── index.html          ← Complete app (HTML + CSS + JS, all-in-one)
└── README.md           ← This file
```

All code is in one self-contained `index.html` for maximum portability.

---

## ✨ Features

### 🖥️ Code Editor
- Syntax-aware editor for: JavaScript, Python, HTML, CSS, C, C++
- Line numbers with auto-sync scrolling
- Auto-close brackets: `(`, `[`, `{`, `"`, `'`
- Tab indentation support
- File tabs per language
- Auto-save to localStorage

### 📸 Camera Emotion Detection (UNIQUE FEATURE)
- Requests webcam access on first load
- Sends video frame to Claude Vision API every 3 seconds
- Detects: Happy 😊 · Sad 😟 · Frustrated 😤 · Focused 🎯 · Tired 😴 · Neutral 😐
- Displays real-time emotion bars with confidence scores
- Gives context-aware tips based on your detected emotion
- Falls back to behavioral simulation if camera is unavailable

### 🤖 AI-Powered Analysis (Claude Sonnet)
- Analyzes your code with full understanding of beginner context
- Shows **friendly English explanations** (not harsh compiler messages)
- Gives hints — NOT full solutions (preserves learning)
- Detects repeated same errors → triggers extra gentle support
- Adjusts tone based on your detected facial emotion

### 💬 Smart Feedback System
- Error Help cards (what went wrong, explained kindly)
- Encouragement cards (always finds something you did right)
- Hint cards (tiny nudges in the right direction)
- Break reminders (Pomodoro-style 25-minute alerts)
- Emotion Support cards (responds to your face!)

### 📊 Dashboard (Left Sidebar)
- **Live mood arc** — color-coded 0–100 gauge
- **Session stats**: errors fixed, lines written, repeat errors, time
- **Progress bars**: Focus Level, Code Progress, Confidence
- **Smart Tips**: language-specific tips, auto-rotating

### 🎙 Voice Assistant
- Reads error explanations and encouragement aloud
- Toggle with button or Ctrl+M
- Uses Web Speech API (no external dependency)

### 🌙 Dark / Light Mode
- Fully styled both themes
- Toggle with button or Ctrl+/
- Preference saved to localStorage

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` | Analyze code |
| `Ctrl+S` | Save code |
| `Ctrl+K` | Clear output |
| `Ctrl+/` | Toggle Dark/Light |
| `Ctrl+M` | Toggle Voice |
| `Tab` | Indent (2 spaces) |

---

## 🔧 How the AI Works

### Code Analysis Flow
```
User clicks Analyze
    ↓
Capture current code + language + emotion context
    ↓
Send to Claude API (claude-sonnet-4-20250514)
    ↓
Claude returns structured JSON:
  - hasErrors, errors[], friendly explanations
  - hints (no full solutions!)
  - whatWentWell (always positive)
  - motivation (emotion-aware)
    ↓
Display in Output Console + Feedback Panel
    ↓
Adjust mood score + confidence
```

### Emotion Detection Flow
```
Camera captures frame every 3 seconds
    ↓
Convert to base64 JPEG
    ↓
Send to Claude Vision API with image
    ↓
Claude analyzes facial expression
    ↓
Returns: emotion, confidence, scores{}, tip
    ↓
Update emotion bars + badge + feed
    ↓
Trigger emotion-specific support messages
    ↓
Adjust mood score based on emotion
```

---

## 🌍 Browser Requirements

| Feature | Requirement |
|---|---|
| Camera | Chrome 60+ / Firefox 60+ / Safari 11+ |
| Voice | Chrome 33+ / Edge 14+ |
| Storage | Any modern browser |
| AI Analysis | Internet connection required |

---

## 🔮 Future Improvements

1. **Offline AI** — use a local LLM (Ollama) for full offline support
2. **Code execution** — run JS in sandboxed iframe, Python via Pyodide/WASM
3. **VS Code Extension** — port as extension with same features
4. **Collaborative mode** — real-time pair programming with shared mood
5. **Learning paths** — guided curriculum that adapts to mood/performance
6. **Mobile app** — React Native port with camera support
7. **Teacher dashboard** — monitor class-wide emotion and progress
8. **Better emotion model** — train dedicated on-device ML model (TensorFlow.js + face-api.js)
9. **Code history** — save and replay coding sessions
10. **Multilingual** — support Kannada, Hindi UI for Indian students

---

## 👥 Team

| Name | Dept | Roll |
|---|---|---|
| Vishnu N D | CG | 20 |
| Ashlesh | IS | 47 |
| Manikanta N | CG | 09 |
| Bhimashankar | CG | 05 |
| Basanagouda | CD | 27 |
| Nikil Gowda | CD | 35 |
| Abdullah Rayyan | CD | 22 |
| Abilash | CD | 23 |

**Institution**: Alva's Institute of Engineering and Technology, Moodbidri
**Course**: Innovation and Design Thinking
**Year**: 2026

---

## 📚 References

- Anthropic Claude API — https://docs.anthropic.com
- Web Speech API — MDN Web Docs
- MediaDevices Camera API — MDN Web Docs
- Affective Computing (MIT Media Lab research)
- Research: "Emotion-Aware Learning Systems" — IEEE 2023
- Research: "Impact of Emotional State on Programming Performance" — SIGCSE 2022

---

*ZenCode — Because learning to code should feel like growth, not punishment.* 🌿
