from playwright.sync_api import sync_playwright

SITE = "https://moonshine.shotgunstudio.com"
PROFILE_DIR = ".pw_profile"  # 會存 cookie/session

with sync_playwright() as p:
    ctx = p.chromium.launch_persistent_context(PROFILE_DIR, headless=False)
    page = ctx.new_page()
    page.goto(f"{SITE}/user/login", wait_until="domcontentloaded")
    print("👉 請在打開的瀏覽器手動登入，登入完成後停在任意 ShotGrid 頁面，再回來這裡按 Enter")
    input()
    ctx.close()
