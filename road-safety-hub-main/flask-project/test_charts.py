import pandas as pd
import numpy as np
import sys
sys.path.insert(0, '.')

df = pd.read_csv('data/uploaded_accident_final.csv')
print(f"Loaded {len(df)} rows, {len(df.columns)} columns")
print(f"Columns: {df.columns.tolist()}")

from app import generate_chart_data
result = generate_chart_data(df)
print(f"\nTotal: {result['total_records']}")
print(f"Fatal: {result['fatal_cases']}")
print(f"Serious: {result['serious_cases']}")
print(f"Minor: {result['minor_cases']}")
print(f"Charts count: {len(result['charts'])}")
for i, c in enumerate(result['charts']):
    print(f"  {i+1}. [{c['type']}] {c['title']}")
print("\nSUCCESS")
