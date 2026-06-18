import os
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(ROOT_DIR, 'frontend', '.env.local'))

import json
import joblib
import pandas as pd
import numpy as np
import shap
from fastapi import FastAPI, Form, HTTPException
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from api.extract import router as extract_router

class PersonaRequest(BaseModel):
    timeOnSocialMedia: float
    timeOnGaming: float
    timeOnEducation: float
    totalScreenTime: float
    phoneChecksPerDay: float

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract_router)

model = None
kmeans_model = None
kmeans_scaler = None
cluster_mapping = {}

def load_models():
    global model, kmeans_model, kmeans_scaler, cluster_mapping
    try:
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        model = joblib.load(os.path.join(root_dir, 'ml', 'xgboost_model', 'best_model.pkl'))
        
        # Load KMeans models
        kmeans_model = joblib.load(os.path.join(root_dir, 'ml', 'xgboost_model', 'kmeans_model.pkl'))
        kmeans_scaler = joblib.load(os.path.join(root_dir, 'ml', 'xgboost_model', 'kmeans_scaler.pkl'))
        with open(os.path.join(root_dir, 'ml', 'xgboost_model', 'cluster_mapping.json'), 'r') as f:
            cluster_mapping = json.load(f)
            
    except Exception as e:
        print(f"Error loading models: {e}")

@app.on_event("startup")
async def startup_event():
    load_models()

@app.post("/api/persona")
async def get_persona(req: PersonaRequest):
    if kmeans_model is None or kmeans_scaler is None:
        load_models()
        if kmeans_model is None:
            raise HTTPException(status_code=500, detail="KMeans models are not loaded.")

    try:
        df_cluster = pd.DataFrame([{
            'Time_on_Social_Media': req.timeOnSocialMedia,
            'Time_on_Gaming': req.timeOnGaming,
            'Time_on_Education': req.timeOnEducation,
            'Total_Screen_Time': req.totalScreenTime,
            'Phone_Checks_Per_Day': req.phoneChecksPerDay
        }])

        X_scaled = kmeans_scaler.transform(df_cluster)
        cluster_id = kmeans_model.predict(X_scaled)[0]
        
        persona = cluster_mapping.get(str(cluster_id)) or cluster_mapping.get(cluster_id)
        
        # Override clustering if there is an obvious logical mismatch due to missing phone check data
        if req.totalScreenTime < 4 and req.timeOnSocialMedia < 2 and req.timeOnGaming < 2:
            persona = cluster_mapping.get("2") or persona  # Balanced Explorer
        elif req.timeOnEducation > req.timeOnGaming and req.timeOnEducation >= req.timeOnSocialMedia:
            persona = cluster_mapping.get("1") or persona  # Productivity Master
        elif req.timeOnSocialMedia > req.timeOnGaming and req.timeOnSocialMedia >= req.timeOnEducation:
            persona = cluster_mapping.get("3") or persona  # Doom Scroller
        elif req.timeOnGaming > req.timeOnSocialMedia and req.timeOnGaming >= req.timeOnEducation:
            persona = cluster_mapping.get("0") or persona  # Dedicated Gamer
            
        if not persona:
            persona = {"title": "Unknown", "emoji": "❓", "desc": "Could not determine persona.", "color": "#888888"}

        return persona
    except Exception as e:
        print(f"Persona prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict")
async def predict_addiction(
    name: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    schoolGrade: str = Form(...),
    dailyUsageHours: float = Form(...),
    timeOnSocialMedia: float = Form(...),
    timeOnGaming: float = Form(...),
    timeOnEducation: float = Form(...),
    sleepHours: float = Form(7.0),
    exerciseHours: float = Form(1.0),
    stressLevel: float = Form(5.0),
    hobby: str = Form(""),
    histPhoneChecks: float = Form(0.0),
    histAppsUsed: float = Form(0.0),
    likedRecs: str = Form("[]"),
):
    
    if model is None:
        load_models()
        if model is None:
            raise HTTPException(status_code=500, detail="ML models are not loaded.")

    try:
        # Impute phone checks and apps dynamically from history if available, else estimate
        phoneChecksPerDay = histPhoneChecks if histPhoneChecks > 0 else max(20, int(dailyUsageHours * 12))
        appsUsedDaily = histAppsUsed if histAppsUsed > 0 else max(5, int(dailyUsageHours * 2.5))
        
        total_screen = timeOnSocialMedia + timeOnGaming + timeOnEducation
        ent_ratio = (timeOnSocialMedia + timeOnGaming) / total_screen if total_screen > 0 else 0
        weekend_usage = dailyUsageHours * 1.5  

        df = pd.DataFrame([{
            'Age': age,
            'Gender': gender,
            'School_Grade': schoolGrade,
            'Exercise_Hours': exerciseHours,  
            'Self_Esteem': 11.0 - stressLevel,     
            'Daily_Usage_Hours': dailyUsageHours,
            'Phone_Checks_Per_Day': phoneChecksPerDay,
            'Apps_Used_Daily': appsUsedDaily,
            'Time_on_Social_Media': timeOnSocialMedia,
            'Time_on_Gaming': timeOnGaming,
            'Time_on_Education': timeOnEducation,
            
            'Sleep_Hours': sleepHours,
            'Academic_Performance': 3.0,
            'Social_Interactions': 3.0,
            'Anxiety_Level': stressLevel,
            'Depression_Level': stressLevel,
            'Parental_Control': 3.0,
            'Screen_Time_Before_Bed': 1.0,
            'Family_Communication': 3.0,
            'Weekend_Usage_Hours': weekend_usage,
            
            'Total_Screen_Time': total_screen,
            'Entertainment_Ratio': ent_ratio,
            'Sleep_Deficit': 8.0 - sleepHours,
            'Weekend_Extra': weekend_usage - dailyUsageHours,
            
            'Location': 'Urban',
            'Phone_Usage_Purpose': 'Entertainment'
        }])

        prediction = model.predict(df)[0]
        probabilities = model.predict_proba(df)[0]
        
        if prediction == 2:
            risk_level = "HIGH RISK"
        elif prediction == 1:
            risk_level = "MODERATE RISK"
        else:
            risk_level = "LOW RISK"
            
        confidence = float(max(probabilities) * 100)
        risk_score_continuous = float(probabilities[2] + (probabilities[1] * 0.5))

        # Health-based override for excessive screen time regardless of purpose
        if dailyUsageHours >= 10:
            risk_level = "HIGH RISK"
            risk_score_continuous = max(risk_score_continuous, 0.85)
        elif dailyUsageHours >= 7 and risk_level == "LOW RISK":
            risk_level = "MODERATE RISK"
            risk_score_continuous = max(risk_score_continuous, 0.55)

        # Parallel KMeans persona assignment
        if kmeans_model is not None and kmeans_scaler is not None:
            df_cluster = pd.DataFrame([{
                'Time_on_Social_Media': timeOnSocialMedia,
                'Time_on_Gaming': timeOnGaming,
                'Time_on_Education': timeOnEducation,
                'Total_Screen_Time': total_screen,
                'Phone_Checks_Per_Day': phoneChecksPerDay
            }])
            X_scaled = kmeans_scaler.transform(df_cluster)
            cluster_id = int(kmeans_model.predict(X_scaled)[0])
            persona_dict = cluster_mapping.get(str(cluster_id)) or cluster_mapping.get(cluster_id)
            
            if total_screen < 4 and timeOnSocialMedia < 2 and timeOnGaming < 2:
                persona_dict = cluster_mapping.get("2") or persona_dict
            elif timeOnEducation > timeOnGaming and timeOnEducation >= timeOnSocialMedia:
                persona_dict = cluster_mapping.get("1") or persona_dict
            elif timeOnSocialMedia > timeOnGaming and timeOnSocialMedia >= timeOnEducation:
                persona_dict = cluster_mapping.get("3") or persona_dict
            elif timeOnGaming > timeOnSocialMedia and timeOnGaming >= timeOnEducation:
                persona_dict = cluster_mapping.get("0") or persona_dict
                
            if not persona_dict:
                persona_dict = {"title": "Unknown", "emoji": "❓"}
        else:
            cluster_id = -1
            persona_dict = {"title": "Unknown", "emoji": "❓"}

        # SHAP Extraction
        try:
            preprocessor = model.named_steps['preprocessor']
            classifier = model.named_steps['model']
            X_trans = preprocessor.transform(df)
            
            explainer = shap.TreeExplainer(classifier)
            s_vals = explainer.shap_values(X_trans)
            
            if isinstance(s_vals, list):
                class_shap = s_vals[int(prediction)][0]
            elif len(s_vals.shape) == 3:
                class_shap = s_vals[0, :, int(prediction)]
            else:
                class_shap = s_vals[0]
                
            feature_names = preprocessor.get_feature_names_out()
            top_indices = np.argsort(-np.abs(class_shap))[:3]
            top_features_raw = [feature_names[i] for i in top_indices]
            
            clean_top_features = [f.split('__')[-1].replace('_', ' ') for f in top_features_raw]
        except Exception as e:
            print(f"SHAP Error: {e}")
            clean_top_features = []

        # Recommendation Engine
        recs = []
        if risk_level == "HIGH RISK":
            recs.append("Set a strict 30-minute daily limit on your most used apps to break the cycle.")
            recs.append("Turn on your phone's Grayscale mode after 9 PM to reduce visual dopamine hits.")
        elif risk_level == "MODERATE RISK":
            recs.append("Try leaving your phone in another room while working or studying to build deep focus.")
        else:
            recs.append("Great job! Keep monitoring your weekly averages to stay mindful of your habits.")
            
        for feat in clean_top_features:
            if "Sleep" in feat:
                recs.append("Your sleep deficit is a major factor. Try winding down without screens 1 hour earlier.")
            elif "Social" in feat:
                recs.append("Social media is driving your screen time. Consider batching your social media checks to specific times.")
            elif "Gaming" in feat:
                recs.append("Gaming time is high. Consider setting a daily gaming limit or playing only on weekends.")
            elif "Checks" in feat:
                recs.append("High pickup frequency detected. Try turning off non-essential notifications.")
                
        if "Night Owl" in persona_dict.get("title", ""):
            recs.append("Set a 'Bedtime Mode' schedule on your phone to automatically silence alerts at night.")
            
        if dailyUsageHours >= 10:
            recs.insert(0, "Even productive screen time causes severe eye strain and health issues when exceeding 10 hours. Please take a 15-minute screen-free break every 2 hours.")
        
        # Reranking logic
        try:
            liked_recs_list = json.loads(likedRecs)
        except:
            liked_recs_list = []

        liked_words = set()
        for lr in liked_recs_list:
            for word in lr.lower().split():
                if len(word) > 4:
                    liked_words.add(word)

        def rec_score(r):
            # Prioritize recommendations that match keywords from previously liked ones
            return sum(1 for word in r.lower().split() if word in liked_words)

        unique_recs = list(dict.fromkeys(recs))
        unique_recs.sort(key=rec_score, reverse=True)
        recommendations = unique_recs[:3]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML Prediction failed: {str(e)}")

    display_data = {
        "Daily_Usage": f"{dailyUsageHours:.1f}h",
        "Phone_Checks_Per_Day": phoneChecksPerDay,
        "Apps_Used_Daily": appsUsedDaily,
        "Time_on_Social_Media": f"{timeOnSocialMedia:.1f}h",
        "Time_on_Gaming": f"{timeOnGaming:.1f}h",
        "Time_on_Education": f"{timeOnEducation:.1f}h",
    }

    return {
        "risk_level": risk_level,
        "confidence": round(confidence, 2),
        "risk_score_continuous": round(risk_score_continuous, 4),
        "cluster_id": cluster_id,
        "persona": persona_dict,
        "shap_features": clean_top_features,
        "recommendations": recommendations,
        "extracted_data": display_data
    }
