import urllib.request
import json

url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyC1rbR_TFNPX3mJmmnCQYivMtje4TWELbM"
data = json.dumps({
    "contents": [{"parts":[{"text": "Hello"}]}]
}).encode("utf-8")

req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
