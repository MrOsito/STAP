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
from routes.member_routes import member_bp
from utils.auth_utils import login_required
from config import MEMBERS_URL, EVENTS_API_URL

# --- App Setup ---
app = Flask(__name__)
app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(event_bp)
app.register_blueprint(member_bp)
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





if __name__ == "__main__":
    app.run(debug=False)