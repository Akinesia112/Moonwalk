"""
routes/auth.py — Complete authentication system
- Register with email verification
- Login with JWT token
- Forgot password / reset password via email
- Change password
- Token-based session

EMAIL SETUP (choose one):

Option A — Resend (easiest, free 100 emails/day):
  1. Sign up at https://resend.com
  2. Get API key → set RESEND_API_KEY=re_xxxx
  3. Set EMAIL_FROM=onboarding@resend.dev (or your verified domain)

Option B — Gmail SMTP:
  1. Enable 2FA on Gmail
  2. Generate App Password: myaccount.google.com → Security → App Passwords
  3. Set SMTP_HOST=smtp.gmail.com SMTP_PORT=587
     SMTP_USER=yourmail@gmail.com SMTP_PASS=your_app_password
     EMAIL_FROM=yourmail@gmail.com

Set APP_URL=http://localhost:3000 (or your deployed URL)
"""
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

# ── Storage path ──────────────────────────────────────────────
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

# ── Email config ──────────────────────────────────────────────
# Option A: Resend
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
# Option B: SMTP (Gmail etc)
SMTP_HOST  = os.getenv("SMTP_HOST", "")
SMTP_PORT  = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER  = os.getenv("SMTP_USER", "")
SMTP_PASS  = os.getenv("SMTP_PASS", "")

EMAIL_FROM = os.getenv("EMAIL_FROM", "onboarding@resend.dev")
APP_URL    = os.getenv("APP_URL", "http://localhost:3000")

def _send_email(to: str, subject: str, html: str):
    """
    Send email via Resend API (preferred) or SMTP.
    Falls back to console print if neither is configured.
    """
    # ── Resend API ─────────────────────────────────────────
    if RESEND_API_KEY:
        payload = json.dumps({
            "from": EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        }).encode()
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read())
                print(f"[EMAIL SENT via Resend] id={result.get('id')} to={to}")
                return
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"[RESEND ERROR] {e.code}: {body}")
            return
        except Exception as e:
            print(f"[RESEND ERROR] {e}")
            return

    # ── SMTP (Gmail etc) ────────────────────────────────────
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

    # ── Console fallback ────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"[EMAIL NOT SENT — no SMTP/Resend configured]")
    print(f"To: {to}")
    print(f"Subject: {subject}")
    # Print clickable links from the HTML
    import re
    links = re.findall(r'href="([^"]+)"', html)
    for link in links:
        print(f"Link: {link}")
    print(f"{'='*60}\n")
    print("→ To enable real emails, set RESEND_API_KEY or SMTP_HOST+SMTP_USER+SMTP_PASS")

def _hash(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def _make_token(length=32) -> str:
    return secrets.token_urlsafe(length)

TOKEN_TTL   = 60 * 60 * 24 * 7   # 7 days session
VERIFY_TTL  = 60 * 60 * 24       # 24h email verify
RESET_TTL   = 60 * 30             # 30min password reset

# ── Pydantic models ───────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotRequest(BaseModel):
    email: str

class ResetRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class VerifyEmailRequest(BaseModel):
    token: str

# ── Helpers ───────────────────────────────────────────────────
def _get_user_by_email(email: str) -> Optional[dict]:
    users = _load(USERS_FILE)
    return users.get(email.lower())

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

# ── Routes ────────────────────────────────────────────────────

@router.post("/register")
async def register(body: RegisterRequest):
    users = _load(USERS_FILE)
    email = body.email.lower().strip()

    if email in users:
        raise HTTPException(status_code=409, detail="Email already registered")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if len(body.username.strip()) < 2:
        raise HTTPException(status_code=400, detail="Username too short")

    verify_token = _make_token()
    users[email] = {
        "email":          email,
        "username":       body.username.strip(),
        "password_hash":  _hash(body.password),
        "verified":       False,
        "verify_token":   verify_token,
        "verify_expires": time.time() + VERIFY_TTL,
        "created_at":     time.time(),
        "reset_token":    None,
        "reset_expires":  None,
    }
    _save(USERS_FILE, users)

    # Send verification email
    link = f"{APP_URL}/auth/verify?token={verify_token}&email={email}"
    _send_email(
        email,
        "Moonwalk VFX — 驗證您的電子郵件",
        f"""
        <h2>歡迎加入 Moonwalk VFX</h2>
        <p>Hi {body.username}，請點擊下方連結驗證您的電子郵件：</p>
        <a href="{link}" style="padding:10px 20px;background:#0d9488;color:white;border-radius:6px;text-decoration:none;">
          驗證電子郵件
        </a>
        <p style="color:#888;font-size:12px;margin-top:16px;">連結24小時內有效。如非本人操作請忽略此信。</p>
        <p style="color:#888;font-size:12px;">或複製此網址：{link}</p>
        """
    )
    return {"message": "Registration successful. Please check your email to verify your account.", "email": email}


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest):
    users = _load(USERS_FILE)
    # Find user by verify token
    user = next((u for u in users.values() if u.get("verify_token") == body.token), None)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    if user.get("verify_expires", 0) < time.time():
        raise HTTPException(status_code=400, detail="Verification token expired. Please register again.")

    email = user["email"]
    users[email]["verified"]       = True
    users[email]["verify_token"]   = None
    users[email]["verify_expires"] = None
    _save(USERS_FILE, users)
    return {"message": "Email verified successfully. You can now log in."}


@router.post("/login")
async def login(body: LoginRequest):
    email = body.email.lower().strip()
    user  = _get_user_by_email(email)

    if not user or user["password_hash"] != _hash(body.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user["verified"]:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

    # Create session token
    token   = _make_token()
    tokens  = _load(TOKENS_FILE)
    tokens[token] = {"email": email, "expires": time.time() + TOKEN_TTL}
    _save(TOKENS_FILE, tokens)

    return {
        "token":    token,
        "username": user["username"],
        "email":    email,
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
    return {"email": user["email"], "username": user["username"], "verified": user["verified"]}


@router.post("/forgot-password")
async def forgot_password(body: ForgotRequest):
    email = body.email.lower().strip()
    users = _load(USERS_FILE)
    # Always return success to prevent email enumeration
    if email not in users:
        return {"message": "If that email is registered, a reset link has been sent."}

    reset_token = _make_token()
    users[email]["reset_token"]   = reset_token
    users[email]["reset_expires"] = time.time() + RESET_TTL
    _save(USERS_FILE, users)

    link = f"{APP_URL}/auth/reset-password?token={reset_token}"
    _send_email(
        email,
        "Moonwalk VFX — 重設密碼",
        f"""
        <h2>重設您的密碼</h2>
        <p>點擊下方連結重設密碼（30分鐘內有效）：</p>
        <a href="{link}" style="padding:10px 20px;background:#0d9488;color:white;border-radius:6px;text-decoration:none;">
          重設密碼
        </a>
        <p style="color:#888;font-size:12px;margin-top:16px;">如非本人操作請忽略此信，您的密碼不會被更改。</p>
        <p style="color:#888;font-size:12px;">或複製此網址：{link}</p>
        """
    )
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetRequest):
    users = _load(USERS_FILE)
    user  = next((u for u in users.values() if u.get("reset_token") == body.token), None)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if user.get("reset_expires", 0) < time.time():
        raise HTTPException(status_code=400, detail="Reset token expired. Please request a new one.")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    email = user["email"]
    users[email]["password_hash"] = _hash(body.new_password)
    users[email]["reset_token"]   = None
    users[email]["reset_expires"] = None
    _save(USERS_FILE, users)

    # Invalidate all existing sessions for this user
    tokens = _load(TOKENS_FILE)
    tokens = {k: v for k, v in tokens.items() if v["email"] != email}
    _save(TOKENS_FILE, tokens)

    return {"message": "Password reset successful. Please log in with your new password."}


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


@router.post("/resend-verification")
async def resend_verification(body: ForgotRequest):
    email = body.email.lower().strip()
    users = _load(USERS_FILE)
    if email not in users:
        return {"message": "If that email is registered and unverified, a new link has been sent."}
    user = users[email]
    if user["verified"]:
        return {"message": "Email already verified."}

    verify_token = _make_token()
    users[email]["verify_token"]   = verify_token
    users[email]["verify_expires"] = time.time() + VERIFY_TTL
    _save(USERS_FILE, users)

    link = f"{APP_URL}/auth/verify?token={verify_token}&email={email}"
    _send_email(
        email,
        "Moonwalk VFX — 重新驗證電子郵件",
        f"""
        <h2>驗證您的電子郵件</h2>
        <a href="{link}" style="padding:10px 20px;background:#0d9488;color:white;border-radius:6px;text-decoration:none;">
          驗證電子郵件
        </a>
        <p style="color:#888;font-size:12px;">或複製：{link}</p>
        """
    )
    return {"message": "If that email is registered and unverified, a new link has been sent."}


# Legacy endpoints (backward compat)
@router.get("/config")
async def get_auth_config():
    return {"auth_required": True}

@router.get("/health")
async def auth_health():
    return {"status": "healthy", "timestamp": str(time.time())}