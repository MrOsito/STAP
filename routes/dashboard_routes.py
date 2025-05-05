from flask import Blueprint, render_template, g
from utils.auth_utils import login_required

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/dashboard")
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