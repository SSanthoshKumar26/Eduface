import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

# Load env
load_dotenv(".env")
api_key = os.getenv("ELEVENLABS_API_KEY")

print(f"Testing ElevenLabs API with key: {api_key[:5]}...{api_key[-5:]}")

try:
    client = ElevenLabs(api_key=api_key)
    print("Fetching available voices...")
    # Get just the first 3 voices to test
    voices = list(client.voices.get_all())[:3]
    print(f"✅ Connection successful! Authenticated as {api_key[:5]}...")
    
    # Check subscription info
    sub = client.user.get_subscription()
    print(f"📊 Tier: {sub.tier}")
    remaining = sub.character_limit - sub.character_count
    print(f"📊 Remaining characters: {remaining}")
    
except Exception as e:
    print(f"❌ ElevenLabs Error: {str(e)}")
