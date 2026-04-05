import sys
import os
import traceback

# Add the backend directory to sys.path to allow importing app
sys.path.append(os.path.join(os.getcwd(), "backend"))

try:
    from app.database.session import engine
    from app.models.database import Base
    print("Re-creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created successfully.")
except Exception as e:
    print(f"❌ Database error: {e}")
    traceback.print_exc()

print("Importing routers to check for NameErrors...")
try:
    print("Importing auth...")
    from app.api import auth
    print("Importing quantum...")
    from app.api import quantum
    print("Importing chat...")
    from app.api import chat
    print("Importing direct_chat...")
    from app.api import direct_chat
    print("Importing group_chat...")
    from app.api import group_chat
    print("Importing quantum_text...")
    from app.api import quantum_text
    print("Importing friends...")
    from app.api import friends
    
    from app.main import app
    print("Registered Routes:")
    for route in app.routes:
        if hasattr(route, "path"):
            print(f"{route.path} [{', '.join(route.methods) if hasattr(route, 'methods') else 'any'}]")
except Exception as e:
    print(f"❌ Import error: {e}")
    traceback.print_exc()
