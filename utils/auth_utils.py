# utils/auth_utils.py
from functools import wraps
from flask import session, redirect, url_for

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user" not in session:
            return redirect(url_for("auth.login_route"))  # FIXED
        return f(*args, **kwargs)
    return decorated

