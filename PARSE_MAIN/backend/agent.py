import os
import time
import json
import asyncio
import requests
import websockets
import subprocess

# Configuration
BACKEND_WS_URL = "wss://sih-team-terminal.onrender.com/api/agent/ws"
BACKEND_UPLOAD_URL = "https://sih-team-terminal.onrender.com/api/capture/upload"
PCAP_FILENAME = "agent_capture.pcap"

capture_process = None

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
                if 'wifi' in desc or 'wi-fi' in desc:
                    return idx
                if 'ethernet' in desc and not ethernet_match:
                    ethernet_match = idx
        if ethernet_match:
            return ethernet_match
    except Exception as e:
        print(f"Failed to detect active interface: {e}")
    return None

async def listen_for_commands():
    global capture_process
    print(f"[*] Connecting to Cloud C2: {BACKEND_WS_URL}...")
    
    while True:
        try:
            async with websockets.connect(BACKEND_WS_URL) as websocket:
                print("[+] Connected successfully. Awaiting commands.")
                
                async for message in websocket:
                    data = json.loads(message)
                    command = data.get("command")
                    
                    if command == "start":
                        if capture_process is not None:
                            print("[!] Capture already running.")
                            continue
                            
                        print("[*] Received START command. Initiating local packet sniff...")
                        if os.path.exists(PCAP_FILENAME):
                            os.remove(PCAP_FILENAME)
                            
                        tshark_path = get_tshark_path()
                        interface = get_active_interface()
                        
                        if interface:
                            cmd = [tshark_path, "-i", interface, "-w", PCAP_FILENAME, "-q"]
                        else:
                            cmd = [tshark_path, "-w", PCAP_FILENAME, "-q"]
                            
                        capture_process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        print("[+] Sniffing active.")
                        
                    elif command == "stop":
                        if capture_process is None:
                            print("[!] No active capture to stop.")
                            continue
                            
                        print("[*] Received STOP command. Halting sniff and uploading...")
                        capture_process.terminate()
                        try:
                            capture_process.wait(timeout=5)
                        except subprocess.TimeoutExpired:
                            capture_process.kill()
                            
                        capture_process = None
                        
                        # Upload to cloud backend
                        if os.path.exists(PCAP_FILENAME):
                            try:
                                with open(PCAP_FILENAME, "rb") as f:
                                    res = requests.post(BACKEND_UPLOAD_URL, files={"file": f})
                                print(f"[+] Upload complete: {res.json()}")
                            except Exception as e:
                                print(f"[-] Upload failed: {e}")
                            finally:
                                os.remove(PCAP_FILENAME)
                        
        except Exception as e:
            print(f"[-] Connection lost: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    print("""
=================================================
  P.A.R.S.E - LOCAL PACKET AGENT (HEADLESS)
=================================================
""")
    try:
        asyncio.run(listen_for_commands())
    except KeyboardInterrupt:
        print("\n[*] Shutting down Agent.")
