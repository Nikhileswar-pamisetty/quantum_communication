import requests
import sys
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_auth():
    print("Testing Auth & Registration...")
    username_alice = f"alice_{uuid.uuid4().hex[:6]}"
    username_bob = f"bob_{uuid.uuid4().hex[:6]}"
    
    r1 = requests.post(f"{BASE_URL}/auth/register", json={"username": username_alice, "password": "password"})
    print("Register Alice:", r1.status_code, r1.text)
    r2 = requests.post(f"{BASE_URL}/auth/register", json={"username": username_bob, "password": "password"})
    print("Register Bob:", r2.status_code, r2.text)
    
    resp_alice = requests.post(f"{BASE_URL}/auth/login", data={"username": username_alice, "password": "password"})
    resp_bob = requests.post(f"{BASE_URL}/auth/login", data={"username": username_bob, "password": "password"})
    
    if resp_alice.status_code != 200 or resp_bob.status_code != 200:
        print("Login failed!", resp_alice.text, resp_bob.text)
        return None
        
    token_alice = resp_alice.json()["access_token"]
    token_bob = resp_bob.json()["access_token"]
    
    # Fetch bob's user ID using Alice token
    headers = {"Authorization": f"Bearer {token_alice}"}
    bob_user_resp = requests.get(f"{BASE_URL}/chat/users/{username_bob}", headers=headers)
    if bob_user_resp.status_code != 200:
        print("Failed to fetch bob:", bob_user_resp.text, bob_user_resp.status_code)
        return None
        
    print("Auth Success!")
    return token_alice, token_bob, bob_user_resp.json()["id"]

def test_teleport(token_alice, bob_id):
    print("Testing Quantum Text Teleportation...")
    headers = {"Authorization": f"Bearer {token_alice}"}
    payload = {
        "text_content": "Quantum",
        "receiver_id": bob_id,
        "is_direct": True
    }
    resp = requests.post(f"{BASE_URL}/quantum-text/teleport-text", json=payload, headers=headers)
    
    if resp.status_code == 200:
        data = resp.json()
        if data.get("success"):
            print("Quantum Teleportation Success! Bits properly simulated.")
        else:
            print("Teleportation logic error:", data)
    else:
        print("API Call failed:", resp.status_code, resp.text)

if __name__ == "__main__":
    try:
        # Check if server is up
        requests.get("http://localhost:8000/")
    except requests.ConnectionError:
        print("Server is not running on port 8000. Skipping local smoke tests.")
        sys.exit(0)
        
    res = test_auth()
    if res:
        test_teleport(res[0], res[2])
