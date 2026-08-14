from typing import Dict, Any, List

import pandas as pd

from utils.helpers import infer_column_types


SEVERITY_LABELS = ["minor", "serious", "fatal"]


def _find_column(df: pd.DataFrame, candidates: List[str]):
    lowered = {col.lower().strip(): col for col in df.columns}
    for candidate in candidates:
        if candidate in lowered:
            return lowered[candidate]
    for col in df.columns:
        col_clean = col.lower().replace("_", " ").strip()
        if any(candidate in col_clean for candidate in candidates):
            return col
    return None


def generate_ai_insights(df: pd.DataFrame, col_types: Dict[str, str]) -> List[str]:
    insights: List[str] = []

    tod_col = _find_column(df, ["time of day", "time_of_day", "timing"])
    if tod_col and df[tod_col].dropna().size:
        mode_val = df[tod_col].dropna().astype(str).mode()
        if not mode_val.empty:
            insights.append(f"Most accidents occur during '{mode_val.iloc[0]}'.")

    weather_col = _find_column(df, ["weather", "weather condition", "weather_condition"])
    severity_col = _find_column(df, ["severity", "accident severity"])
    if weather_col and severity_col:
        subset = df[[weather_col, severity_col]].dropna()
        if not subset.empty:
            severe_mask = subset[severity_col].astype(str).str.lower().isin(["serious", "fatal", "2", "high"])
            severe_by_weather = subset[severe_mask].groupby(weather_col).size()
            if not severe_by_weather.empty:
                weather_peak = severe_by_weather.sort_values(ascending=False).index[0]
                insights.append(f"Weather pattern alert: '{weather_peak}' conditions show higher severe accident counts.")

    vehicle_col = _find_column(df, ["vehicle type", "vehicle_type"])
    fatality_col = _find_column(df, ["number of fatalities", "fatalities", "fatality"])
    if vehicle_col and fatality_col:
        subset = df[[vehicle_col, fatality_col]].dropna()
        if not subset.empty:
            fatality_avg = subset.groupby(vehicle_col)[fatality_col].mean().sort_values(ascending=False)
            if not fatality_avg.empty:
                high_risk_vehicle = fatality_avg.index[0]
                insights.append(f"Vehicle risk insight: '{high_risk_vehicle}' shows the highest average fatalities.")

    if not insights:
        insights.append("Upload richer time, weather, and location columns to unlock deeper AI insights.")

    return insights[:5]


def analyze_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    col_types = infer_column_types(df)
    numeric_cols = [c for c, t in col_types.items() if t == "numeric"]
    categorical_cols = [c for c, t in col_types.items() if t == "categorical"]
    datetime_cols = [c for c, t in col_types.items() if t == "datetime"]

    severity_col = next((c for c in df.columns if "severity" in c.lower()), None)
    severity_kpis = None
    if severity_col:
        counts = df[severity_col].astype(str).str.lower().value_counts()
        severity_kpis = {
            "minor": int(counts.get("minor", 0)),
            "serious": int(counts.get("serious", 0)),
            "fatal": int(counts.get("fatal", 0)),
        }

    missing_values = (
        df.isna().sum().sort_values(ascending=False).to_dict()
    )

    location_candidates = ["latitude", "longitude", "lat", "lon", "location", "state", "city"]
    has_location_data = any(any(k in col.lower() for k in location_candidates) for col in df.columns)

    return {
        "total_rows": int(df.shape[0]),
        "total_columns": int(df.shape[1]),
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "datetime_columns": datetime_cols,
        "missing_values": {k: int(v) for k, v in missing_values.items()},
        "severity_column": severity_col,
        "severity_kpis": severity_kpis,
        "has_location_data": has_location_data,
        "ai_insights": generate_ai_insights(df, col_types),
    }
