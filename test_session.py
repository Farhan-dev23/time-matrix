import requests

try:
    print("Testing auth flow:")
    
    # 1. Register a test user
    r1 = requests.post("http://127.0.0.1:10000/api/register", json={
        "name": "Test User",
        "email": "test456@example.com",
        "password": "password123"
    })
    print("Register:", r1.status_code)
    
    # 2. Get token
    data = r1.json()
    token = data.get("token")
    print("Token:", token)
    
    # 3. Hit /api/session with the token
    headers = {"Authorization": f"Bearer {token}"}
    r2 = requests.get("http://127.0.0.1:10000/api/session", headers=headers)
    print("Session check:", r2.status_code, r2.json().get("user"))

except Exception as e:
    print("Error:", e)
