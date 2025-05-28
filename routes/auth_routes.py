from flask import Blueprint, session, redirect, url_for, flash, request, render_template
from config import AWS_REGION, CLIENT_ID
from services.aws_clients import cognito_client
from services.api_helpers import get_profiles
import time

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("auth.login_route"))

import time

@auth_bp.route("/", methods=["GET", "POST"])
@auth_bp.route("/login", methods=["GET", "POST"])
def login_route():
    if request.method == "POST":
        import boto3
        t_start = time.time()

        branch = request.form["branch"]
        username = branch + request.form["username"]
        password = request.form["password"]

        try:
            response = cognito_client.initiate_auth(
                ClientId=CLIENT_ID,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={"USERNAME": username, "PASSWORD": password}
            )
            id_token = response['AuthenticationResult']['IdToken']
            profile_data = get_profiles(id_token)
            profile = profile_data.get("profiles", [{}])[0]

            session["user"] = {
                "username": username,
                "id_token": id_token,
                "member_id": profile.get("member", {}).get("id"),
                "member_name": profile.get("member", {}).get("name"),
                "member_roles": profile.get("member", {}).get("roles"),
                "unit_id": profile.get("unit", {}).get("id"),
                "unit_name": profile.get("unit", {}).get("name"),
                "unit_section": profile.get("unit", {}).get("section"),
                "unit_roles": profile.get("unit", {}).get("roles"),
                "group_id": profile.get("group", {}).get("id"),
                "group_name": profile.get("group", {}).get("name"),
                "group_roles": profile.get("group", {}).get("roles"),
            }

            if session.get("user"):
                user_details = session["user"]
                initial_context = get_user_context(
                    id_token=user_details.get("id_token"),
                    unit_id=user_details.get("unit_id"),
                    group_id=user_details.get("group_id")
                )
                session["user_context_cached"] = {
                    "unit_members": initial_context.get("unit_members"),
                    "group_members": initial_context.get("group_members")
                    # Add any other parts of the context from get_user_context
                    # that are expensive to fetch and safe to cache in session.
                }
                print("[DEBUG] User context cached in session during login.", flush=True) # For debugging

            session.permanent = True

            return redirect(url_for("dashboard.dashboard"))

        except Exception as e:
            flash(f"Login failed: {str(e)}", "danger")
            return redirect(url_for("auth.login_route"))

    return render_template("login.html")
