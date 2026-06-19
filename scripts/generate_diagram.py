import urllib.request
import json

mermaid_code = """
flowchart TD
    %% Define Styles
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef database fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;
    classDef external fill:#8b5cf6,stroke:#5b21b6,stroke-width:2px,color:#fff;

    %% Client / Frontend (Vercel)
    subgraph Client ["Frontend (Next.js / Vercel)"]
        UI_Login["User Login & Auth"]
        UI_Profile["Profile Setup Survey"]
        UI_Upload["Upload Screen Time Image"]
        UI_Dash["Dashboard & Results UI"]
        UI_Plant["Gamified Plant Visualization"]
    end

    %% Backend Server (Local / Ngrok)
    subgraph Server ["Backend API (FastAPI / Uvicorn + Ngrok)"]
        API_Extract["/api/extract (Data Extraction)"]
        API_Predict["/api/predict (Risk Analysis)"]
        
        subgraph ML_Pipeline ["Machine Learning Pipeline"]
            Model_XGBoost["XGBoost (Risk Level Prediction)"]
            Model_SHAP["SHAP (Feature Importance Drivers)"]
            Model_KMeans["KMeans (Persona Clustering)"]
            Model_Rules["Rule-based Recommendations"]
        end
    end

    %% External APIs & Services
    subgraph External ["External Services"]
        Supabase["Supabase (PostgreSQL + Auth)"]
        Gemini["Google Gemini 2.5 Vision API"]
    end

    %% --- Flow Connections ---

    %% User Flow
    UI_Login -- 1. Authenticates --> Supabase
    UI_Profile -- 2. Saves Base Profile Data --> Supabase
    UI_Upload -- 3. Sends Image via API --> API_Extract

    %% Extraction Flow
    API_Extract -- 4. Forwards Image for Analysis --> Gemini
    Gemini -- 5. Returns JSON Usage Data --> API_Extract
    API_Extract -- 6. Returns Extracted Data --> UI_Dash

    %% Prediction Flow
    UI_Dash -- 7. Sends Usage & Profile Data --> API_Predict
    API_Predict --> Model_XGBoost
    API_Predict --> Model_KMeans
    Model_XGBoost --> Model_SHAP
    Model_XGBoost --> Model_Rules
    
    Model_XGBoost -. "Risk: Low/Mod/High" .-> API_Predict
    Model_SHAP -. "Key Drivers" .-> API_Predict
    Model_KMeans -. "Doom Scroller, etc." .-> API_Predict
    Model_Rules -. "Actionable Advice" .-> API_Predict

    API_Predict -- 8. Returns Unified Results --> UI_Dash

    %% UI Update Flow
    UI_Dash -- 9. Triggers Growth/Wilt state --> UI_Plant
    UI_Dash -- 10. Saves History & Feedback --> Supabase

    %% Apply Styles
    class UI_Login,UI_Profile,UI_Upload,UI_Dash,UI_Plant frontend;
    class API_Extract,API_Predict,Model_XGBoost,Model_SHAP,Model_KMeans,Model_Rules backend;
    class Supabase database;
    class Gemini external;
"""

print("Requesting SVG from Kroki.io...")
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Content-Type': 'application/json'}
payload = json.dumps({
    "diagram_source": mermaid_code,
    "diagram_type": "mermaid",
    "output_format": "svg"
}).encode('utf-8')

req = urllib.request.Request("https://kroki.io/", data=payload, headers=headers)
import urllib.error
try:
    with urllib.request.urlopen(req) as response:
        svg_data = response.read()
        output_path = r"d:\Digital-Detach\docs\Architecture_Flow.svg"
        with open(output_path, "wb") as f:
            f.write(svg_data)
        print(f"Successfully saved SVG to {output_path}")
except urllib.error.HTTPError as e:
    print(f"Kroki error: {e.read().decode()}")

print("Requesting PNG from Kroki.io...")
payload_png = json.dumps({
    "diagram_source": mermaid_code,
    "diagram_type": "mermaid",
    "output_format": "png"
}).encode('utf-8')

req_png = urllib.request.Request("https://kroki.io/", data=payload_png, headers=headers)
with urllib.request.urlopen(req_png) as response:
    png_data = response.read()
    output_png_path = r"d:\Digital-Detach\docs\Architecture_Flow.png"
    with open(output_png_path, "wb") as f:
        f.write(png_data)
    print(f"Successfully saved PNG to {output_png_path}")
