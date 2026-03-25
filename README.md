# Vision 

## Overview

`Vision` is a real-time network detection bridge focused on Wi-Fi and BLE scanning with heuristic anomaly scoring.  
- FastAPI backend with WebSocket endpoint (`/ws`)
- BLE scanning via `bleak`
- Wi-Fi scanning via `pywifi` (Windows) + optional `termux-wifi-scaninfo` support
- Manufacturer OUI resolution for devices (`get_manufacturer`)
- Anomaly support via `AnomalyEngine` (baseline onboarding + threat flag = `red`)

## Features

- `GET`-style periodic scanning loop
- Real-time broadcast to connected clients
- Combined `wifi + ble` nodes in `payload['nodes']`
- `stats`: total, threats, mapping status
- 5-second refresh interval

## Compatibility

- Windows 10+ (primary coverage via `pywifi`)
- Android/Termux via `termux-wifi-scaninfo` (Linux mode)
- BLE support across system-managed BLE stacks via `bleak` (`Windows` / `Linux` / `Mac`)
- Python 3.10+

---

## Installation

1. Clone:
   - `git clone <repo-url>`
   - `cd Vision`
2. Create env:
   - `python -m venv venv`
   - `venv\\Scripts\\activate` (Windows)
   - `source venv/bin/activate` (Linux/macOS)
3. Install deps:
   - `pip install -r requirements.txt`
   - if none, add:
     - `pip install fastapi uvicorn pywifi bleak`
4. Termux (if needed):
   - `pkg install termux-api`
   - `termux-wifi-scaninfo` permission allowed

---

## Run

```bash
uvicorn bridge:app --host 127.0.0.1 --port 5000
```

or

```bash
python bridge.py
```

Then connect to WS:
- `ws://127.0.0.1:5000/ws`

---

## API / Payload

`/ws`: websocket streaming JSON object every 5s:

- `timestamp`: e.g. `14:25:06`
- `nodes`: list of devices
  - `id`, `ssid`, `rssi`, `mfg`, `type` (`wifi`/`ble`), `status` (`green`/`red`)
- `stats`
  - `total`, `threats`, `mapping`

---

## Notes

- Fixes applied: `get_wifi_scan` structured correctly, `Windows` and `else` flows are separated, no duplicate except blocks.
- Improvements suggested:
  - Add `asyncio.to_thread` around blocking scan operations
  - persistent configuration / MSI OUI file load
  - error log file rather than `print` for production

---

## Troubleshooting

- `pywifi` fails on macOS: use mac-based Wi-Fi tools or move to Termux/Linux.
- BLE failure: check adapter is up and powered.
- `termux-wifi-scaninfo` not found: enable termux-api addon.
- `uvicorn` error: ensure Python 3.10+ and dependencies installed.