# routes/auth_routes.py
from flask import Blueprint, session, redirect, url_for, flash, render_template, jsonify
from flask_wtf import FlaskForm, CSRFProtect
from markupsafe import escape
from wtforms import StringField, PasswordField, SelectField
from wtforms.validators import DataRequired, Regexp
from config import AWS_REGION, CLIENT_ID
from services.api_helpers import get_profiles
from utils.auth_utils import login_required

# Initialize CSRF protection (in your app factory or app.py)
csrf = CSRFProtect()

auth_bp = Blueprint('auth', __name__)

# A simple WTForm for login with CSRF
class LoginForm(FlaskForm):
    branch = SelectField(
        'Branch',
        choices=[('', '-- Select --'), ('ACT-', 'ACT'), ('NSW-', 'NSW'), ('NT-', 'NT'),
                 ('QLD-', 'QLD'), ('SA-', 'SA'), ('TAS-', 'TAS')],
        validators=[DataRequired(message="Please select a branch.")]
    )
    username = StringField(
        'Member Number',
        validators=[
            DataRequired(message="Member number is required."),
            Regexp(r'^\d+$', message="Member number must be digits only.")
        ]
    )
    password = PasswordField('Password', validators=[DataRequired(message="Password is required.")])

@auth_bp.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login_route'))

@auth_bp.route('/', methods=['GET', 'POST'])
@auth_bp.route('/login', methods=['GET', 'POST'])
def login_route():
    form = LoginForm()
    if form.validate_on_submit():
        branch = escape(form.branch.data)
        username = escape(form.username.data)
        password = form.password.data
        full_username = f'{branch}{username}'

        try:
            import boto3
            aws = boto3.client('cognito-idp', region_name=AWS_REGION)
            resp = aws.initiate_auth(
                ClientId=CLIENT_ID,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={
                    'USERNAME': full_username,
                    'PASSWORD': password
                }
            )
            id_token = resp['AuthenticationResult']['IdToken']

            # >>> Fetch profile details immediately after getting id_token
            try:
                raw_profile_data = get_profiles(id_token)
                if not raw_profile_data or "profiles" not in raw_profile_data:
                    flash(escape("Login successful, but could not retrieve complete profile information. Some features might be limited."), 'warning')
                    # Fallback to minimal session if profile fetch fails or is empty
                    profile_details = {} 
                else:
                    profile_details = get_essential_profile_details_from_response(raw_profile_data)

                session['user'] = {
                    'username': full_username,
                    'id_token': id_token,
                    'member_id': profile_details.get('member_id'),
                    'unit_id': profile_details.get('unit_id'),
                    'group_id': profile_details.get('group_id'),
                    'member_name': profile_details.get('member_name')
                    # Add other essential fields from profile_details if needed
                }
                
                # Check if critical information like member_id is missing and handle
                if not session['user'].get('member_id'):
                     flash(escape("Login successful, but essential member ID is missing from profile. Calendar functionality may be affected."), 'danger')
                     # Decide if you want to redirect to logout or an error page, or let them proceed with limited functionality

                session.permanent = True # Ensure session is permanent
                return redirect(url_for('dashboard.dashboard'))

            except Exception as profile_error:
                # Log this error properly on the server
                print(f"[ERROR] Fetching/processing profile during login: {profile_error}")
                flash(escape(f"Login successful, but failed to fetch full profile details: {str(profile_error)}. Some features might be limited."), 'warning')
                # Fallback to minimal session if critical error during profile fetch
                session['user'] = {
                    'username': full_username,
                    'id_token': id_token
                }
                session.permanent = True
                return redirect(url_for('dashboard.dashboard')) # Or redirect to an error page or logout

        except Exception as e:
            # Log this error properly on the server
            print(f"[ERROR] Cognito login failed: {e}")
            flash(escape(f"Login failed: {str(e)}"), 'danger')
            # DO NOT redirect here, let the template re-render with the form and flash message
            return render_template('login.html', form=form) # Re-render login form with error

    return render_template('login.html', form=form)

'''
@auth_bp.route('/profile')
@login_required
def get_profile():
    try:
        id_token = session["user"]["id_token"]
        profile_data = get_profiles(id_token)
        return jsonify(profile_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
'''    

@auth_bp.route('/profile')
@login_required
def get_profile():
    try:
        user = session.get("user", {})
        print("[DEBUG] Session user:", user)
        id_token = user.get("id_token")
        if not id_token:
            raise ValueError("Missing id_token in session")
        profile_data = get_profiles(id_token)
        session['user']['member_id'] = profile_data.get('member', {}).get('id')
        return jsonify(profile_data)
    except Exception as e:
        print(f"[ERROR] /profile route: {e}")
        return jsonify({"error": str(e)}), 500
