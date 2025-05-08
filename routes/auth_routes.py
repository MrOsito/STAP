# routes/auth_routes.py

from flask import Blueprint, session, redirect, url_for, flash, request, render_template
from config import AWS_REGION, CLIENT_ID # Assuming these are securely configured
from services.api_helpers import get_profiles # Assuming get_profiles handles its own errors well

import boto3
import botocore # For more specific Boto3 exception handling
import logging # Import the logging module

# --- Logger Setup ---
# It's good practice to get a logger specific to this module
logger = logging.getLogger(__name__)
# Basic configuration for logging (ideally, configure this globally in your app.py)
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/logout")
def logout():
    """Clears the session and logs the user out."""
    session.clear()
    flash("You have been logged out.", "info")
    logger.info("User logged out.")
    return redirect(url_for("auth.login_route"))

@auth_bp.route("/", methods=["GET", "POST"])
@auth_bp.route("/login", methods=["GET", "POST"])
def login_route():
    """Handles user login.
    Validates credentials against AWS Cognito and fetches user profiles.
    """
    if request.method == "POST":
        # --- Input Retrieval ---
        branch = request.form.get("branch", "").strip() # .get with default, and strip whitespace
        username_input = request.form.get("username", "").strip()
        password = request.form.get("password", "") # Password should not be stripped typically

        # --- Basic Input Validation (Conceptual - consider WTForms or Marshmallow for robust validation) ---
        if not branch:
            flash("Branch selection is required.", "danger")
            return redirect(url_for("auth.login_route"))
        if not username_input:
            flash("Member Number is required.", "danger")
            return redirect(url_for("auth.login_route"))
        if not password: # Basic check, Cognito will handle password complexity
            flash("Password is required.", "danger")
            return redirect(url_for("auth.login_route"))

        # Consider more specific validation for 'branch' and 'username_input' formats
        # e.g., if 'branch' must be one of specific values, or 'username_input' must be numeric.
        # This helps prevent unexpected input before hitting Cognito.
        # For example, a simple regex or length check:
        # import re
        # if not re.match(r"^[A-Z]{2,3}-$", branch): # Example: Expecting "NSW-"
        #     flash("Invalid branch format.", "danger")
        #     return redirect(url_for("auth.login_route"))
        # if not re.match(r"^[0-9]+$", username_input):
        #     flash("Member Number must be numeric.", "danger")
        #     return redirect(url_for("auth.login_route"))

        # Concatenate username as per your existing logic
        # Ensure this concatenation doesn't inadvertently create problematic strings for Cognito
        # if branch or username_input could contain special characters not intended for Cognito usernames.
        # The .strip() above helps, but be mindful of Cognito's username constraints.
        cognito_username = branch + username_input

        try:
            client = boto3.client("cognito-idp", region_name=AWS_REGION)
            logger.info(f"Attempting login for user: {cognito_username}")

            response = client.initiate_auth(
                ClientId=CLIENT_ID,
                AuthFlow="USER_PASSWORD_AUTH", # Ensure this flow is enabled for your App Client in Cognito
                AuthParameters={"USERNAME": cognito_username, "PASSWORD": password}
            )

            id_token = response.get('AuthenticationResult', {}).get('IdToken')
            if not id_token:
                logger.error(f"Login failed for {cognito_username}: IdToken not found in Cognito response.")
                flash("Login failed: Could not retrieve authentication token.", "danger")
                return redirect(url_for("auth.login_route"))

            # Fetch profile data using the obtained ID token
            # Assuming get_profiles is robust and handles its own potential errors (e.g., API down)
            profile_data = get_profiles(id_token)
            if not profile_data or "profiles" not in profile_data or not profile_data["profiles"]:
                logger.warning(f"Profile data not found or empty for user {cognito_username} after successful login.")
                # Decide if this is a critical failure or if user can proceed with minimal data
                # For now, let's treat it as potentially problematic but continue if basic auth worked.
                # You might want to flash a warning or deny login if profile is essential.
                profile = {} # Default to empty profile
            else:
                profile = profile_data["profiles"][0] # Assuming the first profile is the relevant one

            # Populate session data
            session["user"] = {
                "username": cognito_username, # Store the Cognito username used for auth
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
            session.permanent = True # Make the session adhere to PERMANENT_SESSION_LIFETIME
            logger.info(f"User {cognito_username} logged in successfully. Member ID: {session['user'].get('member_id')}")
            return redirect(url_for("dashboard.dashboard"))

        except botocore.exceptions.ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "NotAuthorizedException":
                logger.warning(f"Login failed for {cognito_username}: Invalid credentials. (NotAuthorizedException)")
                flash("Login failed: Invalid username or password.", "danger")
            elif error_code == "UserNotFoundException":
                logger.warning(f"Login failed: User {cognito_username} not found. (UserNotFoundException)")
                flash("Login failed: User not found.", "danger")
            elif error_code == "PasswordResetRequiredException":
                logger.warning(f"Login failed: User {cognito_username} password reset required.")
                flash("Login failed: Password reset is required for this account.", "warning") # or redirect to password reset
            # Add more specific Cognito error handling as needed
            # e.g., UserNotConfirmedException
            else:
                logger.error(f"Cognito ClientError during login for {cognito_username}: {e}", exc_info=True)
                flash(f"Login failed due to a Cognito service error. Please try again later.", "danger")
            return redirect(url_for("auth.login_route"))

        except Exception as e:
            # Catch any other unexpected exceptions during the login process
            logger.error(f"An unexpected error occurred during login for user {username_input} (branch: {branch}): {e}", exc_info=True)
            flash("An unexpected error occurred during login. Please try again.", "danger")
            return redirect(url_for("auth.login_route"))

    # For GET request, just render the login page
    return render_template("login.html")