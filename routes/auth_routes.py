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
            t_cognito_start = time.time()
#            client = boto3.client("cognito-idp", region_name=AWS_REGION)
            response = cognito_client.initiate_auth(
                ClientId=CLIENT_ID,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={"USERNAME": username, "PASSWORD": password}
            )
            t_cognito_end = time.time()

            id_token = response['AuthenticationResult']['IdToken']

            t_profile_start = time.time()
            profile_data = get_profiles(id_token)
            t_profile_end = time.time()

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

            session.permanent = True

            t_end = time.time()
            print(f"[TIMING] Total Login: {t_end - t_start:.2f}s", flush=True)
            print(f"[TIMING] Cognito: {t_cognito_end - t_cognito_start:.2f}s", flush=True)
            print(f"[TIMING] Fetch Profiles: {t_profile_end - t_profile_start:.2f}s", flush=True)

            return redirect(url_for("dashboard.dashboard"))

        except Exception as e:
            flash(f"Login failed: {str(e)}", "danger")
            return redirect(url_for("auth.login_route"))

    return render_template("login.html")
