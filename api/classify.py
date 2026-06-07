from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.error
import urllib.request

UPSTREAM_URL = os.environ.get(
    'CLASSIFY_API_URL',
    'https://tslite-api.onrender.com/classify',
)
UPSTREAM_TIMEOUT = int(os.environ.get('CLASSIFY_TIMEOUT', '90'))


class handler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_upstream_body(self, response):
        payload = response.read().decode('utf-8')
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            return {'error': payload}

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', '0'))
            post_data = self.rfile.read(content_length) if content_length > 0 else b'{}'
            request_data = json.loads(post_data.decode('utf-8')) if post_data else {}

            product_desc = request_data.get('product_description', '').strip()
            if not product_desc:
                self._send_json(400, {'error': 'No product description provided'})
                return

            upstream = urllib.request.Request(
                UPSTREAM_URL,
                data=json.dumps(request_data).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST',
            )

            try:
                with urllib.request.urlopen(upstream, timeout=UPSTREAM_TIMEOUT) as response:
                    data = self._read_upstream_body(response)
                    if response.status >= 400:
                        self._send_json(
                            int(response.status),
                            data if isinstance(data, dict) else {'error': data},
                        )
                        return
                    self._send_json(200, data)
            except urllib.error.HTTPError as exc:
                data = self._read_upstream_body(exc)
                self._send_json(
                    exc.code,
                    data if isinstance(data, dict) else {'error': data},
                )
            except urllib.error.URLError as exc:
                self._send_json(502, {'error': f'Classifier backend unreachable: {exc.reason}'})
        except Exception as exc:
            self._send_json(502, {'error': f'Classifier proxy failed: {exc}'})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', '0')
        self.end_headers()
