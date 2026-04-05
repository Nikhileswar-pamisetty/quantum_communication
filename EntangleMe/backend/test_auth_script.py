import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1"

def test():
    username = f"test_{uuid.uuid4().hex[:6]}"
    with open("test_out.txt", "w") as f:
        f.write(f"Testing registration for new user: {username}\n")
        r = requests.post(f"{BASE_URL}/auth/register", json={"username": username, "password": "password"})
        f.write(f"Register response: {r.status_code}\n{r.text}\n")
        
        r2 = requests.post(f"{BASE_URL}/auth/register", json={"username": username, "password": "password"})
        f.write(f"Register duplicate response: {r2.status_code}\n{r2.text}\n")

        f.write("Testing login\n")
        l = requests.post(f"{BASE_URL}/auth/login", data={"username": username, "password": "password"})
        f.write(f"Login response: {l.status_code}\n{l.text}\n")

if __name__ == "__main__":
    test()
