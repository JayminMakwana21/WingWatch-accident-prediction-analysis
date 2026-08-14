import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
MODELS_DIR = os.path.join(BASE_DIR, "models")

SECRET_KEY = os.environ.get("ACCIDENTIQ_SECRET_KEY", "accidentiq-secret-key-2026")
USERS_CSV = os.path.join(DATA_DIR, "users.csv")
DEFAULT_DATASET = os.path.join(DATA_DIR, "accident_final.csv")
MODEL_PATH = os.path.join(MODELS_DIR, "xgboost_model.pkl")
MAX_CONTENT_LENGTH = 32 * 1024 * 1024
ROWS_PER_PAGE = 50
