"""
Simple script to start Django backend
Run this directly: python start_backend.py
"""
import os
import sys
import subprocess

# Get the directory where this script is located
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
os.chdir(backend_dir)

# Check if venv exists
venv_python = os.path.join('venv', 'Scripts', 'python.exe')
if not os.path.exists(venv_python):
    print("❌ Virtual environment not found!")
    print("Creating virtual environment...")
    subprocess.run([sys.executable, '-m', 'venv', 'venv'])
    print("✅ Virtual environment created")
    print("\nInstalling requirements...")
    subprocess.run([venv_python, '-m', 'pip', 'install', '-r', 'requirements.txt'])
    print("✅ Requirements installed")

# Run migrations
print("\n🔄 Running migrations...")
subprocess.run([venv_python, 'manage.py', 'migrate'])

# Start server
print("\n🚀 Starting Django server...")
print("=" * 50)
print("Backend will be available at: http://localhost:8000")
print("Press Ctrl+C to stop")
print("=" * 50)
subprocess.run([venv_python, 'manage.py', 'runserver'])
