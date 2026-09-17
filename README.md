# P.A.R.S.E (Packet Analyser and Risk Scoring Engine)

**Theme:** Cybersecurity and Blockchain  
**Problem Statement (PS) No:** SIH26160  
**Team Name:** Team Terminal  

---

## About The Project

**P.A.R.S.E** (Packet Analyser and Risk Scoring Engine) is an advanced machine learning powered security tool designed to peer into the "black box" of encrypted network traffic. 

As encryption protocols like IPsec (IKEv1/IKEv2) become the standard for privacy, malicious actors increasingly hide within these encrypted tunnels, bypassing traditional deep packet inspection (DPI). **P.A.R.S.E solves this by classifying network behavior purely based on packet statistics, timing, and sizes without ever needing to decrypt the payload.**

Whether traffic is mundane Web Browsing, heavy Video Streaming, or potentially suspicious bursts of ICMP or VoIP packets hidden inside a VPN tunnel, P.A.R.S.E can accurately identify it and score its underlying risk profile.

### Key Features
*   **Decryption Free Analysis:** Utilizes payload agnostic metadata (`packet_count`, `pcap_size_bytes`, `esp_packet_count`) to classify encrypted ESP traffic.
*   **Robust ML Core:** Powered by highly optimized **XGBoost**.
*   **Dynamic Hyperparameter Tuning:** Integrates **Optuna** to autonomously hunt for the optimal learning parameters for specific network environments.
*   **Battle Tested Dataset:** Trained on a massive 233,000+ record dataset. To ensure real world viability, the model is trained on a 70:30 mix of highly noisy, overlapping data versus clean, lab generated baseline metrics originating from an Alpine Linux VirtualBox testbed.

---

## How It Works (The ML Pipeline)

1.  **Data Ingestion:** P.A.R.S.E ingests `.pcap` capture statistics and parses out configurations (Cipher, Mode, PFS) alongside packet volumes.
2.  **Preprocessing:** Data is dynamically label encoded and prepared for algorithmic ingestion.
3.  **Optuna Tuning:** The system runs exhaustive simulated epochs to find the exact hyperparameters needed to isolate overlapping traffic behaviors.
4.  **Classification:** The XGBoost model classifies the traffic into logical buckets (Web, Video, Email, VoIP, ICMP) achieving **93%+ Real World Accuracy** and an exceptional **0.98+ ROC AUC** confidence score.

---

## Getting Started

### Prerequisites
Make sure you have Python 3 installed. You can install all the required libraries in one go:
```bash
pip install -r requirements.txt
```

### Running the Engine
To launch the P.A.R.S.E model and initiate the hyperparameter tuning and training evaluation sequence:
```bash
python model.py
```
*(The script will automatically load the `combined_dataset.csv`, evaluate the data, and output a highly detailed Performance Metrics report.)*

---

*Built with by Team Terminal for SIH26160*
