# DebriSense

Predictive Debris Risk Monitoring System for Malaysian Rivers

## Overview
DebriSense is a web-based dashboard that predicts debris accumulation in Malaysian rivers using a Debris Risk Index (DRI) - a weighted index system modeled after Malaysia's Department of Environment (DOE) Water Quality Index (WQI).

**Important:** This system does NOT use machine learning or AI. It uses a transparent, rule-based weighted index calculation.

## Quick Start

### Installation

1. Create a virtual environment:
```bash
python -m venv .venv
```

2. Activate the virtual environment:
- Windows: `.venv\Scripts\activate`
- Mac/Linux: `source .venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

### Running the Application

```bash
python app.py
```

The application will be available at `http://localhost:5000`

## Features
- Interactive Leaflet.js map showing Malaysian rivers
- Responsive design (mobile, tablet, desktop)
- Real-time debris risk monitoring
- DRI-powered predictions

## Technology Stack
- **Backend:** Python Flask
- **Frontend:** HTML5, CSS3, JavaScript, Leaflet.js
- **Maps:** OpenStreetMap via Leaflet

## Rivers Monitored
- Sungai Klang (Kuala Lumpur)
- Sungai Pinang (Penang)
- Sungai Inanam (Sabah)

