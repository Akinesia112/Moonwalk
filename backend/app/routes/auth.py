from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import os, hashlib, time, secrets, json, urllib.request, urllib.error
from pathlib import Path
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)

DATA_DIR = Path(os.path.dirname(__file__)) / ".." / "data"
DATA_DIR.mkdir(exist_ok=True)
USERS_FILE  = DATA_DIR / "users.json"
TOKENS_FILE = DATA_DIR / "tokens.json"

def _load(path: Path) -> dict:
    try:
        return json.loads(path.read_text()) if path.exists() else {}
    except Exception:
        return {}

def _save(path: Path, data: dict):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SMTP_HOST  = os.getenv("SMTP_HOST", "")
SMTP_PORT  = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER  = os.getenv("SMTP_USER", "")
SMTP_PASS  = os.getenv("SMTP_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "onboarding@resend.dev")
APP_URL    = os.getenv("APP_URL", "http://localhost:3000")

def _send_email(to: str, subject: str, html: str):
    if RESEND_API_KEY:
        payload = json.dumps({"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html}).encode()
        req = urllib.request.Request(
            "https://api.resend.com/emails", data=payload,
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read())
                print(f"[EMAIL SENT via Resend] id={result.get('id')} to={to}")
                return
        except Exception as e:
            print(f"[RESEND ERROR] {e}")
            return
    if SMTP_HOST and SMTP_USER:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = EMAIL_FROM
        msg["To"]      = to
        msg.attach(MIMEText(html, "html"))
        try:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as s:
                s.starttls()
                s.login(SMTP_USER, SMTP_PASS)
                s.sendmail(EMAIL_FROM, [to], msg.as_string())
                print(f"[EMAIL SENT via SMTP] to={to}")
                return
        except Exception as e:
            print(f"[SMTP ERROR] {e}")
            return
    print(f"[EMAIL NOT SENT] To: {to} | Subject: {subject}")

def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def _make_token(length=32) -> str:
    return secrets.token_urlsafe(length)

TOKEN_TTL  = 60 * 60 * 24 * 7
VERIFY_TTL = 60 * 60 * 24
RESET_TTL  = 60 * 30

PLACEHOLDER_DOMAIN = "placeholder.local"

def _is_placeholder_email(email: str) -> bool:
    return email.endswith(f"@{PLACEHOLDER_DOMAIN}")

class RegisterRequest(BaseModel):
    email: Optional[str] = None
    password: str
    username: str
    role: Optional[str] = "junior_artist"

class LoginRequest(BaseModel):
    # Supports login by username or email
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

class ForgotRequest(BaseModel):
    email: Optional[str] = None

class ResetRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class VerifyEmailRequest(BaseModel):
    token: str

def _get_user_by_email(email: str) -> Optional[dict]:
    users = _load(USERS_FILE)
    return users.get(email.lower())

def _get_user_by_username(username: str) -> Optional[dict]:
    """Look up username (case-insensitive)"""
    users = _load(USERS_FILE)
    username_lower = username.lower()
    for u in users.values():
        if u.get("username", "").lower() == username_lower:
            return u
    return None

def _require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    tokens = _load(TOKENS_FILE)
    entry  = tokens.get(credentials.credentials)
    if not entry or entry["expires"] < time.time():
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    user = _get_user_by_email(entry["email"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/register")
async def register(body: RegisterRequest):
    users = _load(USERS_FILE)

    # Use username as key; use email if provided, otherwise generate a placeholder
    username = body.username.strip()
    if len(username) < 2:
        raise HTTPException(status_code=400, detail="Username too short")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Check if username is already taken
    if _get_user_by_username(username):
        raise HTTPException(status_code=409, detail="Username already taken")

    email = (body.email or f"{username}@{PLACEHOLDER_DOMAIN}").lower().strip()
    if email in users:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Placeholder email → directly verified, no verification flow needed
    is_placeholder = _is_placeholder_email(email)
    verify_token   = None if is_placeholder else _make_token()

    users[email] = {
        "email":          email,
        "username":       username,
        "password_hash":  _hash(body.password),
        "role":           body.role if body.role in ("admin", "senior_artist", "junior_artist") else "junior_artist",
        "verified":       is_placeholder,   # ← placeholder is directly True
        "verify_token":   verify_token,
        "verify_expires": None if is_placeholder else time.time() + VERIFY_TTL,
        "created_at":     time.time(),
        "reset_token":    None,
        "reset_expires":  None,
    }
    _save(USERS_FILE, users)

    if not is_placeholder and verify_token:
        link = f"{APP_URL}/auth/verify?token={verify_token}&email={email}"
        _send_email(
            email,
            "Moonwalk VFX — Verify Your Email",
            f"""<h2>Welcome to Moonwalk VFX</h2>
            <p>Hi {username}, please click the link below to verify your email:</p>
            <a href="{link}" style="padding:10px 20px;background:#0d9488;color:white;border-radius:6px;text-decoration:none;">Verify Email</a>
            <p style="color:#888;font-size:12px;">This link is valid for 24 hours.</p>"""
        )

    return {"message": "Registration successful", "email": email, "verified": is_placeholder}


@router.post("/login")
async def login(body: LoginRequest):
    # Supports login by username or email
    user = None
    if body.username:
        user = _get_user_by_username(body.username)
    if user is None and body.email:
        user = _get_user_by_email(body.email)
    # Also try finding username as email (backward compatibility)
    if user is None and body.username and "@" in body.username:
        user = _get_user_by_email(body.username)

    if not user or user["password_hash"] != _hash(body.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.get("verified", False):
        raise HTTPException(status_code=403, detail="Please verify your email before signing in")

    token  = _make_token()
    tokens = _load(TOKENS_FILE)
    tokens[token] = {"email": user["email"], "expires": time.time() + TOKEN_TTL}
    _save(TOKENS_FILE, tokens)

    return {
        "token":    token,
        "username": user["username"],
        "email":    user["email"],
        "role":     user.get("role", "junior_artist"),
        "message":  "Login successful",
    }


@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials:
        tokens = _load(TOKENS_FILE)
        tokens.pop(credentials.credentials, None)
        _save(TOKENS_FILE, tokens)
    return {"message": "Logged out"}


@router.get("/me")
async def me(user: dict = Depends(_require_auth)):
    return {
        "email":    user["email"],
        "username": user["username"],
        "role":     user.get("role", "junior_artist"),
        "verified": user.get("verified", False),
    }


@router.get("/admin/users")
async def list_users(user: dict = Depends(_require_auth)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    users = _load(USERS_FILE)
    return [
        {"email": u["email"], "username": u["username"], "role": u.get("role","junior_artist"),
         "verified": u.get("verified", False), "created_at": u.get("created_at", 0)}
        for u in users.values()
    ]


@router.post("/admin/users")
async def create_user(body: RegisterRequest, user: dict = Depends(_require_auth)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    users = _load(USERS_FILE)
    email = (body.email or f"{body.username.strip()}@{PLACEHOLDER_DOMAIN}").lower().strip()
    if email in users:
        raise HTTPException(status_code=409, detail="Email already registered")
    if _get_user_by_username(body.username.strip()):
        raise HTTPException(status_code=409, detail="Username already taken")
    users[email] = {
        "email": email, "username": body.username.strip(),
        "password_hash": _hash(body.password), "role": "junior_artist",
        "verified": True, "verify_token": None, "verify_expires": None,
        "created_at": time.time(), "reset_token": None, "reset_expires": None,
    }
    _save(USERS_FILE, users)
    return {"message": "User created", "email": email}


@router.delete("/admin/users/{email}")
async def delete_user(email: str, user: dict = Depends(_require_auth)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    users = _load(USERS_FILE)
    if email not in users:
        raise HTTPException(status_code=404, detail="User not found")
    del users[email]
    _save(USERS_FILE, users)
    return {"message": "User deleted"}


@router.patch("/admin/users/{email}/role")
async def update_role(email: str, role: str, user: dict = Depends(_require_auth)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if role not in ("admin", "senior_artist", "junior_artist"):
        raise HTTPException(status_code=400, detail="Invalid role")
    users = _load(USERS_FILE)
    if email not in users:
        raise HTTPException(status_code=404, detail="User not found")
    users[email]["role"] = role
    _save(USERS_FILE, users)
    return {"message": "Role updated"}


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest):
    users = _load(USERS_FILE)
    user  = next((u for u in users.values() if u.get("verify_token") == body.token), None)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    if user.get("verify_expires", 0) < time.time():
        raise HTTPException(status_code=400, detail="Verification token expired")
    email = user["email"]
    users[email]["verified"]       = True
    users[email]["verify_token"]   = None
    users[email]["verify_expires"] = None
    _save(USERS_FILE, users)
    return {"message": "Email verified successfully"}


@router.post("/forgot-password")
async def forgot_password(body: ForgotRequest):
    if not body.email:
        raise HTTPException(status_code=400, detail="Email required")
    email = body.email.lower().strip()
    users = _load(USERS_FILE)
    if email not in users:
        return {"message": "If that email is registered, a reset link has been sent."}
    reset_token = _make_token()
    users[email]["reset_token"]   = reset_token
    users[email]["reset_expires"] = time.time() + RESET_TTL
    _save(USERS_FILE, users)
    link = f"{APP_URL}/auth/reset-password?token={reset_token}"
    _send_email(email, "Moonwalk VFX — Reset Your Password",
        f"""<h2>Reset Your Password</h2>
        <a href="{link}" style="padding:10px 20px;background:#0d9488;color:white;border-radius:6px;text-decoration:none;">Reset Password</a>
        <p style="color:#888;font-size:12px;">This link is valid for 30 minutes.</p>""")
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetRequest):
    users = _load(USERS_FILE)
    user  = next((u for u in users.values() if u.get("reset_token") == body.token), None)
    if not user or user.get("reset_expires", 0) < time.time():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    email = user["email"]
    users[email]["password_hash"] = _hash(body.new_password)
    users[email]["reset_token"]   = None
    users[email]["reset_expires"] = None
    _save(USERS_FILE, users)
    tokens = _load(TOKENS_FILE)
    tokens = {k: v for k, v in tokens.items() if v["email"] != email}
    _save(TOKENS_FILE, tokens)
    return {"message": "Password reset successful"}


@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, user: dict = Depends(_require_auth)):
    if user["password_hash"] != _hash(body.old_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    users = _load(USERS_FILE)
    users[user["email"]]["password_hash"] = _hash(body.new_password)
    _save(USERS_FILE, users)
    return {"message": "Password changed successfully"}


@router.get("/config")
async def get_auth_config():
    return {"auth_required": True}

@router.get("/health")
async def auth_health():
    return {"status": "healthy", "timestamp": str(time.time())}