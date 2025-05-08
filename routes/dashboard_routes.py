# routes/dashboard_routes.py
from flask import Blueprint, render_template, g
from utils.auth_utils import login_required

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/dashboard")
@login_required
def dashboard():
    """
    Renders the main dashboard. All values in g.context (user, unit_members, group_members)
    are inserted via Jinja2 autoescaping, so any text fields will never be interpreted
    as HTML or script.
    """
    return render_template("dashboard.html", **g.context)

@dashboard_bp.route("/calendar")
@login_required
def calendar():
    """
    Renders the calendar page, passing the same sanitized context.
    """
    return render_template("calendar.html", **g.context)

@dashboard_bp.route("/settings")
@login_required
def settings():
    """
    Renders the settings page (no dynamic context needed here).
    """
    return render_template("settings.html")
