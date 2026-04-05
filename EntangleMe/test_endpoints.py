import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def check_endpoint(method, path, body=None):
    url = f"{BASE_URL}{path}"
    print(f"Checking {method} {url}...")
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=body)
        elif method == "PUT":
            response = requests.put(url, json=body)
        
        print(f"Status: {response.status_code}")
        if response.status_code != 404:
            print(f"Content: {response.text[:200]}")
        else:
            print("FAILED: Endpoint not found.")
    except Exception as e:
        print(f"Error: {e}")

print("--- Testing Static Routes ---")
check_endpoint("GET", "/chat/users/online")
check_endpoint("GET", "/chat/users/search?q=test")

print("\n--- Testing Parameterized Fallback ---")
check_endpoint("GET", "/chat/users/123")
