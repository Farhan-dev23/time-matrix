import requests
import json

URL = "http://127.0.0.1:10000"

def test_refresh_bug():
    # 1. Login or register
    print("Registering...")
    r = requests.post(f"{URL}/api/register", json={
        "name": "Refresh User",
        "email": "refresh2@example.com",
        "password": "password"
    })
    
    if r.status_code != 201 and r.status_code != 409:
        print("Registration failed:", r.status_code, r.text)
        return

    if r.status_code == 409:
        print("User exists, logging in instead...")
        r = requests.post(f"{URL}/api/login", json={
            "email": "refresh2@example.com",
            "password": "password"
        })
        
    data = r.json()
    token = data.get("token")
    print(f"Got token: {token[:20]}...")
    
    print("\nSimulating immediate session fetch (like initial load)...")
    h = {"Authorization": f"Bearer {token}"}
    r2 = requests.get(f"{URL}/api/session", headers=h)
    print("Initial session HTTP:", r2.status_code)
    print("Initial session User:", r2.json().get("user") is not None)
    
    print("\nSimulating browser refresh (fetch with token)...")
    # A browser refresh creates a completely new request session.
    # No cookies sent because we are using stateless requests.
    r3 = requests.get(f"{URL}/api/session", headers={"Authorization": f"Bearer {token}"})
    print("Refresh session HTTP:", r3.status_code)
    print("Refresh session User:", r3.json().get("user") is not None)

test_refresh_bug()
