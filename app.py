import os
from flask import Flask, session, g
from datetime import timedelta
from dateutil.parser import isoparse
from urllib.parse import urljoin
from services.api_helpers import (
    create_auth_header, api_error, get_profiles, fetch_members,
    get_user_details_from_session, get_member_events, update_event, delete_event
)
from routes.auth_routes import auth_bp
from routes.dashboard_routes import dashboard_bp
from routes.event_routes import event_bp
from routes.member_routes import member_bp
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
    user_session_data = session.get("user")
    if user_session_data:
        session.permanent = True
        g.context = get_user_details_from_session(user_session_data)
    else:
        g.context = {} # No user, empty context


if __name__ == "__main__":
    app.run(debug=False)