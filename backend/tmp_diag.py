import os
from dotenv import load_dotenv
import requests

load_dotenv(".env")
api_key = os.getenv("ELEVENLABS_API_KEY")

url = "https://api.elevenlabs.io/v1/user"
headers = {"xi-api-key": api_key}

response = requests.get(url, headers=headers)
print(f"Status: {response.status_code}")
print(f"Body: {response.text}")
