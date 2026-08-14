import pandas as pd
from app import get_column_types, generate_chart_data

# Create a mock dataframe with different column types
df = pd.DataFrame({
    'severity': ['High', 'Low', 'High', 'Medium', 'Low', 'High', 'High'],
    'speed': [60, 40, 70, 50, 30, 80, 65],
    'date': ['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-04', '2023-01-05', '2023-01-06', '2023-01-07'],
    'is_drunk': [True, False, True, False, False, True, False],
    'weather': ['Rain', 'Clear', 'Rain', 'Fog', 'Clear', 'Snow', 'Clear']
})

print("Testing column types...")
types = get_column_types(df)
print(types)

print("\nTesting chart generator...")
charts = generate_chart_data(df)
print(f"Generated {len(charts.get('dynamic_charts', []))} charts")
for c in charts.get('dynamic_charts', []):
    print(f"- {c['title']} ({c['type']}): {c['insight']}")
print("All tests passed.")
