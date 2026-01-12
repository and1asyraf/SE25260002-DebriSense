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

## Technology Stack
- **Backend:** Python Flask
- **Frontend:** HTML5, CSS3, JavaScript, Leaflet.js
- **Maps:** OpenStreetMap via Leaflet
- **AI Assistant:** Interactive Chatbot Module

## Key Features
- 🗺️ **Interactive Map Dashboard** - Real-time river monitoring with DRI visualization
- 📊 **Debris Risk Index (DRI)** - Transparent, rule-based weighted scoring system
- 🏢 **NGO Tools** - Report debris, request locations, export data, manage watchlist
- 👑 **Admin Panel** - Manage locations, users, reports, and requests
- 🤖 **AI Chatbot Assistant** - Context-aware help across all dashboards
- 🗂️ **Report Management** - Hotspot reports with filtering, viewing, and CSV export
- 📱 **Fully Responsive** - Optimized for desktop, tablet, and mobile devices
