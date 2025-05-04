from flask import Blueprint, session, redirect, url_for, flash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("login"))
