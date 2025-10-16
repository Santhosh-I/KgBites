"""
Diagnostic script to check KgBites setup
"""
import os
import sys
import socket

print("=" * 60)
print("KgBites Diagnostic Tool")
print("=" * 60)

# Check directory structure
print("\n1. Checking directory structure...")
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
if os.path.exists(backend_dir):
    print(f"   ✅ Backend directory found: {backend_dir}")
else:
    print(f"   ❌ Backend directory NOT found")
    sys.exit(1)

# Check manage.py
manage_py = os.path.join(backend_dir, 'manage.py')
if os.path.exists(manage_py):
    print(f"   ✅ manage.py found")
else:
    print(f"   ❌ manage.py NOT found")

# Check venv
venv_python = os.path.join(backend_dir, 'venv', 'Scripts', 'python.exe')
if os.path.exists(venv_python):
    print(f"   ✅ Virtual environment found")
else:
    print(f"   ⚠️  Virtual environment NOT found (will be created)")

# Check if port 8000 is in use
print("\n2. Checking if port 8000 is available...")
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = sock.connect_ex(('127.0.0.1', 8000))
sock.close()

if result == 0:
    print("   ✅ Port 8000 is IN USE (backend might be running!)")
    print("   Try accessing: http://localhost:8000/admin")
else:
    print("   ⚠️  Port 8000 is AVAILABLE (backend is NOT running)")

# Check student portal
print("\n3. Checking if student portal is running...")
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = sock.connect_ex(('127.0.0.1', 5174))
sock.close()
if result == 0:
    print("   ✅ Student portal running on http://localhost:5174")
else:
    print("   ❌ Student portal NOT running")

# Check staff portal
print("\n4. Checking if staff portal is running...")
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = sock.connect_ex(('127.0.0.1', 5173))
sock.close()
if result == 0:
    print("   ✅ Staff portal running on http://localhost:5173")
else:
    print("   ❌ Staff portal NOT running")

print("\n" + "=" * 60)
print("Next Steps:")
print("=" * 60)

if result != 0:  # Backend not running
    print("\n👉 Backend is NOT running. Start it with:")
    print("   python start_backend.py")
    print("\nOR manually:")
    print("   cd backend")
    print("   venv\\Scripts\\activate")
    print("   python manage.py runserver")
else:
    print("\n✅ Backend appears to be running!")
    print("   If you still see errors, check:")
    print("   1. Browser console (F12)")
    print("   2. Make sure you're logged in as staff")
    print("   3. Check authentication token in localStorage")

print("\n")
