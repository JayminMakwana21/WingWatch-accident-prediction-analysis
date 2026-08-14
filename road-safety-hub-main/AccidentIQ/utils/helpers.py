import os
import csv
from typing import Dict, Any, List

import numpy as np
import pandas as pd
from werkzeug.security import check_password_hash, generate_password_hash


def ensure_directories(paths: List[str]) -> None:
    for path in paths:
        os.makedirs(path, exist_ok=True)


def ensure_users_file(users_csv: str) -> None:
    if os.path.exists(users_csv):
        return
    os.makedirs(os.path.dirname(users_csv), exist_ok=True)
    with open(users_csv, "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["username", "email", "password_hash"])


def load_users(users_csv: str) -> List[Dict[str, str]]:
    ensure_users_file(users_csv)
    users: List[Dict[str, str]] = []
    with open(users_csv, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            users.append(row)
    return users


def find_user_by_identifier(users: List[Dict[str, str]], identifier: str):
    key = identifier.strip().lower()
    for user in users:
        if user.get("username", "").lower() == key or user.get("email", "").lower() == key:
            return user
    return None


def register_user(users_csv: str, username: str, email: str, password: str) -> None:
    ensure_users_file(users_csv)
    password_hash = generate_password_hash(password)
    with open(users_csv, "a", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow([username, email, password_hash])


def verify_password(stored_hash: str, password: str) -> bool:
    if not stored_hash:
        return False
    if stored_hash.startswith("pbkdf2:") or stored_hash.startswith("scrypt:"):
        return check_password_hash(stored_hash, password)
    return stored_hash == password


def load_dataset(path: str):
    if not path or not os.path.exists(path):
        return None
    try:
        return pd.read_csv(path)
    except Exception:
        return None


def infer_column_types(df: pd.DataFrame) -> Dict[str, str]:
    col_types: Dict[str, str] = {}
    for col in df.columns:
        series = df[col]
        if pd.api.types.is_numeric_dtype(series):
            col_types[col] = "numeric"
            continue
        if pd.api.types.is_datetime64_any_dtype(series):
            col_types[col] = "datetime"
            continue
        if series.dtype == "object":
            sample = series.dropna().astype(str).head(200)
            if sample.empty:
                col_types[col] = "categorical"
                continue
            parsed = pd.to_datetime(sample, errors="coerce")
            if parsed.notna().mean() >= 0.7:
                col_types[col] = "datetime"
            else:
                col_types[col] = "categorical"
        else:
            col_types[col] = "categorical"
    return col_types


def sanitize_for_table(df: pd.DataFrame):
    return (
        df.replace({np.nan: None, np.inf: None, -np.inf: None})
        .astype(object)
        .where(pd.notnull(df), None)
        .values
        .tolist()
    )


def paginate_df(df: pd.DataFrame, page: int, per_page: int) -> Dict[str, Any]:
    total_rows = len(df)
    total_pages = max(1, (total_rows + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    start = (page - 1) * per_page
    end = start + per_page
    subset = df.iloc[start:end]
    return {
        "rows": sanitize_for_table(subset),
        "page": page,
        "total_pages": total_pages,
        "total_rows": total_rows,
        "start": start + 1 if total_rows else 0,
        "end": min(end, total_rows),
    }
