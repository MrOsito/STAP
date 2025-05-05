import os
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, g
from functools import wraps
from datetime import datetime, timedelta, timezone
from dateutil.parser import isoparse
import httpx
from urllib.parse import urljoin
import time
from services.api_helpers import (
    create_auth_header, api_error, get_profiles, fetch_members,
    get_user_context, get_member_events, update_event, delete_event
)
from routes.auth_routes import auth_bp
from routes.dashboard_routes import dashboard_bp
from routes.event_routes import event_bp
from utils.auth_utils import login_required
from config import MEMBERS_URL, EVENTS_API_URL

# --- App Setup ---
app = Flask(__name__)
app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(event_bp)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key")
app.permanent_session_lifetime = timedelta(minutes=30)

# --- Before Request ---
@app.before_request
def load_user_context():
    user = session.get("user")
    if user:
        session.permanent = True
        g.context = get_user_context(user.get("id_token"), user.get("unit_id"), user.get("group_id"))
    else:
        g.context = {}

# --- Routes ---

@app.route("/calendar")
@login_required
def calendar():
    return render_template("calendar.html", **g.context)

@app.route("/settings")
@login_required
def settings():
    return render_template("settings.html")

@app.route("/events")
@login_required
def fetch_events_by_range():
    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return jsonify([])
    try:
        start_iso = isoparse(start).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
        end_iso = isoparse(end).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

        events = get_member_events(session["user"]["member_id"], session["user"]["id_token"], start_iso, end_iso)

        formatted = [{
            "id": e.get("id", ""),
            "start": e.get("start_datetime", ""),
            "end": e.get("end_datetime", ""),
            "title": e.get("title", ""),
            "invitee_type": e.get("invitee_type", ""),
            "event_status": e.get("status", ""),
            "challenge_area": e.get("challenge_area", ""),
            "section": e.get("section", ""),
            "invitee_id": e.get("invitee_id", ""),
            "invitee_name": e.get("invitee_name", ""),
            "group_id": e.get("group_id", "")
        } for e in events]

        return jsonify(formatted)

    except Exception as e:
        print(f"[ERROR] /events: {e}")
        return api_error("Failed to fetch events")

@app.route("/events", methods=["POST"])
@login_required
def create_event():
    try:
        user = session["user"]
        unit_id = user.get("unit_id")
        id_token = user.get("id_token")
        event_data = request.get_json()

        url = urljoin(EVENTS_API_URL, f"/units/{unit_id}/events")
        headers = create_auth_header(id_token, "application/json")
        with httpx.Client(timeout=10.0) as client:
            res = client.post(url, headers=headers, json=event_data)
            res.raise_for_status()
            return jsonify({"success": True})
    except httpx.HTTPError as e:
        print(f"[ERROR] Creating event: {e}")
        return api_error(str(e))


@app.route("/members")
@login_required
def get_members():
    try:
        id_token = session["user"]["id_token"]
        unit_id = request.args.get("invitee_id") or session["user"].get("unit_id")
        url = urljoin(MEMBERS_URL, f"/units/{unit_id}/members")
        headers = create_auth_header(id_token, "application/json")
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
            return jsonify(res.json())
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching members: {e}")
        return jsonify({"results": []}), 500



if __name__ == "__main__":
    app.run(debug=False)