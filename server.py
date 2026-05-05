"""
AuthVault — server.py
A lightweight Flask authentication server with:
  - RESTful JSON API endpoints
  - In-memory user store (demo) + optional JSON file persistence
  - Basic session tokens
  - CORS support for local frontend development

Run:
    pip install flask flask-cors
    python server.py

API base: http://localhost:5000/api
"""

import json
import os
import time
import uuid
import hashlib
import re
from pathlib import Path

try:
    from flask import Flask, request, jsonify, send_from_directory
    from flask_cors import CORS
except ImportError:
    print("\n[AuthVault] Flask not found. Install it with:")
    print("    pip install flask flask-cors\n")
    raise SystemExit(1)


# ═══════════════════════════════════════════════════════════════
# APP SETUP
# ═══════════════════════════════════════════════════════════════

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)  # Allow cross-origin requests from the frontend

# Path for persisting user data between server restarts
DATA_FILE = Path("users_data.json")


# ═══════════════════════════════════════════════════════════════
# IN-MEMORY STORES
# ═══════════════════════════════════════════════════════════════

# { user_id: { id, name, username, email, password_hash, created_at } }
users_store: dict = {}

# { token: { user_id, created_at, expires_at } }
sessions_store: dict = {}

# How long a session token is valid (seconds)
SESSION_TTL = 60 * 60 * 24  # 24 hours


# ═══════════════════════════════════════════════════════════════
# PERSISTENCE HELPERS
# ═══════════════════════════════════════════════════════════════

def load_users() -> None:
    """Load users from the JSON data file (if it exists)."""
    global users_store
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                users_store = json.load(f)
            print(f"[AuthVault] Loaded {len(users_store)} user(s) from {DATA_FILE}")
        except (json.JSONDecodeError, IOError) as e:
            print(f"[AuthVault] Warning: could not load data file — {e}")


def save_users() -> None:
    """Persist the users store to the JSON data file."""
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(users_store, f, indent=2)
    except IOError as e:
        print(f"[AuthVault] Warning: could not save data file — {e}")


# ═══════════════════════════════════════════════════════════════
# SECURITY HELPERS
# ═══════════════════════════════════════════════════════════════

def hash_password(password: str) -> str:
    """
    Hash a password using SHA-256 with a salt.
    NOTE: In production use bcrypt or argon2.
    """
    salt = "authvault_demo_salt"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def generate_token() -> str:
    """Generate a cryptographically random session token."""
    return str(uuid.uuid4()).replace("-", "")


def get_user_by_email(email: str) -> dict | None:
    """Find a user by email address (case-insensitive)."""
    email_lower = email.strip().lower()
    for user in users_store.values():
        if user["email"].lower() == email_lower:
            return user
    return None


def validate_email(email: str) -> bool:
    """Basic email format validation."""
    pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    return bool(re.match(pattern, email.strip()))


def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    Returns (is_valid, error_message).
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain an uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain a lowercase letter"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain a number"
    if not re.search(r"[!@#$%^&*()\-_=+\[\]{};':\"\\|,.<>/?`~]", password):
        return False, "Password must contain a special character"
    return True, ""


def get_session_user(req) -> dict | None:
    """
    Extract and validate the session token from the Authorization header.
    Returns the user dict if the token is valid, else None.
    Expected header: Authorization: Bearer <token>
    """
    auth_header = req.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:].strip()
    session = sessions_store.get(token)
    if not session:
        return None

    # Check expiry
    if time.time() > session["expires_at"]:
        del sessions_store[token]  # cleanup
        return None

    return users_store.get(session["user_id"])


# ═══════════════════════════════════════════════════════════════
# ROUTES — STATIC FILES
# ═══════════════════════════════════════════════════════════════

@app.route("/")
def serve_index():
    """Serve the main HTML file."""
    return send_from_directory(".", "index.html")


# ═══════════════════════════════════════════════════════════════
# API — AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.route("/api/register", methods=["POST"])
def api_register():
    """
    Register a new user.
    Body: { name, username, email, password }
    Returns: { success, message, user, token }
    """
    data = request.get_json(silent=True) or {}

    # ── Extract fields ──
    name     = (data.get("name") or "").strip()
    username = (data.get("username") or "").strip()
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    # ── Validate required fields ──
    if not all([name, username, email, password]):
        return jsonify({
            "success": False,
            "message": "All fields (name, username, email, password) are required."
        }), 400

    if not validate_email(email):
        return jsonify({"success": False, "message": "Invalid email format."}), 400

    # ── Validate password strength ──
    pw_valid, pw_error = validate_password(password)
    if not pw_valid:
        return jsonify({"success": False, "message": pw_error}), 400

    # ── Duplicate check ──
    if get_user_by_email(email):
        return jsonify({
            "success": False,
            "message": "An account with this email already exists."
        }), 409

    # ── Create user ──
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    new_user = {
        "id":            user_id,
        "name":          name,
        "username":      username,
        "email":         email,
        "password_hash": hash_password(password),
        "created_at":    time.time(),
    }
    users_store[user_id] = new_user
    save_users()

    # ── Create session token ──
    token = generate_token()
    sessions_store[token] = {
        "user_id":    user_id,
        "created_at": time.time(),
        "expires_at": time.time() + SESSION_TTL,
    }

    # Return safe user object (no password hash)
    safe_user = {k: v for k, v in new_user.items() if k != "password_hash"}

    return jsonify({
        "success": True,
        "message": f"Welcome, {name.split()[0]}! Account created successfully.",
        "user":    safe_user,
        "token":   token,
    }), 201


@app.route("/api/login", methods=["POST"])
def api_login():
    """
    Authenticate a user.
    Body: { email, password }
    Returns: { success, message, user, token }
    """
    data = request.get_json(silent=True) or {}

    email    = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    # Find user
    user = get_user_by_email(email)
    if not user or user["password_hash"] != hash_password(password):
        return jsonify({
            "success": False,
            "message": "Invalid email or password."
        }), 401

    # Create session token
    token = generate_token()
    sessions_store[token] = {
        "user_id":    user["id"],
        "created_at": time.time(),
        "expires_at": time.time() + SESSION_TTL,
    }

    safe_user = {k: v for k, v in user.items() if k != "password_hash"}

    return jsonify({
        "success": True,
        "message": f"Welcome back, {user['name'].split()[0]}!",
        "user":    safe_user,
        "token":   token,
    }), 200


@app.route("/api/logout", methods=["POST"])
def api_logout():
    """
    Invalidate the session token.
    Header: Authorization: Bearer <token>
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        sessions_store.pop(token, None)

    return jsonify({"success": True, "message": "Logged out successfully."}), 200


@app.route("/api/forgot-password", methods=["POST"])
def api_forgot_password():
    """
    Simulate sending a password-reset email.
    Body: { email }
    Always returns success to avoid user enumeration.
    """
    data  = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email or not validate_email(email):
        return jsonify({"success": False, "message": "Valid email is required."}), 400

    # In a real app: generate a time-limited reset token and email it.
    # Here we just simulate it.
    user = get_user_by_email(email)
    if user:
        print(f"[AuthVault] Password reset requested for: {email}")
        # Would send email here

    # Always return success (security best practice — don't reveal if email exists)
    return jsonify({
        "success": True,
        "message": "If an account with that email exists, a reset link has been sent."
    }), 200


# ═══════════════════════════════════════════════════════════════
# API — PROTECTED ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.route("/api/me", methods=["GET"])
def api_me():
    """
    Get the current user's profile.
    Header: Authorization: Bearer <token>
    """
    user = get_session_user(request)
    if not user:
        return jsonify({"success": False, "message": "Unauthorized."}), 401

    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    return jsonify({"success": True, "user": safe_user}), 200


# ═══════════════════════════════════════════════════════════════
# API — UTILITY ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def api_health():
    """Health check endpoint."""
    return jsonify({
        "status":        "ok",
        "service":       "AuthVault API",
        "users_count":   len(users_store),
        "sessions_count": len(sessions_store),
        "timestamp":     time.time(),
    }), 200


@app.route("/api/users", methods=["GET"])
def api_users():
    """
    List all registered users (demo only — remove in production!).
    Omits password hashes.
    """
    safe_list = [
        {k: v for k, v in u.items() if k != "password_hash"}
        for u in users_store.values()
    ]
    return jsonify({
        "success": True,
        "count":   len(safe_list),
        "users":   safe_list,
    }), 200


# ═══════════════════════════════════════════════════════════════
# ERROR HANDLERS
# ═══════════════════════════════════════════════════════════════

@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "message": "Endpoint not found."}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "message": "Method not allowed."}), 405


@app.errorhandler(500)
def server_error(e):
    return jsonify({"success": False, "message": "Internal server error."}), 500


# ═══════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    load_users()  # Load any previously saved users

    print("\n" + "═" * 50)
    print("  🔐 AuthVault Server")
    print("═" * 50)
    print("  Frontend : http://localhost:5000")
    print("  API Base : http://localhost:5000/api")
    print("  Health   : http://localhost:5000/api/health")
    print("  Users    : http://localhost:5000/api/users")
    print("═" * 50 + "\n")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True,         # Set to False in production
    )