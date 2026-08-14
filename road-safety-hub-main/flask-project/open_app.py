import urllib.request
import time
import webbrowser
import subprocess
import sys
import os

# Start the Flask app as a detached process
p = subprocess.Popen([sys.executable, 'app.py'])

# wait for it to be ready
def wait_for_server():
    for _ in range(10):
        try:
            urllib.request.urlopen('http://127.0.0.1:5000', timeout=1)
            return True
        except:
            time.sleep(1)
    return False

if wait_for_server():
    webbrowser.open('http://127.0.0.1:5000')
    print("Opened browser successfully.")
else:
    print("Failed to start server. It may already be running.")
    try:
        urllib.request.urlopen('http://127.0.0.1:5000', timeout=1)
        webbrowser.open('http://127.0.0.1:5000')
        print("Wait, it was already running. Opened browser.")
    except:
        pass
