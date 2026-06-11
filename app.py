from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import cgi
import json
import time


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
METADATA_FILE = UPLOAD_DIR / "uploads.json"
HOST = "127.0.0.1"
PORT = 8000


def read_metadata():
    if not METADATA_FILE.exists():
      return []
    try:
        return json.loads(METADATA_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def write_metadata(items):
    UPLOAD_DIR.mkdir(exist_ok=True)
    METADATA_FILE.write_text(json.dumps(items, indent=2), encoding="utf-8")


def safe_filename(name):
    keep = []
    for char in name:
        if char.isalnum() or char in "._- ":
            keep.append(char)
    cleaned = "".join(keep).strip().replace(" ", "_")
    return cleaned or f"upload-{int(time.time())}"


class StudyDropHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def send_json(self, payload, status=200):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/api/uploads":
            self.send_json(read_metadata())
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/upload":
            self.send_error(404, "Not found")
            return

        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": self.headers.get("Content-Type"),
            },
        )

        files = form["files"] if "files" in form else []
        if not isinstance(files, list):
            files = [files]

        UPLOAD_DIR.mkdir(exist_ok=True)
        saved_items = []
        existing = read_metadata()

        for file_item in files:
            if not file_item.filename:
                continue

            original_name = file_item.filename
            filename = f"{int(time.time() * 1000)}-{safe_filename(original_name)}"
            path = UPLOAD_DIR / filename
            content = file_item.file.read()
            path.write_bytes(content)

            saved_items.append({
                "name": original_name,
                "storedAs": filename,
                "size": len(content),
                "student": form.getfirst("student", "Student"),
                "subject": form.getfirst("subject", "General"),
                "category": form.getfirst("category", "assignment"),
                "due": form.getfirst("due", ""),
                "tags": form.getfirst("tags", ""),
                "note": form.getfirst("note", ""),
                "uploadedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
            })

        existing = saved_items + existing
        write_metadata(existing)
        self.send_json({"ok": True, "saved": saved_items})


if __name__ == "__main__":
    UPLOAD_DIR.mkdir(exist_ok=True)
    server = ThreadingHTTPServer((HOST, PORT), StudyDropHandler)
    print(f"StudyDrop is running at http://{HOST}:{PORT}")
    print(f"Uploaded files will be saved in: {UPLOAD_DIR}")
    server.serve_forever()
