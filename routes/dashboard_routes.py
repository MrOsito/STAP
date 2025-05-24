from flask import Blueprint, render_template, g
from utils.auth_utils import login_required
from config import EVENTS_API_URL, MEMBERS_URL # Import your API URLs

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", **g.context)

@dashboard_bp.route("/calendar")
@login_required
def calendar():
    context = g.context.copy()
    context['TERRAIN_EVENTS_API_URL'] = EVENTS_API_URL
    context['TERRAIN_MEMBERS_API_URL'] = MEMBERS_URL
    return render_template("calendar.html", **context)

@dashboard_bp.route("/settings")
@login_required
def settings():
    return render_template("settings.html")



