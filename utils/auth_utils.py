import logging
from functools import wraps
from flask import session, redirect, url_for, request

# Configure logging (assuming basicConfig is done in app.py or elsewhere)
logger = logging.getLogger(__name__)

def login_required(f):
    """
    Decorator that redirects to the login page if the user is not logged in.
    Assumes user authentication status is determined by the presence of
    'user' in the Flask session.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Check if 'user' key exists in the session
            if "user" not in session or not session["user"]:
                # Log the attempt to access a protected route by an unauthenticated user
                logger.warning(f"Attempted to access protected route {request.path} without being logged in.")
                # Redirect to the login page, preserving the attempted URL in the 'next' query parameter
                # This allows redirection back after successful login.
                # Security Note: The login route itself must validate the 'next' parameter
                # to prevent open redirect vulnerabilities. Ensure url_has_allowed_host_and_scheme
                # or similar validation is used in the login route.
                return redirect(url_for("auth.login", next=request.url))

            # Optional: Log successful access to a protected route
            # user_identifier = session["user"].get("username", "Unknown User")
            # logger.debug(f"User {user_identifier} successfully accessed protected route {request.path}")

            # If 'user' is in the session, the user is considered logged in, proceed to the decorated function
            return f(*args, **kwargs)
        except KeyError:
            # This should ideally not happen if the initial check 'if "user" not in session' is robust,
            # but as a safeguard against unexpected session state.
            logger.error(f"KeyError accessing session['user'] for route {request.path}. Redirecting to login.", exc_info=True)
            return redirect(url_for("auth.login", next=request.url))
        except Exception as e:
             # Catch any other unexpected errors within the decorator
             logger.error(f"An unexpected error occurred in login_required decorator for route {request.path}: {e}", exc_info=True)
             # Re-raise the exception or return a generic error response depending on desired behavior
             # For a decorator, re-raising allows the route's error handler (if any) to catch it.
             raise


    return decorated_function

# Add other authentication utility functions here as needed in the future
# e.g., functions for creating/managing user sessions, handling user roles, etc.