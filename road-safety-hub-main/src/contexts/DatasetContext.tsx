import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AccidentRecord {
  [key: string]: any; // Accept any columns from CSV
}

interface DatasetContextType {
  data: AccidentRecord[];
  columns: string[];
  isLoaded: boolean;
  status: 'idle' | 'loading' | 'ready';
  loadDataset: (records: AccidentRecord[]) => void;
  resetDataset: () => void;
}

function getColumnsFromData(records: AccidentRecord[]): string[] {
  if (records.length === 0) return [];
  const allKeys = new Set<string>();
  records.forEach(record => {
    Object.keys(record).forEach(key => allKeys.add(key));
  });
  return Array.from(allKeys).sort();
}

const DatasetContext = createContext<DatasetContextType | null>(null);

export const useDataset = () => {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider');
  return ctx;
};

// Generate sample data
function generateSampleData(): AccidentRecord[] {
  const severities = ['Minor', 'Minor', 'Minor', 'Serious', 'Serious', 'Fatal'];
  const weathers = ['Clear', 'Rainy', 'Foggy', 'Others'];
  const vehicles = ['Car', 'Motorcycle', 'Truck', 'Bus', 'Others'];
  const roadTypes = ['Highway', 'Urban', 'Rural', 'Intersection'];
  const roadConditions = ['Dry', 'Wet', 'Damaged'];
  const records: AccidentRecord[] = [];

  for (let i = 0; i < 3000; i++) {
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const speed = severity === 'Fatal' ? 80 + Math.random() * 80 : severity === 'Serious' ? 50 + Math.random() * 60 : 20 + Math.random() * 50;
    const weather = weathers[Math.floor(Math.random() * weathers.length)];
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
    const roadType = roadTypes[Math.floor(Math.random() * roadTypes.length)];
    const roadCondition = roadConditions[Math.floor(Math.random() * roadConditions.length)];
    const hour = Math.floor(Math.random() * 24);
    const alcohol = Math.random() < (severity === 'Fatal' ? 0.4 : 0.1);
    const crashForce = 0.02 * speed * speed * (vehicle === 'Truck' ? 1.8 : vehicle === 'Bus' ? 1.5 : vehicle === 'Car' ? 1.0 : 0.4) / 1000;
    const year = 2020 + Math.floor(Math.random() * 5);
    const month = 1 + Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);
    records.push({
      severity, speed: Math.round(speed), weather, vehicleType: vehicle,
      roadType, roadCondition, timeOfDay: hour, alcoholInvolved: alcohol,
      crashForce: Math.round(crashForce * 100) / 100,
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      lat: 20 + Math.random() * 10, lng: 72 + Math.random() * 8,
      helmetUsed: vehicle === 'Motorcycle' ? Math.random() > 0.3 : undefined,
      seatbeltUsed: vehicle !== 'Motorcycle' ? Math.random() > 0.2 : undefined,
    });
  }
  return records;
}

const COLUMNS = ['severity', 'speed', 'weather', 'vehicleType', 'roadType', 'roadCondition', 'timeOfDay', 'alcoholInvolved', 'crashForce', 'date', 'lat', 'lng'];

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AccidentRecord[]>(() => generateSampleData());
  const [columns, setColumns] = useState<string[]>(COLUMNS);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('ready');

  const loadDataset = useCallback((records: AccidentRecord[]) => {
    setStatus('loading');
    setTimeout(() => {
      setData(records);
      setColumns(getColumnsFromData(records));
      setStatus('ready');
    }, 800);
  }, []);

  const resetDataset = useCallback(() => {
    setStatus('loading');
    setTimeout(() => {
      const sampleData = generateSampleData();
      setData(sampleData);
      setColumns(getColumnsFromData(sampleData));
      setStatus('ready');
    }, 500);
  }, []);

  return (
    <DatasetContext.Provider value={{ data, columns, isLoaded: data.length > 0, status, loadDataset, resetDataset }}>
      {children}
    </DatasetContext.Provider>
  );
}
