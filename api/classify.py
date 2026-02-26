from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import os

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Handle CORS
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        # Read request body
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        request_data = json.loads(post_data.decode('utf-8'))
        
        product_desc = request_data.get('product_description', '')
        
        if not product_desc:
            self.wfile.write(json.dumps({'error': 'No product description provided'}).encode())
            return

        try:
            # Call Anthropic API
            api_key = os.environ.get('ANTHROPIC_API_KEY')
            
            if not api_key:
                self.wfile.write(json.dumps({'error': 'API key not configured'}).encode())
                return
            
            prompt = f"""You are an expert in tariff classification and HS (Harmonized System) codes. Classify the following product and provide the most likely HS code.

Product Description: {product_desc}

Respond ONLY with a valid JSON object (no markdown, no backticks) in this exact format:
{{
  "hs_code": "1234.56.78",
  "description": "Brief description of what this HS code covers",
  "confidence": "high/medium/low",
  "reasoning": "Brief explanation of why this classification applies",
  "chapter": "Chapter number and name",
  "considerations": ["Key factor 1", "Key factor 2", "Key factor 3"]
}}"""

            data = {
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 1000,
                "messages": [{
                    "role": "user",
                    "content": prompt
                }]
            }
            
            req = urllib.request.Request(
                'https://api.anthropic.com/v1/messages',
                data=json.dumps(data).encode('utf-8'),
                headers={
                    'Content-Type': 'application/json',
                    'x-api-key': api_key,
                    'anthropic-version': '2023-06-01'
                }
            )
            
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                text = result['content'][0]['text']
                # Clean response
                clean_text = text.replace('```json', '').replace('```', '').strip()
                classification = json.loads(clean_text)
                
                self.wfile.write(json.dumps(classification).encode())
                
        except Exception as e:
            error_response = {'error': str(e)}
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        # Handle preflight CORS
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
