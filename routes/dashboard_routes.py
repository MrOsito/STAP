import logging
from flask import Blueprint, render_template, g, current_app

# Configure logging (assuming basicConfig is done in app.py or elsewhere)
# If not, you might add something like:
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
# Or get a logger instance for this module:
logger = logging.getLogger(__name__)


dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/dashboard")
# Assuming login_required handles unauthenticated users, so we log successful access
# from an authenticated user.
# Ensure login_required is correctly imported and implemented as shown in auth_utils.py
from utils.auth_utils import login_required # Ensure this import is present if not already
@login_required
def dashboard():
    #"""Renders the main dashboard page."""
    user_identifier = g.context.get('user', {}).get('username', 'Unknown User')
    logger.info(f"Dashboard accessed by {user_identifier}")
    try:
        # Pass the user context to the template
        return render_template("dashboard.html", **g.context)
    except Exception as e:
        logger.error(f"Error rendering dashboard for {user_identifier}: {e}", exc_info=True)
        # Consider rendering an error template or flashing a message
        # For simplicity, re-raise or return an error response
        # In a real app, you might render a user-friendly error page
        return "An internal error occurred loading the dashboard.", 500


@dashboard_bp.route("/calendar")
@login_required
def calendar():
    #"""Renders the event calendar page."""
    user_identifier = g.context.get('user', {}).get('username', 'Unknown User')
    logger.info(f"Calendar accessed by {user_identifier}")
    try:
        # Pass the user context and members data to the template
        # Note: The data passed here (user, unit_members, group_members) is embedded
        # in the HTML using | tojson | safe. Ensure that the contents of these
        # variables are sanitized before being placed into the context if they
        # originate from untrusted sources, as 'safe' disables Jinja's auto-escaping.
        return render_template("calendar.html", **g.context)
    except Exception as e:
        logger.error(f"Error rendering calendar for {user_identifier}: {e}", exc_info=True)
        return "An internal error occurred loading the calendar.", 500

@dashboard_bp.route("/settings")
@login_required
def settings():
    #"""Renders the settings page."""
    user_identifier = g.context.get('user', {}).get('username', 'Unknown User')
    logger.info(f"Settings accessed by {user_identifier}")
    try:
        # The settings page currently doesn't use g.context, but you could pass it
        # if needed in the future.
        return render_template("settings.html")
    except Exception as e:
        logger.error(f"Error rendering settings for {user_identifier}: {e}", exc_info=True)
        return "An internal error occurred loading the settings page.", 500