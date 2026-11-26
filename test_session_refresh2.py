import requests

url = "http://127.0.0.1:10000"

print("Simulating old plain text token...")
r = requests.get(url + "/api/session", headers={"Authorization": "Bearer user-test-123"})
print(r.json())

print("Simulating new JWT token...")
r = requests.post(url + "/api/login", json={"email": "test456@example.com", "password": "password123"})
if r.status_code == 200:
    t = r.json()["token"]
    r2 = requests.get(url + "/api/session", headers={"Authorization": f"Bearer {t}"})
    print("New JWT:", r2.json()["user"]["email"])

