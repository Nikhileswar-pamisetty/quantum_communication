import sys
import os

# Add the backend directory to sys.path to allow importing app
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.session import engine
from app.models.database import Base

print("Re-creating all tables...")
Base.metadata.create_all(bind=engine)
print("✅ All tables created successfully.")

from app.main import app
print("Registered Routes:")
for route in app.routes:
    if hasattr(route, "path"):
        print(f"{route.path} [{', '.join(route.methods) if hasattr(route, 'methods') else 'any'}]")
