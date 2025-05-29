# STAP/app.py
import os
from flask import Flask, g, session # Added session and g
from datetime import timedelta

# Import the new function from api_helpers
from services.api_helpers import get_user_details_from_session

from routes.auth_routes import auth_bp
from routes.dashboard_routes import dashboard_bp
from routes.event_routes import event_bp
# Removed: from utils.auth_utils import login_required (it's used within blueprints)
# config is imported by api_helpers, not directly needed here unless for app.secret_key from os.environ

# --- App Setup ---
app = Flask(__name__)
app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(event_bp)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-replace-me") # Use a strong secret key
app.permanent_session_lifetime = timedelta(minutes=int(os.environ.get("SESSION_LIFETIME_MINUTES", 60)))


# --- Before Request ---
@app.before_request
def load_lightweight_user_context():
    if 'user' in session:
        session.permanent = True # Refresh session lifetime on activity
        # Use the new function that only gets details from the session
        g.context = get_user_details_from_session()
    else:
        g.context = {}

# --- Routes ---
# Your main routes like @app.route('/') if any, or they are all in blueprints.

if __name__ == "__main__":
    # For local development, debug=True is fine.
    # For production, use a WSGI server like Gunicorn or Hypercorn.
    app.run(debug=os.environ.get("FLASK_DEBUG", "False").lower() == "true")