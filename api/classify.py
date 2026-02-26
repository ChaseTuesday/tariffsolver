from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import os
import json

app = FastAPI()

# Enable CORS for your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tariffsolver.com", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassificationRequest(BaseModel):
    product_description: str

@app.post("/api/classify")
async def classify_product(request: ClassificationRequest):
    try:
        client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )
        
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{
                "role": "user",
                "content": f"""You are an expert in tariff classification and HS (Harmonized System) codes. Classify the following product and provide the most likely HS code.

Product Description: {request.product_description}

Respond ONLY with a valid JSON object (no markdown, no backticks) in this exact format:
{{
  "hs_code": "1234.56.78",
  "description": "Brief description of what this HS code covers",
  "confidence": "high/medium/low",
  "reasoning": "Brief explanation of why this classification applies",
  "chapter": "Chapter number and name",
  "considerations": ["Key factor 1", "Key factor 2", "Key factor 3"]
}}"""
            }]
        )
        
        response_text = message.content[0].text
        # Clean and parse response
        clean_text = response_text.replace('```json', '').replace('```', '').strip()
        result = json.loads(clean_text)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
