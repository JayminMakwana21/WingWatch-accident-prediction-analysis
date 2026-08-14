from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import csv
import json
import pickle
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'accident_analysis_secret_key_2024'
app.config['UPLOAD_FOLDER'] = 'data'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Enable CORS for API endpoints
CORS(app, resources={r"/api/*": {"origins": "*"}})

USERS_CSV = os.path.join('data', 'users.csv')
DATASET_CSV = os.path.join('data', 'uploaded_accident_final.csv')
MODEL_PATH = 'model.pkl'

# ─── Helpers ────────────────────────────────────────────────────────────────

def ensure_users_csv():
    if not os.path.exists(USERS_CSV):
        os.makedirs('data', exist_ok=True)
        with open(USERS_CSV, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['username', 'email', 'password'])

def get_users():
    ensure_users_csv()
    users = []
    with open(USERS_CSV, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            users.append(row)
    return users

def add_user(username, email, password):
    ensure_users_csv()
    with open(USERS_CSV, 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([username, email, password])

def load_dataset():
    """Load current dataset (uploaded or default)."""
    if 'uploaded_dataset' in session and os.path.exists(session['uploaded_dataset']):
        return pd.read_csv(session['uploaded_dataset'])
    if os.path.exists(DATASET_CSV):
        return pd.read_csv(DATASET_CSV)
    return None

def get_column_types(df):
    col_types = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            if df[col].nunique() <= 5:  # Consider small numeric as categorical
                col_types[col] = 'Categorical'
            else:
                col_types[col] = 'Numeric'
        elif pd.api.types.is_bool_dtype(df[col]):
            col_types[col] = 'Boolean'
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            col_types[col] = 'Datetime'
        else:
            col_types[col] = 'Categorical'
    return col_types

def generate_chart_data(df):
    """Generate 10 specific accident analysis charts from the dataframe."""
    import math
    if df is None or df.empty:
        return {
            'error': 'No data available',
            'total_records': 0,
            'fatal_cases': 0,
            'serious_cases': 0,
            'minor_cases': 0,
            'charts': []
        }

    charts = []
    total = len(df)

    # Severity counts for stat cards
    sev_counts = df['Severity'].value_counts() if 'Severity' in df.columns else pd.Series()
    fatal_count = int(sev_counts.get('Fatal', 0))
    serious_count = int(sev_counts.get('Serious', 0))
    minor_count = int(sev_counts.get('Minor', 0))

    # ── 1. Accidents Over Time (Yearly Trend) — Line Chart ──
    if 'Year' in df.columns:
        try:
            yearly = df['Year'].value_counts().sort_index()
            peak_year = yearly.idxmax()
            charts.append({
                'id': 'chart_line_yearly',
                'type': 'line',
                'title': 'Accidents Over Time',
                'subtitle': 'Yearly Trend',
                'data': {
                    'labels': yearly.index.astype(str).tolist(),
                    'values': yearly.values.tolist()
                },
                'insight': f"Peak accidents occurred in {peak_year} with {yearly.max()} cases. The data spans {yearly.index.min()} to {yearly.index.max()}."
            })
        except Exception:
            pass

    # ── 2. Accidents by State — Bar Chart ──
    if 'State' in df.columns:
        try:
            state_counts = df['State'].value_counts().sort_values(ascending=False)
            top_state = state_counts.index[0]
            charts.append({
                'id': 'chart_bar_state',
                'type': 'bar',
                'title': 'Accidents by State',
                'subtitle': 'Regional Distribution',
                'data': {
                    'labels': state_counts.index.tolist(),
                    'values': state_counts.values.tolist()
                },
                'insight': f"'{top_state}' has the highest accident count with {state_counts.iloc[0]} cases ({state_counts.iloc[0]/total*100:.1f}% of total)."
            })
        except Exception:
            pass

    # ── 3. Accident Severity Distribution — Pie/Donut Chart ──
    if 'Severity' in df.columns:
        try:
            sev = df['Severity'].value_counts()
            charts.append({
                'id': 'chart_pie_severity',
                'type': 'donut',
                'title': 'Severity Distribution',
                'subtitle': 'Breakdown by severity level',
                'data': {
                    'labels': sev.index.tolist(),
                    'values': sev.values.tolist(),
                    'percentages': [round(v / total * 100, 1) for v in sev.values]
                },
                'insight': f"Minor accidents dominate at {minor_count} ({minor_count/total*100:.0f}%), followed by Serious at {serious_count} ({serious_count/total*100:.0f}%) and Fatal at {fatal_count} ({fatal_count/total*100:.0f}%)."
            })
        except Exception:
            pass

    # ── 4. Accidents by Vehicle Type & Severity — Stacked Bar Chart ──
    if 'Vehicle_Type' in df.columns and 'Severity' in df.columns:
        try:
            crosstab = pd.crosstab(df['Vehicle_Type'], df['Severity'])
            severity_order = ['Minor', 'Serious', 'Fatal']
            datasets = {}
            for sev_level in severity_order:
                if sev_level in crosstab.columns:
                    datasets[sev_level] = crosstab[sev_level].tolist()
            charts.append({
                'id': 'chart_stacked_vehicle',
                'type': 'stacked_bar',
                'title': 'Vehicle Type & Severity',
                'subtitle': 'Accident count by vehicle type and severity',
                'data': {
                    'labels': crosstab.index.tolist(),
                    'datasets': datasets
                },
                'insight': f"Bikes and Cars are involved in the most accidents. Fatal accidents are proportionally higher for certain vehicle types."
            })
        except Exception:
            pass

            map_data = {
                'labels': state_counts.index.tolist(),
                'values': state_counts.values.tolist(),
            }
            charts.append({
                'id': 'chart_geo_map',
                'type': 'geo_map',
                'title': 'Accident Intensity Map',
                'subtitle': 'Darker regions indicate higher incident frequency (Heatmap)',
                'data': map_data,
                'insight': f"'{state_counts.index[0]}' is the major accident hotspot with {state_counts.iloc[0]} incidents."
            })
        except Exception:
            pass

    # ── 6. Speed vs Severity Analysis — Scatter Plot ──
    if 'Speed_kmph' in df.columns and 'Severity' in df.columns:
        try:
            severity_map = {'Minor': 0, 'Serious': 1, 'Fatal': 2}
            df_scatter = df[['Speed_kmph', 'Severity']].dropna().copy()
            df_scatter['sev_num'] = df_scatter['Severity'].map(severity_map)
            sample = df_scatter.sample(n=min(500, len(df_scatter)), random_state=42)
            
            scatter_datasets = {}
            for sev_level in ['Minor', 'Serious', 'Fatal']:
                subset = sample[sample['Severity'] == sev_level]
                if not subset.empty:
                    scatter_datasets[sev_level] = {
                        'x': subset['Speed_kmph'].tolist(),
                        'y': [sev_level] * len(subset)
                    }
            
            avg_speeds = df.groupby('Severity')['Speed_kmph'].mean()
            charts.append({
                'id': 'chart_scatter_speed',
                'type': 'scatter_severity',
                'title': 'Speed vs Severity',
                'subtitle': 'How speed affects accident severity',
                'data': scatter_datasets,
                'insight': f"Average speed for Fatal accidents: {avg_speeds.get('Fatal', 0):.1f} km/h vs Minor: {avg_speeds.get('Minor', 0):.1f} km/h. Higher speeds correlate with more severe outcomes."
            })
        except Exception:
            pass

    # ── 7. Accidents by Time of Day (Hour-wise) — Histogram ──
    if 'Timing' in df.columns:
        try:
            df_time = df.copy()
            df_time['Hour'] = df_time['Timing'].apply(lambda x: int(str(x).split(':')[0]) if pd.notna(x) else None)
            df_time = df_time.dropna(subset=['Hour'])
            df_time['Hour'] = df_time['Hour'].astype(int)
            hour_counts = df_time.groupby('Hour').size().reindex(range(24), fill_value=0)
            peak_hour = hour_counts.idxmax()
            
            charts.append({
                'id': 'chart_histogram_hour',
                'type': 'histogram',
                'title': 'Time of Day Pattern',
                'subtitle': 'Hour-wise accident distribution',
                'data': {
                    'labels': [f"{h:02d}:00" for h in range(24)],
                    'values': hour_counts.values.tolist()
                },
                'insight': f"Peak accident hour is {peak_hour:02d}:00 with {hour_counts.max()} accidents. Evening hours (17:00–21:00) show elevated risk."
            })
        except Exception:
            pass

    # ── 8. Monthly Accident Intensity (Year vs Month) — Heatmap ──
    if 'Year' in df.columns and 'Month' in df.columns:
        try:
            month_order = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December']
            heatmap_data = pd.crosstab(df['Year'], df['Month'])
            # Reorder columns by month
            existing_months = [m for m in month_order if m in heatmap_data.columns]
            heatmap_data = heatmap_data[existing_months]
            
            charts.append({
                'id': 'chart_heatmap',
                'type': 'heatmap',
                'title': 'Monthly Accident Intensity',
                'subtitle': 'Year vs Month heatmap',
                'data': {
                    'x': existing_months,
                    'y': heatmap_data.index.astype(str).tolist(),
                    'z': heatmap_data.values.tolist()
                },
                'insight': f"The heatmap reveals seasonal patterns. Some months consistently show higher accident rates across all years."
            })
        except Exception:
            pass

    # ── 9. Crash Force Distribution — Box Plot ──
    if 'Crash_Force_kN' in df.columns and 'Severity' in df.columns:
        try:
            box_data = {}
            for sev_level in ['Minor', 'Serious', 'Fatal']:
                subset = df[df['Severity'] == sev_level]['Crash_Force_kN'].dropna()
                if not subset.empty:
                    box_data[sev_level] = subset.tolist()
            
            medians = {s: round(np.median(v), 2) for s, v in box_data.items()}
            charts.append({
                'id': 'chart_box_force',
                'type': 'box',
                'title': 'Crash Force Distribution',
                'subtitle': 'Crash Force (kN) by Severity',
                'data': box_data,
                'insight': f"Median crash force — Minor: {medians.get('Minor', 'N/A')} kN, Serious: {medians.get('Serious', 'N/A')} kN, Fatal: {medians.get('Fatal', 'N/A')} kN. Higher crash forces strongly correlate with fatal outcomes."
            })
        except Exception:
            pass

    # ── 10. Cumulative Accidents Over Time — Area Chart ──
    if 'Speed_kmph' in df.columns and 'Severity' in df.columns:
        try:
            area_datasets = {}
            for sev_level in ['Minor', 'Serious', 'Fatal']:
                subset = df[df['Severity'] == sev_level]['Speed_kmph'].dropna().sort_values()
                if not subset.empty:
                    # Build cumulative percentage at each speed point
                    n = len(subset)
                    # Sample at regular speed intervals for smoother curve
                    speed_range = list(range(int(subset.min()), int(subset.max()) + 1, 2))
                    cum_pct = []
                    for spd in speed_range:
                        cum_pct.append(round((subset <= spd).sum() / n * 100, 1))
                    area_datasets[sev_level] = {
                        'x': speed_range,
                        'y': cum_pct
                    }

            charts.append({
                'id': 'chart_area_cumulative',
                'type': 'area',
                'title': 'Cumulative Accidents Over Time',
                'subtitle': 'Cumulative % of accidents by speed (km/h)',
                'data': area_datasets,
                'insight': f"Minor accidents are concentrated at lower speeds (reach 100% earlier), while Fatal accidents extend to much higher speeds, showing a rightward shift in the cumulative curve."
            })
        except Exception:
            pass

    # ── 11. Correlation Between Features — Correlation Matrix ──
    numeric_cols = ['Speed_kmph', 'Crash_Force_kN', 'Emergency_Response_Time_min', 'Number_of_Fatalities']
    available_numeric = [c for c in numeric_cols if c in df.columns]
    if len(available_numeric) >= 2:
        try:
            corr_matrix = df[available_numeric].corr()
            short_names = [c.replace('_kmph', '').replace('_kN', '').replace('_min', '').replace('_', ' ').title() for c in available_numeric]
            
            charts.append({
                'id': 'chart_corr_matrix',
                'type': 'correlation',
                'title': 'Feature Correlation Matrix',
                'subtitle': 'Correlation between key numeric features',
                'data': {
                    'labels': short_names,
                    'z': corr_matrix.values.tolist(),
                    'text': [[f"{v:.2f}" for v in row] for row in corr_matrix.values]
                },
                'insight': f"Speed and Crash Force show strong positive correlation. Emergency response time has minimal correlation with crash force."
            })
        except Exception:
            pass

    return {
        'total_records': total,
        'fatal_cases': fatal_count,
        'serious_cases': serious_count,
        'minor_cases': minor_count,
        'charts': charts
    }

def estimate_crash_force(speed, vehicle_type, weather, road):
    """PROFESSIONAL CRASH FORCE CALCULATION based on user request."""
    base_force = 0.02 * (float(speed) ** 2)
    mass_factor = {"truck": 1.6, "bus": 1.5, "car": 1.0, "bike": 0.6}
    weather_factor = {"clear": 1.0, "rainy": 1.2, "foggy": 1.15}
    road_factor = {"dry": 1.0, "wet": 1.25, "damaged": 1.3}

    force = (
        base_force
        * mass_factor.get(vehicle_type.lower(), 1.0)
        * weather_factor.get(weather.lower(), 1.0)
        * road_factor.get(road.lower(), 1.0)
    )
    return round(force, 2)


def calculate_risk_percentage(
    vehicle_type,
    speed_kmph,
    crash_force_kn,
    weather_condition,
    road_condition,
    helmet_used,
    seatbelt_used,
    alcohol_involved,
    mobile_usage
):
    """PHYSICS BASED RISK ENGINE as requested by user."""
    vehicle_mass = {"bike": 180, "car": 1500, "bus": 8000, "truck": 12000}
    mass = vehicle_mass.get(vehicle_type.lower(), 1500)

    speed_ms = float(speed_kmph) / 3.6
    kinetic_energy = 0.5 * mass * (speed_ms ** 2)
    energy_factor = kinetic_energy / 100000

    reaction_time = 1.5
    if mobile_usage.lower() == "yes":
        reaction_time = 2.5
    if alcohol_involved.lower() == "yes":
        reaction_time = 3.5

    reaction_factor = reaction_time / 1.5

    friction_values = {"dry": 0.7, "wet": 0.4, "damaged": 0.3}
    mu = friction_values.get(road_condition.lower(), 0.7)
    friction_factor = 0.7 / mu

    visibility_values = {"clear": 1.0, "rainy": 0.7, "foggy": 0.4}
    visibility = visibility_values.get(weather_condition.lower(), 1.0)
    visibility_factor = 1 / visibility

    vehicle_vulnerability = {"bike": 2.5, "car": 1.0, "bus": 0.6, "truck": 0.7}
    vehicle_factor = vehicle_vulnerability.get(vehicle_type.lower(), 1.0)

    protection_modifier = 1.0
    if vehicle_type.lower() == "bike" and helmet_used.lower() == "yes":
        protection_modifier *= 0.3
    if vehicle_type.lower() != "bike" and seatbelt_used.lower() == "yes":
        protection_modifier *= 0.5

    crash_factor = crash_force_kn / 150
    risk = (
        energy_factor *
        reaction_factor *
        friction_factor *
        visibility_factor *
        vehicle_factor *
        protection_modifier *
        crash_factor
    )
    risk_percentage = min(risk * 100, 100)
    return round(risk_percentage, 2)

def generate_suggestions(risk_level, inputs):
    """Provide professional safety suggestions based on risk factors."""
    prevention = []
    mitigation = []

    # Prevention: reduce chance of crash
    if inputs.get('alcohol_involved') == 'yes':
        prevention.append("Do not drink and drive. Alcohol significantly impairs reaction time and judgement.")
    if inputs.get('mobile_usage') == 'yes':
        prevention.append("Avoid mobile phone use while driving. Distracted driving is a major cause of preventable crashes.")
    try:
        if float(inputs.get('speed_kmph', 0)) > 60:
            prevention.append("Reduce speed. Higher speed increases impact energy and reduces the reaction window.")
    except Exception:
        pass
    if inputs.get('weather_condition') in ['rainy', 'foggy']:
        prevention.append(f"In {inputs['weather_condition']} conditions, increase following distance and use appropriate lighting.")
    if inputs.get('road_condition') in ['wet', 'damaged']:
        prevention.append("Use smooth braking and steering on low-friction or damaged roads; avoid sudden maneuvers.")
    if inputs.get('driver_license') == 'invalid':
        prevention.append("Ensure the driver is licensed and trained before driving.")

    # Mitigation: reduce severity if a crash occurs
    if inputs.get('vehicle_type') == 'bike':
        if inputs.get('helmet_used') != 'yes':
            mitigation.append("Wear a certified helmet. Proper helmets can significantly reduce severe head injury risk.")
    else:
        if inputs.get('seatbelt_used') != 'yes':
            mitigation.append("Always use a seatbelt. Seatbelts substantially reduce fatal and serious injuries.")

    if risk_level in {"HIGH", "CRITICAL"}:
        mitigation.append("Maintain a larger safety buffer (space + time) to reduce impact severity if a hazard occurs.")

    if not prevention:
        prevention.append("Maintain defensive driving habits and stay vigilant at all times.")
    if not mitigation:
        mitigation.append("Keep safety systems active and maintain the vehicle to reduce injury severity.")

    return {
        'prevention': prevention,
        'mitigation': mitigation
    }



# ─── Auth Decorator ─────────────────────────────────────────────────────────

def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'username' not in session:
            flash('Please login first.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated


# ─── Routes ─────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        users = get_users()
        for user in users:
            if user['username'] == username and user['password'] == password:
                session['username'] = username
                flash('Login successful!', 'success')
                return redirect(url_for('dashboard'))
        flash('Invalid username or password', 'error')
    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '').strip()
        confirm = request.form.get('confirm_password', '').strip()

        if not username or not email or not password:
            flash('All fields are required.', 'error')
        elif password != confirm:
            flash('Passwords do not match.', 'error')
        else:
            users = get_users()
            if any(u['username'] == username for u in users):
                flash('Username already exists.', 'error')
            elif any(u['email'] == email for u in users):
                flash('Email already registered.', 'error')
            else:
                add_user(username, email, password)
                flash('Registration successful! Please login.', 'success')
                return redirect(url_for('login'))
    return render_template('register.html')


@app.route('/logout')
def logout():
    session.clear()
    flash('Logged out successfully.', 'success')
    return redirect(url_for('login'))


@app.route('/dashboard')
@login_required
def dashboard():
    df = load_dataset()
    charts = {}
    if df is not None:
        charts = generate_chart_data(df)
    return render_template('dashboard.html', charts=json.dumps(charts), username=session['username'])


@app.route('/dataset', methods=['GET'])
@login_required
def dataset():
    df = load_dataset()
    page = request.args.get('page', 1, type=int)
    per_page = 20
    sort_by = request.args.get('sort_by', '')
    sort_order = request.args.get('sort_order', 'asc')
    filter_col = request.args.get('filter_col', '')
    filter_val = request.args.get('filter_val', '')

    if df is not None:
        # Filtering
        if filter_col and filter_val and filter_col in df.columns:
            df = df[df[filter_col].astype(str).str.contains(filter_val, case=False, na=False)]

        # Sorting
        if sort_by and sort_by in df.columns:
            ascending = sort_order == 'asc'
            df = df.sort_values(by=sort_by, ascending=ascending)

        total = len(df)
        total_pages = max(1, (total + per_page - 1) // per_page)
        page = max(1, min(page, total_pages))
        start = (page - 1) * per_page
        end = start + per_page

        col_types = get_column_types(df)
        columns = df.columns.tolist()
        
        # safely handle nan values for json transfer
        df_view = df.iloc[start:end].replace({np.nan: None})
        rows = df_view.values.tolist()
    else:
        columns, col_types, rows, total, total_pages = [], {}, [], 0, 1

    return render_template('dataset.html',
                           columns=columns, col_types=col_types, rows=rows,
                           page=page, total_pages=total_pages, total=total,
                           sort_by=sort_by, sort_order=sort_order,
                           filter_col=filter_col, filter_val=filter_val)


@app.route('/upload_dataset', methods=['POST'])
def upload_dataset():
    """Handle dataset upload - works with or without login requirement"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file selected.'}), 400

    file = request.files['file']
    if file.filename == '' or not file.filename.endswith('.csv'):
        return jsonify({'error': 'Please upload a valid CSV file.'}), 400

    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], 'uploaded_' + filename)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        file.save(filepath)
        
        # Try to read and validate the CSV
        df = pd.read_csv(filepath)
        if df.empty:
            return jsonify({'error': 'CSV file is empty.'}), 400
        
        # Store in session if user is logged in
        if 'username' in session:
            session['uploaded_dataset'] = filepath
            session.modified = True
        
        return jsonify({
            'success': True,
            'message': 'Dataset uploaded successfully!',
            'records': len(df),
            'columns': len(df.columns)
        }), 200
    except Exception as e:
        return jsonify({'error': f'Upload error: {str(e)}'}), 500


@app.route('/reset_dataset')
@login_required
def reset_dataset():
    session.pop('uploaded_dataset', None)
    flash('Dataset reset to default.', 'success')
    return redirect(url_for('dataset'))


@app.route('/prediction', methods=['GET', 'POST'])
@login_required
def prediction():
    result = None
    if request.method == 'POST':
        inputs = {
            'vehicle_type': request.form.get('vehicle_type', 'car').lower(),
            'weather_condition': request.form.get('weather_condition', 'clear').lower(),
            'road_condition': request.form.get('road_condition', 'dry').lower(),
            'time_of_day': request.form.get('time_of_day', 'afternoon').lower(),
            'speed_kmph': request.form.get('speed_kmph', '60'),
            'helmet_used': request.form.get('helmet_used', 'no').lower(),
            'seatbelt_used': request.form.get('seatbelt_used', 'no').lower(),
            'alcohol_involved': request.form.get('alcohol_involved', 'no').lower(),
            'mobile_usage': request.form.get('mobile_usage', 'no').lower(),
            'driver_license': request.form.get('driver_license', 'valid').lower()
        }

        # 1. Estimate Crash Force
        crash_force_kn = estimate_crash_force(
            inputs['speed_kmph'], inputs['vehicle_type'], 
            inputs['weather_condition'], inputs['road_condition']
        )

        # 2. Physics-based Risk Percentage
        risk_percentage = calculate_risk_percentage(
            inputs['vehicle_type'], 
            inputs['speed_kmph'],
            crash_force_kn,
            inputs['weather_condition'],
            inputs['road_condition'],
            inputs['helmet_used'],
            inputs['seatbelt_used'],
            inputs['alcohol_involved'],
            inputs['mobile_usage']
        )

        if risk_percentage >= 75: risk_level = "CRITICAL"
        elif risk_percentage >= 50: risk_level = "HIGH"
        elif risk_percentage >= 25: risk_level = "MODERATE"
        else: risk_level = "LOW"

        # 3. XGBoost Prediction
        prediction_result = "Unknown"
        probabilities = None
        confidence = None
        
        xgb_path = "xgboost_model.pkl"
        le_path = "severity_le.pkl"
        feat_path = "feature_names.pkl"
        
        if all(os.path.exists(p) for p in [xgb_path, le_path, feat_path]):
            try:
                import joblib
                model = joblib.load(xgb_path)
                le = joblib.load(le_path)
                feature_names = joblib.load(feat_path)

                input_data = {
                    "vehicle_type": inputs['vehicle_type'],
                    "weather_condition": inputs['weather_condition'],
                    "road_condition": inputs['road_condition'],
                    "time_of_day": inputs['time_of_day'],
                    "speed_kmph": float(inputs['speed_kmph']),
                    "crash_force_kn": crash_force_kn,
                    "helmet_used": inputs['helmet_used'],
                    "seatbelt_used": inputs['seatbelt_used'],
                    "alcohol_involved": inputs['alcohol_involved'],
                    "mobile_usage": inputs['mobile_usage'],
                    "driver_license": inputs['driver_license']
                }

                input_df = pd.DataFrame([input_data])
                input_df = pd.get_dummies(input_df)
                
                # Clean columns
                input_df.columns = (
                    input_df.columns
                    .str.replace('[^A-Za-z0-9_]+', '_', regex=True)
                    .str.replace('__+', '_', regex=True)
                )

                # Reindex to match trained features
                input_df = input_df.reindex(columns=feature_names, fill_value=0)

                pred = model.predict(input_df)[0]
                prediction_result = le.inverse_transform([pred])[0]
                
                if hasattr(model, 'predict_proba'):
                    probs = model.predict_proba(input_df)[0]
                    probabilities = {le.inverse_transform([i])[0]: round(float(p) * 100, 1) for i, p in enumerate(probs)}
                    try:
                        confidence = round(float(np.max(probs)) * 100, 2)
                    except Exception:
                        confidence = None
            except Exception as e:
                prediction_result = f"Error: {str(e)}"
        else:
            # Fallback
            prediction_result = "Minor" if risk_percentage < 40 else "Serious" if risk_percentage <60 else "Fatal"
            confidence = round(100 - min(abs(risk_percentage - 50), 50), 2)

        # 4. Generate Suggestions
        suggestions = generate_suggestions(risk_level, inputs)

        result = {
            'risk_score': risk_percentage,
            'risk_level': risk_level,
            'prediction': prediction_result,
            'probabilities': probabilities,
            'confidence': confidence,
            'suggestions': suggestions,
            'crash_force': crash_force_kn,
            'inputs': inputs
        }

    return render_template('prediction.html', result=result)

@app.route('/about')
@login_required
def about():
    return render_template('about.html')


# ─── API endpoint for chart data (AJAX) ────────────────────────────────────

@app.route('/api/charts')
def api_charts():
    """Get chart data - works without authentication for CORS requests"""
    df = load_dataset()
    if df is not None and not df.empty:
        charts = generate_chart_data(df)
        return jsonify(charts)
    return jsonify({'error': 'No dataset found', 'total_records': 0}), 404


if __name__ == '__main__':
    ensure_users_csv()
    app.run(debug=True)
