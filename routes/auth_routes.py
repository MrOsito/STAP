# routes/auth_routes.py
from flask import Blueprint, render_template

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/', methods=['GET'])
@auth_bp.route('/login', methods=['GET'])
def login_route():
    """
    Render the login page. Authentication is now handled client-side.
    """
    return render_template('login.html')
