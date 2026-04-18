import os
from dotenv import load_dotenv
from pymongo import MongoClient
import certifi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "").strip()
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "eduface_db").strip()

client = None
db = None

if not MONGO_URI:
    print("[WARNING] MONGO_URI is not set in .env. Database features will be disabled.")
else:
    try:
        # Use certifi to avoid SSL issues on Windows
        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
        db = client[MONGO_DB_NAME]

        # Ensure indexes
        db.users.create_index("clerkId", unique=True)
        db.videos.create_index("userId")
        db.shareCodes.create_index("code", unique=True)
        print(f"[SUCCESS] Connected to MongoDB: {MONGO_DB_NAME}")
    except Exception as e:
        print(f"[WARNING] Could not connect to MongoDB: {e}")

def get_db():
    return db
