import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test_group_messages():
    print("🧪 Testing Group Messages API...")
    
    # 1. Register and Login
    username = f"user_{uuid.uuid4().hex[:6]}"
    password = "password"
    
    print(f"Registering user {username}...")
    requests.post(f"{BASE_URL}/auth/register", json={"username": username, "password": password})
    
    print("Logging in...")
    login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": username, "password": password})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create a Group
    print("Creating group...")
    group_name = f"Group_{uuid.uuid4().hex[:6]}"
    group_res = requests.post(
        f"{BASE_URL}/groups/", 
        json={"name": group_name, "participant_ids": []},
        headers=headers
    )
    group = group_res.json()
    group_id = group["id"]
    print(f"Group created with ID: {group_id}")
    
    # 3. Send a Message (POST)
    print("Sending group message...")
    msg_content = "0"
    msg_res = requests.post(
        f"{BASE_URL}/groups/{group_id}/messages",
        json={"group_id": group_id, "content": msg_content},
        headers=headers
    )
    
    if msg_res.status_code == 200:
        print("✅ POST message successful")
        msg_data = msg_res.json()
        print(f"   Message content: {msg_data['content']}")
        print(f"   Sender: {msg_data['sender_username']}")
    else:
        print(f"❌ POST message failed: {msg_res.status_code}")
        print(f"   Error: {msg_res.text}")
        return
        
    # 4. Fetch Message History (GET)
    print("Fetching message history...")
    history_res = requests.get(
        f"{BASE_URL}/groups/{group_id}/messages",
        headers=headers
    )
    
    if history_res.status_code == 200:
        history = history_res.json()
        if len(history) > 0 and history[-1]["content"] == msg_content:
            print("✅ GET message history successful")
        else:
            print("❌ GET message history failed or message not found")
    else:
        print(f"❌ GET message history failed: {history_res.status_code}")

if __name__ == "__main__":
    test_group_messages()
