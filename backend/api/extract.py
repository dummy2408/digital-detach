"""
Screenshot Extraction Endpoint — Gemini Vision
================================================
Accepts a screen time screenshot (iOS Screen Time / Android Digital Wellbeing)
and uses Gemini to extract structured usage data.
"""

import os
import json
from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter()

EXTRACTION_PROMPT = """
You are a precise data extraction agent. Analyze this smartphone screen time screenshot.

It may come from ANY of these sources:
• Apple iOS "Screen Time"
• Android "Digital Wellbeing"
• Samsung "Digital Wellbeing"
• Third-party apps (ActionDash, StayFree, YourHour, etc.)

Extract the following fields and return ONLY a valid JSON object — no markdown, no explanation, no code fences:
If the image does not appear to be a screen time screenshot, return exactly: {"error": "invalid_screenshot"}

{
  "daily_usage_hours": <total screen time today in decimal hours — e.g. 3h 3m → 3.05>,
  "time_on_social_media": <social/communication time in decimal hours — includes Social Networking, Social, Messaging, Communication categories>,
  "time_on_gaming": <gaming/entertainment time in decimal hours — includes Games, Entertainment categories>,
  "time_on_education": <education/productivity time in decimal hours — includes Productivity, Education, Finance, Reading, Utilities, Business categories>,
  "time_on_streaming": <streaming/video/music time in decimal hours — includes YouTube, Netflix, Spotify, Video categories>,
  "time_on_other": <everything else in decimal hours>,
  "apps_used_daily": <number of apps used if visible, otherwise null>,
  "phone_checks_per_day": <pickups/unlocks/times opened count if visible, otherwise null>,
  "weekend_usage_hours": <weekend or weekly average if visible, otherwise null>
}

CRITICAL RULES:
1. Convert ALL durations to decimal hours: 2h 27m → 2.45, 45m → 0.75, 1h → 1.0
2. If the screenshot shows a weekly view, extract the DAILY data if a specific day is highlighted, otherwise use the daily average
3. If a field is genuinely not visible in the screenshot, set it to null — do NOT guess
4. For "daily_usage_hours", use the TOTAL screen time number shown prominently (usually the largest number)
5. If categories don't match exactly, use your best judgment to map them:
   - "Information & Reading" → education
   - "Creativity" → education  
   - "Health & Fitness" → education
   - "Other" → split proportionally or assign to largest
6. Return ONLY the JSON object. No text before or after it.
"""

@router.post("/api/extract")
async def extract_screen_time(file: UploadFile = File(...)):
    """Extract screen time data from a screenshot using Gemini Vision."""

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (PNG, JPEG, WEBP).",
        )

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 10 MB.")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured on the server.",
        )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=file.content_type or "image/png",
                ),
                EXTRACTION_PROMPT,
            ],
        )

        raw_text = response.text.strip()

        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            
            lines = [l for l in lines if not l.strip().startswith("```")]
            raw_text = "\n".join(lines).strip()

        extracted = json.loads(raw_text)

        if "error" in extracted:
            raise HTTPException(status_code=400, detail="Invalid screenshot. Please upload a Screen Time or Digital Wellbeing screenshot.")

        for key in [
            "daily_usage_hours",
            "time_on_social_media",
            "time_on_gaming",
            "time_on_education",
            "time_on_streaming",
            "time_on_other",
            "weekend_usage_hours",
        ]:
            val = extracted.get(key)
            if val is not None:
                try:
                    extracted[key] = round(max(0.0, float(val)), 2)
                except (ValueError, TypeError):
                    extracted[key] = None

        for key in ["apps_used_daily", "phone_checks_per_day"]:
            val = extracted.get(key)
            if val is not None:
                try:
                    extracted[key] = max(0, int(float(val)))
                except (ValueError, TypeError):
                    extracted[key] = None

        return {"success": True, "extracted_data": extracted}

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=422,
            detail="Gemini returned a response that could not be parsed as JSON. Please try a clearer screenshot.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Screenshot extraction failed: {str(e)}",
        )
