# P.A.R.S.E (Packet Analyser and Risk Scoring Engine)

**Theme:** Cybersecurity and Blockchain  
**Problem Statement (PS) No:** SIH26160  
**Team Name:** Team Terminal  

---

## About The Project

**P.A.R.S.E** is a full-stack, machine learning-powered cybersecurity tool designed to peer into the "black box" of encrypted network traffic. By analyzing payload-agnostic metadata (packet counts, timing, and protocol distributions), P.A.R.S.E accurately classifies and scores the risk of live network traffic without ever needing to decrypt the payload.

Originally built as a standalone XGBoost script, P.A.R.S.E has evolved into a robust distributed architecture featuring a premium React frontend and a cloud-ready, hardware-bound local agent.

### Key Features
* **Zero-Trust Hardware Binding:** Implements strict MAC-address locking. Users are completely locked out of the application until their physical hardware is manually verified and bound to their account.
* **Live Packet Capture:** Securely triggers local `tshark` instances from the web interface, seamlessly analyzing active Wi-Fi traffic.
* **Real-time Risk Engine:** Feeds captured packet statistics into a dynamic XGBoost engine to accurately classify traffic (Web, VoIP, ICMP, Video) and assign live risk scores.
* **Premium Dashboard:** A modern, glassmorphism-inspired React dashboard featuring micro-animations, bento-box layouts, and real-time capture telemetry.
* **Robust Security:** Fortified with strict Rate Limiting (`slowapi`), Row Level Security (Supabase), and anti-brute-force UI cooldown timers.

---

## Architecture Overview

P.A.R.S.E is designed with a **Cloud-Managed Local Agent** architecture to securely bypass browser sandboxing constraints while maintaining a premium SaaS experience.

1. **Frontend (Vite / React):** The user-facing dashboard where analysts manage captures and review history.
2. **Backend / Local Agent (FastAPI):** A headless Python script running locally on the analyst's machine. It handles raw socket execution (`tshark`), reads physical MAC addresses, and runs the XGBoost model.
3. **Database (Supabase):** Handles JWT authentication, Row Level Security, and persists all captured metadata and risk reports.

---

## Getting Started

### Prerequisites
* **Node.js** (for the frontend)
* **Python 3** (for the backend local agent)
* **TShark** / Wireshark installed and added to your system PATH
* **Npcap** installed for raw socket capturing

### 1. Start the Backend (Local Agent)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
*The backend will boot up on `http://localhost:8000`. It requires an active `.env` file containing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY`.*

### 2. Start the Frontend (Dashboard)
```bash
cd frontend
npm install
npm run dev
```
*The frontend will boot up on `http://localhost:5173`.*

---

*Built with 💻 by Team Terminal for SIH26160*
