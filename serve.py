"""Static file server for GourmetLog. Runs under pythonw, so we silence
stderr (pythonw has no console; default http.server logging would crash)."""
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def send_head(self):
        # Never serve dotfiles/dot-dirs (.git, .gitignore, ...)
        clean = self.path.split("?", 1)[0].split("#", 1)[0]
        if any(part.startswith(".") for part in clean.split("/") if part):
            self.send_error(404, "Not found")
            return None
        return super().send_head()

    def end_headers(self):
        if self.path == "/" or self.path.endswith(".html"):
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=300")
        super().end_headers()

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8080), Handler).serve_forever()
