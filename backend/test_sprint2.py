import sys
import os
import subprocess
import time
import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = 'http://localhost:4000'

def run_tests():
    print("--- 1. Testing TypeScript Compilation ---")
    res = subprocess.run(['npx.cmd', 'tsc', '--noEmit'], cwd='backend', capture_output=True, text=True, env=os.environ.copy())
    if res.returncode != 0:
        print("TypeScript compilation failed:")
        print(res.stdout)
        print(res.stderr)
        sys.exit(1)
    print("[OK] TypeScript compilation passed cleanly!")

    print("\n--- 2. Starting Express Server ---")
    env = os.environ.copy()
    proc = subprocess.Popen(['npx.cmd', 'ts-node', 'index.ts'], cwd='backend', stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)
    
    try:
        health = None
        for attempt in range(15):
            time.sleep(1)
            try:
                r = requests.get(f"{BASE_URL}/api/health", timeout=2)
                if r.status_code == 200:
                    health = r.json()
                    break
            except Exception:
                pass

        print("Health response:", health)
        assert health is not None and health.get('status') == 'ok', "Health check failed to start"

        # Register user
        email = f"sprint2_user_{int(time.time())}@example.com"
        reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "InitialPassword123!",
            "name": "Sprint 2 Tester"
        })
        print("Register response:", reg_resp.status_code, reg_resp.json())
        assert reg_resp.status_code == 201

        # Login user
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "InitialPassword123!"
        })
        print("Login response:", login_resp.status_code)
        assert login_resp.status_code == 200
        token = login_resp.json()['token']
        headers = {"Authorization": f"Bearer {token}"}

        # 3. GET /api/profile
        print("\n--- 3. Testing GET /api/profile ---")
        prof_get = requests.get(f"{BASE_URL}/api/profile", headers=headers)
        print("GET /profile:", prof_get.status_code, prof_get.json())
        assert prof_get.status_code == 200
        data = prof_get.json()
        assert data['email'] == email
        assert data['name'] == "Sprint 2 Tester"
        assert 'bio' in data
        assert 'timezone' in data

        # 4. PUT /api/profile
        print("\n--- 4. Testing PUT /api/profile ---")
        prof_put = requests.put(f"{BASE_URL}/api/profile", headers=headers, json={
            "name": "Updated Sprint 2 Tester",
            "bio": "Senior Backend Architect",
            "phoneNumber": "+1-555-0199",
            "avatarUrl": "https://example.com/avatar.png",
            "timezone": "America/New_York"
        })
        print("PUT /profile:", prof_put.status_code, prof_put.json())
        assert prof_put.status_code == 200
        updated = prof_put.json()
        assert updated['name'] == "Updated Sprint 2 Tester"
        assert updated['bio'] == "Senior Backend Architect"
        assert updated['timezone'] == "America/New_York"

        # 5. GET /api/account/settings
        print("\n--- 5. Testing GET /api/account/settings ---")
        settings_get = requests.get(f"{BASE_URL}/api/account/settings", headers=headers)
        print("GET /account/settings:", settings_get.status_code, settings_get.json())
        assert settings_get.status_code == 200

        # 6. PUT /api/account/settings
        print("\n--- 6. Testing PUT /api/account/settings ---")
        settings_put = requests.put(f"{BASE_URL}/api/account/settings", headers=headers, json={
            "theme": "dark",
            "notifications": False,
            "emailAlerts": True,
            "language": "en-US"
        })
        print("PUT /account/settings:", settings_put.status_code, settings_put.json())
        assert settings_put.status_code == 200
        st = settings_put.json()
        assert st['theme'] == 'dark'
        assert st['notifications'] is False

        # 7. PUT /api/change-password
        print("\n--- 7. Testing PUT /api/change-password ---")
        # Incorrect current password
        pw_fail = requests.put(f"{BASE_URL}/api/change-password", headers=headers, json={
            "currentPassword": "WrongPassword!",
            "newPassword": "BrandNewPassword123!"
        })
        print("Change password wrong current (expect 400):", pw_fail.status_code, pw_fail.json())
        assert pw_fail.status_code == 400

        # Correct password change
        pw_succ = requests.put(f"{BASE_URL}/api/change-password", headers=headers, json={
            "currentPassword": "InitialPassword123!",
            "newPassword": "BrandNewPassword123!"
        })
        print("Change password success:", pw_succ.status_code, pw_succ.json())
        assert pw_succ.status_code == 200

        # Verify login with new password
        login_new = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "BrandNewPassword123!"
        })
        print("Login with new password:", login_new.status_code)
        assert login_new.status_code == 200
        new_token = login_new.json()['token']
        new_headers = {"Authorization": f"Bearer {new_token}"}

        # 8. DELETE /api/account
        print("\n--- 8. Testing DELETE /api/account ---")
        del_resp = requests.delete(f"{BASE_URL}/api/account", headers=new_headers, json={
            "password": "BrandNewPassword123!"
        })
        print("DELETE /account:", del_resp.status_code, del_resp.json())
        assert del_resp.status_code == 200

        # Verify deleted user cannot login
        login_deleted = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "BrandNewPassword123!"
        })
        print("Login after delete (expect 401):", login_deleted.status_code)
        assert login_deleted.status_code == 401

        print("\n[SUCCESS] ALL SPRINT 2 BACKEND ENDPOINTS AND TESTS PASSED SUCCESSFULLY!")

    finally:
        proc.terminate()
        proc.wait()

if __name__ == '__main__':
    run_tests()
