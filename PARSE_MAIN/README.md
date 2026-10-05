# P.A.R.S.E (Packet Analyser and Risk Scoring Engine)

**Theme:** Cybersecurity and Blockchain  
**Problem Statement (PS) No:** SIH26160  
**Team Name:** Terminal  

---

## Live Deployment Links 🚀
- **Frontend (Dashboard):** [https://parse-beige.vercel.app](https://parse-beige.vercel.app)
- **Backend (API):** [https://sih-team-terminal-wlvv.onrender.com](https://sih-team-terminal-wlvv.onrender.com)

---

## About The Project

**P.A.R.S.E** is a full-stack, machine learning-powered cybersecurity tool designed to classify encrypted network traffic (e.g., distinguishing between Web, Video, VoIP, ICMP) based purely on packet statistics, without decrypting the payload. 

It uses a completely decoupled architecture where an **XGBoost Classifier** predicts the traffic type, while a custom **Risk Scoring Engine (RSE)** evaluates anomalies (like mismatching payload sizes vs. packet volumes) to assign a dynamic risk score from 0-100.

### Dataset & ML Training
- **Data Collection:** ~233,870 Total Records. 65% captured from a live Alpine Linux VirtualBox testbed, 35% synthetically generated.
- **The "Noisy" Methodology:** To prevent the model from learning "perfect, unrealistic boundaries", we induced severe chaos into 70% of the dataset (Protocol overlap, IKE jitter, random volume spikes). 
- **Results:** By training on this 70-30 Noisy-Clean distribution via Optuna hyperparameter tuning, the final model achieved an incredibly robust **93.63% Testing Accuracy** (ROC-AUC: ~0.9883).

---

## Architecture Overview

P.A.R.S.E uses a **Cloud-Managed Local Agent** architecture to securely bypass browser sandboxing constraints while maintaining a premium SaaS experience.

1. **Frontend (Vite / React):** The user-facing dashboard where analysts manage captures and review history. Hosted on Vercel.
2. **Backend (FastAPI Cloud C2):** A scalable cloud backend that coordinates active agents via WebSocket tunneling, runs ML parsing on uploaded metadata, and aggregates scores. Hosted on Render via Docker.
3. **Local Agent (ParseAgent.exe):** A lightweight, zero-dependency PyInstaller executable running locally on the analyst's machine. It securely triggers `tshark` to sniff Wi-Fi traffic and streams results back to the cloud.
4. **Database (Supabase):** Handles JWT authentication, Row Level Security, and persists all captured metadata and risk reports.

---

## Prerequisites & Required Downloads

To run P.A.R.S.E locally or use the Local Agent, you **MUST** install the following dependencies:

1. **Wireshark & TShark:** You must install Wireshark on your machine for the local agent to sniff packets.
   - [Download Wireshark](https://www.wireshark.org/download.html) (Ensure `tshark` is selected during installation).
2. **Npcap Driver:** Required for Wireshark to capture raw network traffic on Windows.
   - [Download Npcap](https://npcap.com/)
3. **Node.js:** For running the frontend locally.
   - [Download Node.js](https://nodejs.org/)
4. **Python 3.12+:** For running the backend or agent source code locally.
   - [Download Python](https://www.python.org/downloads/)

---

## Getting Started

### 1. Start the Cloud Backend
For local development, you can run the FastAPI backend natively:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
*Note: The backend requires an active `.env` file containing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SECRET_KEY`.*

### 2. Start the Frontend (Dashboard)
```bash
cd frontend
npm install
npm run dev
```

### 3. Run the Local Agent
End-users download the compiled `ParseAgent.exe` directly from the dashboard UI. For development, you can run the agent manually from the source:
```bash
cd backend
python agent.py
```
*Note: Ensure you have administrator rights to allow Npcap to bind to your network adapters.*

---

*Built with 💻 by Team Terminal for SIH26160*
