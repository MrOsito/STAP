# STAP/app.py
import os
from datetime import timedelta
from flask import Flask, g, session
from whitenoise import WhiteNoise

# Import the new function from api_helpers
from services.api_helpers import get_user_details_from_session

from routes.auth_routes import auth_bp
from routes.dashboard_routes import dashboard_bp
from routes.event_routes import event_bp

# --- App Setup ---
app = Flask(__name__)

# Wrap Flask's WSGI application with WhiteNoise for efficient static file serving
app.wsgi_app = WhiteNoise(app.wsgi_app, root="static/", prefix="static/")

app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(event_bp)

app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-replace-me")
app.permanent_session_lifetime = timedelta(minutes=int(os.environ.get("SESSION_LIFETIME_MINUTES", 60)))


# --- Before Request ---
@app.before_request
def load_lightweight_user_context():
    if 'user' in session:
        session.permanent = True  # Refresh session lifetime on activity
        g.context = get_user_details_from_session()
    else:
        g.context = {}

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG", "False").lower() == "true")