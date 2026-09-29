import os
import sys
import ctypes
import subprocess
import json
import uuid
import asyncio
from datetime import datetime
import pandas as pd
import xgboost as xgb
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

load_dotenv()

app = FastAPI(title="P.A.R.S.E Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Initialize Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY) if SUPABASE_URL and SUPABASE_ANON_KEY else None
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY) if SUPABASE_URL and SUPABASE_SECRET_KEY else None

# Initialize ML Models
model = None
le_classes = None
model_mode = None
le_classes_mode = None
model_cipher = None
le_classes_cipher = None

try:
    model = xgb.XGBClassifier()
    model_path = os.path.join(os.path.dirname(__file__), 'xgboost_model.json')
    classes_path = os.path.join(os.path.dirname(__file__), 'label_encoder_classes.json')
    if os.path.exists(model_path):
        model.load_model(model_path)
        with open(classes_path, 'r') as f:
            le_classes = json.load(f)
        
    model_mode = xgb.XGBClassifier()
    model_mode_path = os.path.join(os.path.dirname(__file__), 'xgboost_model_mode.json')
    classes_mode_path = os.path.join(os.path.dirname(__file__), 'label_encoder_mode.json')
    if os.path.exists(model_mode_path):
        model_mode.load_model(model_mode_path)
        with open(classes_mode_path, 'r') as f:
            le_classes_mode = json.load(f)
            
    model_cipher = xgb.XGBClassifier()
    model_cipher_path = os.path.join(os.path.dirname(__file__), 'xgboost_model_cipher.json')
    classes_cipher_path = os.path.join(os.path.dirname(__file__), 'label_encoder_cipher.json')
    if os.path.exists(model_cipher_path):
        model_cipher.load_model(model_cipher_path)
        with open(classes_cipher_path, 'r') as f:
            le_classes_cipher = json.load(f)
            
except Exception as e:
    print(f"Warning: Could not load XGBoost models. Using dummy predictions. Error: {e}")

active_agent_ws = None
current_token = None
capture_is_running = False
pcap_filename = os.path.join(os.path.dirname(__file__), "temp_capture.pcap")

processing_state = {
    "status": "idle",
    "progress": 0,
    "result": None,
    "error_detail": None
}

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def get_tshark_path():
    import shutil
    if shutil.which("tshark"):
        return "tshark"
    if os.name == 'nt' and os.path.exists(r"C:\Program Files\Wireshark\tshark.exe"):
        return r"C:\Program Files\Wireshark\tshark.exe"
    raise Exception("tshark executable not found. Please ensure Wireshark is installed.")

@app.websocket("/api/agent/ws")
async def websocket_endpoint(websocket: WebSocket):
    global active_agent_ws
    await websocket.accept()
    active_agent_ws = websocket
    print("[+] Local Agent connected via WebSocket")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        print("[-] Local Agent disconnected")
        if active_agent_ws == websocket:
            active_agent_ws = None

@app.on_event("startup")
async def startup_event():
    if os.name == 'nt' and not is_admin():
        print("WARNING: Backend is not running as Administrator. Packet capture may fail if Npcap is restricted.")

def extract_token(request: Request):
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth.split(" ")[1]
    return None

@app.post("/api/capture/start")
@limiter.limit("5/minute")
async def start_capture(request: Request):
    global active_agent_ws, capture_is_running
    if not active_agent_ws:
        raise HTTPException(status_code=400, detail="No active Local Agent connected. Please launch agent.py locally.")
    
    processing_state["status"] = "idle"
    processing_state["progress"] = 0
    processing_state["error_detail"] = None
    capture_is_running = True
    
    try:
        await active_agent_ws.send_json({"command": "start"})
        return {"status": "started", "message": "Command sent to Local Agent."}
    except Exception as e:
        capture_is_running = False
        raise HTTPException(status_code=500, detail=f"Agent communication failed: {e}")

def calculate_risk_score(traffic_type, features):
    score = 0
    packet_count = features.get("packet_count", 0)
    pcap_size_bytes = features.get("pcap_size_bytes", 0)
    icmp_count = features.get("plain_icmp_count", 0)
    esp_count = features.get("esp_packet_count", 0)
    
    avg_packet_size = pcap_size_bytes / packet_count if packet_count > 0 else 0
    
    # Baseline risk based on identified traffic profile
    if traffic_type == "icmp":
        score += 40
        # Anomalous ICMP Volume (Ping Flood / Sweep)
        if icmp_count > 50:
            score += 50
        elif icmp_count > 10:
            score += 25
    elif traffic_type == "voip":
        score += 20
        # Voip packets should be small UDP streams; large packets indicate tunneling/exfiltration
        if avg_packet_size > 800:
            score += 45
    elif traffic_type == "video":
        score += 5
        # High volume video is normal, but flag if it's mixed with strange VPN/ESP fragments
        if esp_count > 5:
            score += 35
    elif traffic_type == "web":
        score += 10
        # High packet count but tiny average payload suggests DOS/SYN flood mimicking web traffic
        if packet_count > 500 and avg_packet_size < 120:
            score += 65
            
    # Cap score boundaries
    return max(0, min(100, int(score)))

def process_pcap_and_score(token: str = None):
    global capture_process, processing_state
    
    processing_state["status"] = "processing"
    processing_state["progress"] = 0
    processing_state["result"] = None
    processing_state["error_detail"] = None
    
    # Process the pcap
    if not os.path.exists(pcap_filename):
        print("Error: PCAP file not found. Tshark failed to capture.")
        processing_state["status"] = "error"
        processing_state["error_detail"] = "Live capture failed. You must install the Npcap driver from https://npcap.com/ for Wireshark to sniff Windows network interfaces."
        return

    try:
        # Pyshark requires an event loop, which might be missing in FastAPI's background thread
        try:
            asyncio.get_event_loop()
        except RuntimeError:
            asyncio.set_event_loop(asyncio.new_event_loop())

        tshark_path = get_tshark_path()
        capinfos_path = tshark_path.replace("tshark.exe", "capinfos.exe") if os.name == 'nt' else tshark_path.replace("tshark", "capinfos")
        
        total_packets = 1000 # Fallback estimate
        if os.path.exists(capinfos_path):
            try:
                output = subprocess.check_output([capinfos_path, "-c", pcap_filename], text=True)
                for line in output.split('\n'):
                    if "Number of packets:" in line:
                        total_packets = int(line.split(":")[1].strip())
                        break
            except Exception:
                pass

        packet_count = 0
        ike_packet_count = 0
        esp_packet_count = 0
        plain_icmp_count = 0
        pcap_size_bytes = os.path.getsize(pcap_filename)
        
        cmd = [tshark_path, "-r", pcap_filename, "-T", "fields", "-e", "frame.protocols"]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
        
        for line in process.stdout:
            packet_count += 1
            protocols = line.strip()
            
            if 'icmp' in protocols:
                plain_icmp_count += 1
            if 'isakmp' in protocols or 'ike' in protocols:
                ike_packet_count += 1
            if 'esp' in protocols:
                esp_packet_count += 1
                
            # Update progress dynamically (less frequent to save CPU)
            if packet_count % 500 == 0:
                processing_state["progress"] = min(95, int((packet_count / max(total_packets, 1)) * 100))
                
        process.wait()
    except Exception as e:
        print(f"Error reading pcap: {e}")
        processing_state["status"] = "error"
        processing_state["error_detail"] = f"Failed to read capture file: {str(e)}"
        return
        
    processing_state["progress"] = 95
    # Feature extraction
    avg_packet_size = pcap_size_bytes / max(packet_count, 1)
    esp_ratio = esp_packet_count / max(packet_count, 1)
    ike_ratio = ike_packet_count / max(packet_count, 1)
    
    features = {
        "packet_count": packet_count,
        "ike_packet_count": ike_packet_count,
        "esp_packet_count": esp_packet_count,
        "plain_icmp_count": plain_icmp_count,
        "pcap_size_bytes": pcap_size_bytes,
        "avg_packet_size": avg_packet_size,
        "esp_ratio": esp_ratio,
        "ike_ratio": ike_ratio
    }
    
    traffic_type = "unknown"
    predicted_mode = "N/A"
    predicted_cipher = "N/A"
    
    # Predict using model (XGBoost ONLY classifies the type)
    if model and le_classes:
        try:
            df = pd.DataFrame([features])
            pred_idx = model.predict(df[['packet_count', 'ike_packet_count', 'esp_packet_count', 'plain_icmp_count', 'pcap_size_bytes']])[0]
            traffic_type = le_classes[pred_idx]
        except Exception as e:
            print(f"Error during prediction: {e}")
            traffic_type = "unknown"
            
    if model_mode and le_classes_mode:
        try:
            df_mode = pd.DataFrame([features])
            pred_idx_mode = model_mode.predict(df_mode)[0]
            predicted_mode = le_classes_mode[pred_idx_mode]
        except Exception as e:
            print(f"Error during mode prediction: {e}")

    if model_cipher and le_classes_cipher:
        try:
            df_cipher = pd.DataFrame([features])
            pred_idx_cipher = model_cipher.predict(df_cipher)[0]
            predicted_cipher = le_classes_cipher[pred_idx_cipher]
        except Exception as e:
            print(f"Error during cipher prediction: {e}")
    else:
        # Dummy prediction (if model file is missing)
        if plain_icmp_count > 10:
            traffic_type = "icmp"
        elif esp_packet_count > 0:
            traffic_type = "voip"
        elif packet_count > 500:
            traffic_type = "video"
        else:
            traffic_type = "web"
            
    # Risk Scoring Engine (RSE) - Totally dependent on backend logic, independent of XGBoost
    risk_score = calculate_risk_score(traffic_type, features)

    # Prepare metadata for Supabase
    metadata = {
        "filename": "live_capture.pcap",
        "config_id": "live_" + str(uuid.uuid4())[:8],
        "repeat_id": 1,
        "mode": predicted_mode if predicted_mode != "N/A" else "live",
        "ike_version": "N/A",
        "cipher": predicted_cipher,
        "dh_group": "N/A",
        "pfs": "N/A",
        "traffic_type": traffic_type,
        "capture_type": "live",
        "packet_count": packet_count,
        "ike_packet_count": ike_packet_count,
        "esp_packet_count": esp_packet_count,
        "plain_icmp_count": plain_icmp_count,
        "pcap_size_bytes": pcap_size_bytes,
        "status": "success",
        "risk_score": risk_score,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Upload to Supabase
    if supabase:
        try:
            if token:
                # Set the user JWT to respect RLS
                supabase.postgrest.auth(token)
            # Push to Supabase using the admin client (Secret Key) to bypass RLS
            if supabase_admin:
                res = supabase_admin.table('packet_metadata').insert(metadata).execute()
            else:
                res = supabase.table('packet_metadata').insert(metadata).execute()
            print("Data synced to Supabase:", res)
        except Exception as e:
            print(f"Failed to push to Supabase: {e}")
            
    # Cleanup temporary pcap for safety/privacy
    if os.path.exists(pcap_filename):
        os.remove(pcap_filename)
        
    processing_state["progress"] = 100
    processing_state["result"] = metadata
    processing_state["status"] = "completed"
    
    return metadata

@app.post("/api/capture/stop")
@limiter.limit("5/minute")
async def stop_capture(request: Request):
    global active_agent_ws, current_token, capture_is_running
    if not active_agent_ws:
        capture_is_running = False
        raise HTTPException(status_code=400, detail="No active Local Agent connected.")
        
    processing_state["status"] = "uploading"
    current_token = extract_token(request)
    capture_is_running = False
    
    try:
        await active_agent_ws.send_json({"command": "stop"})
        return {"status": "processing_started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent communication failed: {e}")

@app.post("/api/capture/upload")
async def upload_capture(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    global current_token
    with open(pcap_filename, "wb") as f:
        f.write(await file.read())
        
    background_tasks.add_task(process_pcap_and_score, current_token)
    return {"status": "success"}

@app.get("/api/progress")
@limiter.limit("5/second")
def get_progress(request: Request):
    global processing_state
    return processing_state

@app.get("/api/agent/download")
def download_agent():
    agent_path = os.path.join(os.path.dirname(__file__), "dist", "ParseAgent.exe")
    if os.path.exists(agent_path):
        return FileResponse(agent_path, filename="ParseAgent.exe")
    raise HTTPException(status_code=404, detail="Agent executable not found. Please compile it first.")

@app.get("/api/status")
@limiter.limit("10/minute")
def get_status(request: Request):
    global capture_is_running
    return {"is_running": capture_is_running}
