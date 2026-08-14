import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import joblib
import os
import re

def load_and_prepare_data(filepath):
    print(f"Reading {filepath}...")
    df = pd.read_csv(filepath)
    
    # Strip whitespace from column names and values
    df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].astype(str).str.strip().str.lower()

    def _to_yes_no(value: str) -> str:
        v = str(value).strip().lower()
        if v in {"yes", "y", "true", "1"}:
            return "yes"
        if v in {"no", "n", "false", "0"}:
            return "no"
        if v in {"not applicable", "na", "n/a", "nan", "none", "unknown"}:
            return "no"
        return v

    def _to_valid_invalid(value: str) -> str:
        v = str(value).strip().lower()
        if v in {"valid", "yes", "y", "true", "1"}:
            return "valid"
        if v in {"invalid", "no", "n", "false", "0"}:
            return "invalid"
        if v in {"expired"}:
            return "invalid"
        return v

    # Normalize key categorical columns to align with the Prediction UI
    if "vehicle_type" in df.columns:
        df["vehicle_type"] = df["vehicle_type"].str.replace(" ", "_")
    if "weather_condition" in df.columns:
        df["weather_condition"] = df["weather_condition"].str.replace(" ", "_")
    if "road_condition" in df.columns:
        df["road_condition"] = df["road_condition"].str.replace(" ", "_")
    if "time_of_day" in df.columns:
        df["time_of_day"] = df["time_of_day"].str.replace(" ", "_")

    for yn_col in ["helmet_used", "seatbelt_used", "alcohol_involved", "mobile_usage"]:
        if yn_col in df.columns:
            df[yn_col] = df[yn_col].map(_to_yes_no)

    if "driver_license" in df.columns:
        df["driver_license"] = df["driver_license"].map(_to_valid_invalid)

    # Identify target column (severity)
    severity_cols = [col for col in df.columns if "severity" in col]
    if not severity_cols:
        raise ValueError(f"Severity column not found. Available: {df.columns.tolist()}")
    severity_col = severity_cols[0]
    
    # Encode Target
    print(f"Encoding target: {severity_col}")
    le = LabelEncoder()
    df[severity_col] = le.fit_transform(df[severity_col].fillna("Minor"))
    joblib.dump(le, "severity_le.pkl")
    
    # Selected features based on user request
    relevant_cols = [
        "vehicle_type", "weather_condition", "road_condition", "time_of_day", 
        "speed_kmph", "crash_force_kn", "helmet_used", "seatbelt_used", 
        "alcohol_involved", "mobile_usage", "driver_license"
    ]
    
    # Filter to only available columns
    available_cols = [col for col in relevant_cols if col in df.columns]
    X = df[available_cols].copy()
    y = df[severity_col]
    
    # Fill missing values
    for col in X.columns:
        if X[col].dtype == 'object':
            X[col] = X[col].fillna("Unknown")
        else:
            X[col] = X[col].fillna(X[col].median())
    
    # One-hot encoding for categorical features
    print("One-hot encoding categorical features...")
    X = pd.get_dummies(X)
    
    # Clean feature names for XGBoost (no spaces, special chars)
    print("Cleaning feature names...")
    X.columns = [re.sub(r'[^A-Za-z0-9_]+', '_', col).strip('_') for col in X.columns]
    X.columns = [re.sub(r'__+', '_', col) for col in X.columns]
    
    feature_names = X.columns.tolist()
    joblib.dump(feature_names, "feature_names.pkl")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    return X_train, X_test, y_train, y_test, feature_names

if __name__ == "__main__":
    try:
        # Check for dataset
        dataset_path = os.path.join("data", "uploaded_accident_final.csv")
        if not os.path.exists(dataset_path):
            # Try default location if uploaded doesn't exist
            dataset_path = "accident_final.csv"
            
        if not os.path.exists(dataset_path):
            # Try to find any accident csv
            import glob
            csv_files = glob.glob("**/accident*.csv", recursive=True)
            if csv_files:
                dataset_path = csv_files[0]
            else:
                print("Error: Could not find accident dataset CSV.")
                exit(1)

        X_train, X_test, y_train, y_test, feature_names = load_and_prepare_data(dataset_path)

        print(f"Training on {len(X_train)} samples with {len(feature_names)} features.")
        
        # Professional XGBoost Configuration as requested
        model = XGBClassifier(
            n_estimators=500,
            learning_rate=0.05,
            max_depth=6,
            eval_metric="mlogloss",
            random_state=42,
            use_label_encoder=False
        )

        model.fit(X_train, y_train)
        
        joblib.dump(model, "xgboost_model.pkl")
        print("\nSUCCESS: XGBoost model trained and saved as xgboost_model.pkl.")
        
        # Test accuracy
        score = model.score(X_test, y_test)
        print(f"Test Accuracy: {score*100:.2f}%")
        
    except Exception as e:
        import traceback
        print(f"\nFAILURE: {str(e)}")
        traceback.print_exc()
