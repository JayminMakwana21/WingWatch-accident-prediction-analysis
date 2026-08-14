import sys
import traceback

try:
    import app
    print("App imported successfully.")
except Exception as e:
    print("FAILED TO IMPORT APP:")
    traceback.print_exc()
