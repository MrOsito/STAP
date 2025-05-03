import os
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, g
from functools import wraps
from datetime import datetime, timedelta, timezone
from dateutil.parser import isoparse
import httpx
from urllib.parse import urljoin
import time

# --- App Setup ---
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key")
app.permanent_session_lifetime = timedelta(minutes=30)

# --- External Services ---
CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID", "6v98tbc09aqfvh52fml3usas3c")
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-2")
MEMBERS_URL = "https://members.terrain.scouts.com.au"
EVENTS_API_URL = "https://events.terrain.scouts.com.au"

# --- Auth Header Helper ---
def create_auth_header(id_token, content_type=None):
    headers = {"Authorization": id_token}
    if content_type:
        headers["Content-Type"] = content_type
    return headers

# --- JSON Error Helper ---
def api_error(message, status=500):
    return jsonify({"error": message}), status

# --- Decorators ---
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get("user"):
            flash("Please log in to continue.", "warning")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated

# --- Before Request ---
@app.before_request
def load_user_context():
    user = session.get("user")
    if user:
        session.permanent = True
        session["user"]["last_active"] = datetime.utcnow().isoformat()
        g.context = get_user_context(user.get("id_token"), user.get("unit_id"), user.get("group_id"))
    else:
        g.context = {}

# --- Utility Functions ---
def get_profiles(id_token):
    url = urljoin(MEMBERS_URL, "/profiles")
    headers = create_auth_header(id_token)
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
            return res.json()
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching profiles: {e}")
        return {}

def fetch_members(id_token, entity_type, entity_id):
    url = urljoin(MEMBERS_URL, f"/{entity_type}s/{entity_id}/members")
    headers = create_auth_header(id_token, "application/json")
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
            return res.json().get("results", [])
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching {entity_type} members: {e}")
        return []

def get_user_context(id_token, unit_id, group_id):
    def slim_member_list(members):
        return [{"id": m["id"], "first_name": m["first_name"], "last_name": m["last_name"]} for m in members]

    unit_members = slim_member_list(fetch_members(id_token, "unit", unit_id)) if unit_id else []
    group_members = slim_member_list(fetch_members(id_token, "group", group_id)) if group_id else []

    user = session.get("user", {})
    return {
        "user": user,
        "unit_id": unit_id,
        "group_id": group_id,
        "unit_members": unit_members,
        "group_members": group_members,
    }

def update_event(event_id, event_data, id_token):
    url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
    headers = create_auth_header(id_token, "application/json")
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.patch(url, headers=headers, json=event_data)
            res.raise_for_status()
            return res.json() if res.content else {"success": True, "note": "No content (204)"}
    except httpx.HTTPError as e:
        print(f"[ERROR] Updating event: {e}")
        raise

def delete_event(event_id, id_token):
    url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
    headers = create_auth_header(id_token, "application/json")
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.delete(url, headers=headers)
            res.raise_for_status()
            return {"success": True}
    except httpx.HTTPError as e:
        print(f"[ERROR] Deleting event: {e}")
        raise

def get_member_events(user_id, id_token, start=None, end=None):
    now = datetime.utcnow()
    start = start or (now - timedelta(days=90)).isoformat() + "Z"
    end = end or (now + timedelta(days=90)).isoformat() + "Z"

    url = urljoin(EVENTS_API_URL, f"/members/{user_id}/events?start_datetime={start}&end_datetime={end}")
    headers = create_auth_header(id_token, "application/json")
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
            return res.json().get("results", [])
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching member events: {e}")
        return []

# --- Routes ---
@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        import boto3
        branch = request.form["branch"]
        username = branch + request.form["username"]
        password = request.form["password"]
        try:
            client = boto3.client("cognito-idp", region_name=AWS_REGION)
            response = client.initiate_auth(
                ClientId=CLIENT_ID,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={"USERNAME": username, "PASSWORD": password}
            )
            id_token = response['AuthenticationResult']['IdToken']

            profile_data = get_profiles(id_token)
            profile = profile_data.get("profiles", [{}])[0]

            session["user"] = {
                "username": username,
                "id_token": id_token,
                "member_id": profile.get("member", {}).get("id"),
                "member_name": profile.get("member", {}).get("name"),
                "member_roles": profile.get("member", {}).get("roles"),
                "unit_id": profile.get("unit", {}).get("id"),
                "unit_name": profile.get("unit", {}).get("name"),
                "unit_section": profile.get("unit", {}).get("section"),
                "unit_roles": profile.get("unit", {}).get("roles"),
                "group_id": profile.get("group", {}).get("id"),
                "group_name": profile.get("group", {}).get("name"),
                "group_roles": profile.get("group", {}).get("roles"),
                "last_active": datetime.utcnow().isoformat(),
            }
            session.permanent = True
            return redirect(url_for("dashboard"))

        except Exception as e:
            flash(f"Login failed: {str(e)}", "danger")
            return redirect(url_for("login"))

    return render_template("login.html")

@app.route("/logout")
@login_required
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("login"))

@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", **g.context)

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


@app.route("/event/<event_id>")
@login_required
def get_event_detail(event_id):
    start = time.time()
    try:
        id_token = session["user"]["id_token"]
        token_time = time.time()

        url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
        headers = create_auth_header(id_token, "application/json")
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
        fetch_time = time.time()

        event_data = res.json()
        parse_time = time.time()

        print(f"[DEBUG] Event size: {len(str(event_data))} characters")
        print(f"TIMING: token={token_time-start:.3f}s fetch={fetch_time-token_time:.3f}s parse={parse_time-fetch_time:.3f}s")

        response = jsonify(event_data)
        end_time = time.time()
        print(f"[DEBUG] jsonify() complete in {end_time - parse_time:.3f}s")

        return response
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching event {event_id}: {e}")
        return api_error("Failed to fetch event detail")




@app.route("/event/<event_id>", methods=["PATCH"])
@login_required
def patch_event(event_id):
    try:
        id_token = session["user"]["id_token"]
        event_data = request.get_json()
        update_event(event_id, event_data, id_token)
        return jsonify({"success": True})
    except Exception as e:
        print(f"[ERROR] Patching event {event_id}: {e}")
        return api_error(str(e))

@app.route("/event/<event_id>", methods=["DELETE"])
@login_required
def delete_event_route(event_id):
    try:
        id_token = session["user"]["id_token"]
        delete_event(event_id, id_token)
        return jsonify({"success": True})
    except Exception as e:
        print(f"[ERROR] Deleting event {event_id}: {e}")
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

if __name__ == "__main__":
    app.run(debug=False)