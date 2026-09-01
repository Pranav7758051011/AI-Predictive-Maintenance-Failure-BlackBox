import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

env_name = os.getenv("FLASK_ENV", "development")
app = create_app(env_name)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = app.config.get("DEBUG", True)
    
    print(f"\n=======================================================")
    print(f" AI Predictive Maintenance API Server")
    print(f" Environment : {env_name}")
    print(f" Server URL  : http://localhost:{port}")
    print(f" Swagger UI  : http://localhost:{port}/api/docs/")
    print(f" Health API  : http://localhost:{port}/api/health")
    print(f"=======================================================\n")
    
    app.run(host=host, port=port, debug=debug)
