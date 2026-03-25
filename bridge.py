import asyncio
import json
import platform
import subprocess
import time
from fastapi import FastAPI, WebSocket
from bleak import BleakScanner
import pywifi

app = FastAPI()

# --- THE MANUFACTURER ENGINE ---
# Common OUIs for immediate identification. 
# For a full list, SØPHIA usually ships with a 5MB 'oui.json'
COMMON_OUIS = {
    "00:03:7F": "Atheros",
    "00:0C:E7": "Apple",
    "00:16:B4": "Apple",
    "00:17:F2": "Apple",
    "00:25:CA": "Cisco Meraki",
    "3C:A6:2F": "Apple",
    "54:47:E8": "Intel",
    "5E:8C:30": "LG Electronics",
    "8C:C7:C3": "Samsung",
    "D4:E5:F6": "Netgear",
    "F8:0D:A9": "Airtel/Nokia",
}

def get_manufacturer(mac):
    """Resolves MAC prefix to Manufacturer Name."""
    prefix = mac.upper()[:8] # First 8 chars: XX:XX:XX
    return COMMON_OUIS.get(prefix, "Unknown Vendor")

# --- THE ANOMALY ENGINE (Same as before) ---
class AnomalyEngine:
    def __init__(self):
        self.baseline = set()
        self.mapping_complete = False
        self.start_time = time.time()

    def process_node(self, bssid):
        if not self.mapping_complete:
            self.baseline.add(bssid)
            if time.time() - self.start_time > 60:
                self.mapping_complete = True
            return "green"
        return "green" if bssid in self.baseline else "red"

engine = AnomalyEngine()

# --- SCANNING LOGIC (Updated with MFG) ---
async def get_wifi_scan():
    detected_wifi = {}  # Use a dict to enforce unique BSSIDs
    try:
        if platform.system() == "Windows":
            wifi = pywifi.PyWiFi()
            iface = wifi.interfaces()[0]
            iface.scan()
            time.sleep(2)
            for network in iface.scan_results():
                # Only keep the strongest signal for each MAC address
                if network.bssid not in detected_wifi or network.signal > detected_wifi[network.bssid]['rssi']:
                    detected_wifi[network.bssid] = {
                        "id": network.bssid,
                        "ssid": network.ssid or "[hidden]",
                        "rssi": network.signal,
                        "mfg": get_manufacturer(network.bssid),
                        "type": "wifi",
                        "status": engine.process_node(network.bssid)
                    }
        else:
            # TERMUX / Linux Mode
            result = subprocess.run(['termux-wifi-scaninfo'], capture_output=True, text=True)
            data = json.loads(result.stdout or '[]')
            for net in data:
                bssid = net.get('bssid')
                if not bssid:
                    continue
                rssi = net.get('rssi', -999)
                if bssid not in detected_wifi or rssi > detected_wifi[bssid]['rssi']:
                    detected_wifi[bssid] = {
                        "id": bssid,
                        "ssid": net.get('ssid') or "[hidden]",
                        "rssi": rssi,
                        "mfg": get_manufacturer(bssid),
                        "type": "wifi",
                        "status": engine.process_node(bssid)
                    }
    except Exception as e:
        print(f"Wi-Fi Error: {e}")

    return list(detected_wifi.values())

async def get_ble_scan():
    nodes = []
    try:
        devices = await BleakScanner.discover()
        for d in devices:
            nodes.append({
                "id": d.address,
                "ssid": d.name or "Unknown BLE",
                "rssi": d.rssi,
                "mfg": get_manufacturer(d.address), # Added MFG lookup
                "type": "ble",
                "status": engine.process_node(d.address)
            })
    except Exception as e: print(f"BLE Error: {e}")
    return nodes

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        wifi_nodes = await get_wifi_scan()
        ble_nodes = await get_ble_scan()
        all_nodes = wifi_nodes + ble_nodes
        
        payload = {
            "timestamp": time.strftime("%H:%M:%S"),
            "nodes": all_nodes,
            "stats": {
                "total": len(all_nodes),
                "threats": len([n for n in all_nodes if n['status'] == 'red']),
                "mapping": not engine.mapping_complete
            }
        }
        await websocket.send_json(payload)
        await asyncio.sleep(5)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)