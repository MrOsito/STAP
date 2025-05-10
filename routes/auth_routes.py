# routes/auth_routes.py
from flask import Blueprint, session, redirect, url_for, flash, request, render_template
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
        branch    = escape(form.branch.data)
        username  = escape(form.username.data)
        password  = form.password.data

        try:
            import boto3
            aws = boto3.client('cognito-idp', region_name=AWS_REGION)
            resp = aws.initiate_auth(
                ClientId=CLIENT_ID,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={
                    'USERNAME': f'{branch}{username}',
                    'PASSWORD': password
                }
            )
            id_token = resp['AuthenticationResult']['IdToken']

            # Store token and username only; profile will be fetched in JS
            session['user'] = {
                'username': f'{branch}{username}',
                'id_token': id_token,
            }
            session.permanent = True
            return redirect(url_for('dashboard.dashboard'))

        except Exception as e:
            flash(escape(f"Login failed: {str(e)}"), 'danger')
            return redirect(url_for('auth.login_route'))

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
        return jsonify(profile_data)
    except Exception as e:
        print(f"[ERROR] /profile route: {e}")
        return jsonify({"error": str(e)}), 500
