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
        cached_context_data = session.get("user_context_cached")
        if cached_context_data:
            # Combine basic user info with cached context data
            g.context = {
                "user": user,
                "unit_members": cached_context_data.get("unit_members"),
                "group_members": cached_context_data.get("group_members"),
                # Ensure all keys expected by templates are present
                "unit_id": user.get("unit_id"), # from basic user session
                "group_id": user.get("group_id") # from basic user session
            }
            print("[DEBUG] Loaded user context from SESSION cache.") # For debugging
        else:
            # Fallback: If not in session, call get_user_context
            # This might happen if the session was cleared or it's an old session
            # before this caching logic was implemented.
            print("[DEBUG] User context NOT in session cache, calling get_user_context.") # For debugging
            # The original get_user_context uses session["user"] internally,
            # so it should still work.
            context_from_api = get_user_context(
                id_token=user.get("id_token"),
                unit_id=user.get("unit_id"),
                group_id=user.get("group_id")
            )
            g.context = context_from_api # Populate g for the current request

            # And update the session cache for next time
            session["user_context_cached"] = {
                "unit_members": context_from_api.get("unit_members"),
                "group_members": context_from_api.get("group_members")
            }
            print("[DEBUG] User context fetched and  SESSION cache updated via before_request fallback.")

    else:
        g.context = {} # No user, empty context


if __name__ == "__main__":
    app.run(debug=False)