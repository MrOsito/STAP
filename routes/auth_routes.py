from flask import Blueprint, session, redirect, url_for, flash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "info")
    return redirect(url_for("auth.login_route"))


@auth_bp.route("/login", methods=["GET", "POST"])
def login_route():
    if request.method == "POST":
        import boto3
        branch = request.form["branch"]
        username = branch + request.form["username"]
        password = request.form["password"]
        try:
            client = boto3.client("cognito-idp", region_name=AWS_REGION)
            response = client.initiate_auth(
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
                "last_active": datetime.utcnow().isoformat(),
            }
            session.permanent = True
            return redirect(url_for("dashboard.dashboard"))

        except Exception as e:
            flash(f"Login failed: {str(e)}", "danger")
            return redirect(url_for("auth.login_route"))

    return render_template("login.html")