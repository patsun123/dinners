"""Static file server for GourmetLog. Runs under pythonw, so we silence
stderr (pythonw has no console; default http.server logging would crash)."""
import os, sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

class CachingHandler(QuietHandler):
    def end_headers(self):
        if self.path == "/" or self.path.endswith(".html"):
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=300")
        super().end_headers()

if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8080), CachingHandler).serve_forever()
