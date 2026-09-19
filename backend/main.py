import os
import sys
import ctypes
import subprocess
import json
import uuid
import asyncio
from datetime import datetime
import pandas as pd
import pyshark
import xgboost as xgb
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
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
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize ML Model
model = None
le_classes = None
try:
    model = xgb.XGBClassifier()
    # Path is relative to the backend folder
    model_path = os.path.join(os.path.dirname(__file__), 'xgboost_model.json')
    classes_path = os.path.join(os.path.dirname(__file__), 'label_encoder_classes.json')
    model.load_model(model_path)
    with open(classes_path, 'r') as f:
        le_classes = json.load(f)
except Exception as e:
    print(f"Warning: Could not load XGBoost model. Using dummy predictions. Error: {e}")

capture_process = None
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

def get_active_interface():
    try:
        tshark_path = get_tshark_path()
        output = subprocess.check_output([tshark_path, "-D"], text=True)
        ethernet_match = None
        for line in output.split('\n'):
            line = line.strip()
            if not line: continue
            parts = line.split('.', 1)
            if len(parts) == 2:
                idx = parts[0].strip()
                desc = parts[1].lower()
                # Prioritize Wi-Fi adapter
                if 'wifi' in desc or 'wi-fi' in desc:
                    return idx
                # Fallback to Ethernet
                if 'ethernet' in desc and not ethernet_match:
                    ethernet_match = idx
        if ethernet_match:
            return ethernet_match
    except Exception as e:
        print(f"Failed to detect active interface: {e}")
    return None

@app.on_event("startup")
async def startup_event():
    if os.name == 'nt' and not is_admin():
        print("WARNING: Backend is not running as Administrator. Packet capture may fail if Npcap is restricted.")

@app.get("/api/hardware-id")
@limiter.limit("10/minute")
def get_hardware_id(request: Request):
    mac_num = uuid.getnode()
    mac = ':'.join(('%012X' % mac_num)[i:i+2] for i in range(0, 12, 2)).upper()
    return {"mac_address": mac}

def extract_token(request: Request):
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth.split(" ")[1]
    return None

@app.post("/api/capture/start")
@limiter.limit("5/minute")
def start_capture(request: Request):
    global capture_process
    if capture_process is not None:
        raise HTTPException(status_code=400, detail="Capture is already running.")
    
    # Remove old pcap if exists
    if os.path.exists(pcap_filename):
        os.remove(pcap_filename)
        
    try:
        # Start tshark
        tshark_path = get_tshark_path()
        interface = get_active_interface()
        
        if interface:
            print(f"Starting capture on interface: {interface}")
            cmd = [tshark_path, "-i", interface, "-w", pcap_filename, "-q"]
        else:
            print("Starting capture on default interface")
            cmd = [tshark_path, "-w", pcap_filename, "-q"]
            
        capture_process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return {"status": "started", "message": "Packet capture started."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start tshark: {e}")

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

        cap = pyshark.FileCapture(pcap_filename, tshark_path=tshark_path)
        packet_count = 0
        ike_packet_count = 0
        esp_packet_count = 0
        plain_icmp_count = 0
        pcap_size_bytes = os.path.getsize(pcap_filename)
        
        for pkt in cap:
            packet_count += 1
            if hasattr(pkt, 'icmp'):
                plain_icmp_count += 1
            if hasattr(pkt, 'isakmp') or hasattr(pkt, 'ike'):
                ike_packet_count += 1
            if hasattr(pkt, 'esp'):
                esp_packet_count += 1
                
            # Update progress dynamically
            if packet_count % 5 == 0:
                processing_state["progress"] = min(95, int((packet_count / total_packets) * 100))
                
        cap.close()
    except Exception as e:
        print(f"Error reading pcap: {e}")
        processing_state["status"] = "error"
        processing_state["error_detail"] = f"Failed to read capture file: {str(e)}"
        return
        
    processing_state["progress"] = 95
    # Feature extraction
    features = {
        "packet_count": packet_count,
        "ike_packet_count": ike_packet_count,
        "esp_packet_count": esp_packet_count,
        "plain_icmp_count": plain_icmp_count,
        "pcap_size_bytes": pcap_size_bytes
    }
    
    traffic_type = "unknown"
    
    # Predict using model (XGBoost ONLY classifies the type)
    if model and le_classes:
        try:
            df = pd.DataFrame([features])
            pred_idx = model.predict(df)[0]
            traffic_type = le_classes[pred_idx]
        except Exception as e:
            print(f"Error during prediction: {e}")
            traffic_type = "unknown"
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
        "mode": "live",
        "ike_version": "N/A",
        "cipher": "N/A",
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
def stop_capture(request: Request, background_tasks: BackgroundTasks):
    global capture_process
    if capture_process is None:
        raise HTTPException(status_code=400, detail="Capture is not running.")
        
    # Terminate tshark
    capture_process.terminate()
    try:
        capture_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        capture_process.kill()
        
    capture_process = None
    
    token = extract_token(request)
    background_tasks.add_task(process_pcap_and_score, token)
        
    return {"status": "processing_started"}

@app.get("/api/progress")
@limiter.limit("5/second")
def get_progress(request: Request):
    global processing_state
    return processing_state

@app.get("/api/status")
@limiter.limit("10/minute")
def get_status(request: Request):
    global capture_process
    is_running = capture_process is not None
    return {"is_running": is_running}
