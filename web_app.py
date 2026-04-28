"""
Flask server for the Riya Analytics HTML dashboard.
Generates data.js from the CSV on startup and serves static files.

Run:   python web_app.py
Then open: http://localhost:8050
"""
import os
import sys

from flask import Flask, send_from_directory

app = Flask(__name__, static_folder="dashboard_web", static_url_path="")


@app.route("/")
def index():
    return send_from_directory("dashboard_web", "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("dashboard_web", path)


@app.route("/healthz")
def healthz():
    return "OK", 200


def build_data():
    """Generate dashboard_web/data.js from the CSV before serving."""
    try:
        from generate_data import generate
        generate()
    except Exception as exc:
        print(f"Warning: could not generate data.js — {exc}", file=sys.stderr)
        print("The dashboard will use the last generated data.js if one exists.", file=sys.stderr)


if __name__ == "__main__":
    build_data()
    port = int(os.environ.get("PORT", 8050))
    print(f"\n  Riya Analytics dashboard → http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=False)
