# routes/auth_routes.py
from flask import Blueprint, render_template, redirect, url_for, request, session, jsonify

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/', methods=['GET'])
@auth_bp.route('/login', methods=['GET'])
def login_route():
    """
    Render the login page. Authentication is now handled client-side.
    """
    return render_template('login.html')

@auth_bp.route('/login', methods=['POST'])
def store_session():
    """
    Store the user data in the session after successful client-side authentication.
    """
    try:
        user_data = request.get_json()
        if not user_data:
            return jsonify({'error': 'No data provided'}), 400

        # Store the user data in the session
        session['user'] = user_data
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout')
def logout():
    """
    Handle logout by redirecting to login page.
    The actual logout (clearing window.userData) is handled client-side.
    """
    session.clear()
    return redirect(url_for('auth.login_route'))
