# STAP/routes/auth_routes.py
from flask import Blueprint, session, redirect, url_for, flash, request, render_template
from config import AWS_REGION, CLIENT_ID # Ensure these are used or remove if not needed directly here
from services.aws_clients import cognito_client
from services.api_helpers import get_profiles # Only get_profiles is needed now
import time

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("auth.login_route"))

@auth_bp.route("/", methods=["GET", "POST"])
@auth_bp.route("/login", methods=["GET", "POST"])
def login_route():
    if request.method == "POST":
        t_start = time.time()

        branch = request.form["branch"]
        username = branch + request.form["username"]
        password = request.form["password"]

        try:
            t_cognito_start = time.time()
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

            # Store all necessary user details in the session
            # This data will be used by get_user_details_from_session()
            session["user"] = {
                "username": username, # The full username including branch prefix
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

            # No longer fetching and caching full member lists (unit_members, group_members) here
            # This will be done on-demand by JavaScript calls to a new /members API endpoint

            t_end = time.time()
            print(f"[TIMING] Total Login: {t_end - t_start:.2f}s", flush=True)
            print(f"[TIMING] Cognito: {t_cognito_end - t_cognito_start:.2f}s", flush=True)
            print(f"[TIMING] Fetch Profiles: {t_profile_end - t_profile_start:.2f}s", flush=True)

            return redirect(url_for("dashboard.dashboard"))

        except cognito_client.exceptions.NotAuthorizedException:
            flash("Login failed: Incorrect username or password.", "danger")
            return redirect(url_for("auth.login_route"))
        except cognito_client.exceptions.UserNotFoundException:
            flash("Login failed: User not found.", "danger")
            return redirect(url_for("auth.login_route"))
        except Exception as e:
            # Log the full error for debugging if it's not a Cognito specific one
            print(f"[ERROR] Login exception: {type(e).__name__} - {str(e)}", flush=True)
            flash(f"Login failed: An unexpected error occurred. Please try again.", "danger")
            return redirect(url_for("auth.login_route"))

    return render_template("login.html")