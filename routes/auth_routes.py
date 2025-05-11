# routes/auth_routes.py
from flask import Blueprint, session, redirect, url_for, flash, render_template
from flask_wtf import FlaskForm, CSRFProtect
from wtforms import StringField, PasswordField, SelectField
from wtforms.validators import DataRequired, Regexp
from config import AWS_REGION, CLIENT_ID
from services.api_helpers import get_profiles
from markupsafe import escape
import time


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
    start_time = time.time()
    form = LoginForm()
    if form.validate_on_submit():
        # Escape sanitized inputs
        branch    = escape(form.branch.data)
        username  = escape(form.username.data)
        password  = form.password.data  # password isn't echoed back
        print(f"⏱️ Just prior to login {time.time() - start_time:.2f} seconds", flush=True)
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
            print(f"⏱️ After login {time.time() - start_time:.2f} seconds and fetch of id_token {id_token}", flush=True)
            # fetch and store profile

            profile_data = get_profiles(id_token)
            print(f"⏱️ After get_profiles {time.time() - start_time:.2f} seconds and fetch of id_token {id_token}", flush=True)

            profile = profile_data.get('profiles', [{}])[0]
            session['user'] = {
                'username': f'{branch}{username}',
                'id_token': id_token,
                'member_id': profile.get('member', {}).get('id'),
                'member_name': profile.get('member', {}).get('name'),
                'unit_id': profile.get('unit', {}).get('id'),
                'unit_name': profile.get('unit', {}).get('name'),
                'group_id': profile.get('group', {}).get('id'),
                'group_name': profile.get('group', {}).get('name'),
            }
            session.permanent = True
            print(f"⏱️ After populating session user {time.time() - start_time:.2f} seconds and fetch of id_token {id_token}", flush=True)

            return redirect(url_for('dashboard.dashboard'))

        except Exception as e:
            # Always escape exception messages
            flash(escape(f"Login failed: {str(e)}"), 'danger')
            return redirect(url_for('auth.login_route'))

    return render_template('login.html', form=form)
