# routes/auth_routes.py
from flask import Blueprint, session, redirect, url_for, flash, request, render_template
from flask_wtf import FlaskForm, CSRFProtect
from wtforms import StringField, PasswordField, SelectField
from wtforms.validators import DataRequired, Regexp
from config import AWS_REGION, CLIENT_ID, USER_POOL_ID
from services.api_helpers import get_profiles
from markupsafe import escape

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

from config import CLIENT_ID, AWS_REGION, USER_POOL_ID

@auth_bp.route('/', methods=['GET', 'POST'])
@auth_bp.route('/login', methods=['GET', 'POST'])
def login_route():
    form = LoginForm()
    return render_template(
        "login.html",
        form=form,
        aws_region=AWS_REGION,
        client_id=CLIENT_ID,
        user_pool_id=USER_POOL_ID
    )

