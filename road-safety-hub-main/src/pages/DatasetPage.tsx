import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AccidentRecord, useDataset } from '@/contexts/DatasetContext';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, RotateCcw, Upload } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

const ROWS_PER_PAGE = 15;

export default function DatasetPage() {
  const { data, columns, status, resetDataset, loadDataset } = useDataset();
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [dragOver, setDragOver] = useState(false);

  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);

  const sortedData = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const av = (a as any)[sortCol];
      const bv = (b as any)[sortCol];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, sortCol, sortDir]);

  const pageData = sortedData.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const colStats = useMemo(() => {
    return columns
      .map(col => {
        const vals = data.map(d => (d as any)[col]).filter(v => typeof v === 'number');
        if (vals.length === 0) return null;
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
        return { col, min: min.toFixed(1), max: max.toFixed(1), mean: mean.toFixed(1), count: vals.length };
      })
      .filter(s => s !== null) as Array<{col: string; min: string; max: string; mean: string; count: number}>;
  }, [data, columns]);

  // Parse CSV handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const handleFile = useCallback((file: File) => {
    // Read file locally - preserve ALL columns from the CSV
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        alert('CSV file must have headers and at least 1 data row');
        return;
      }

      // Parse headers - preserve original column names
      const headers = parseCSVLine(lines[0]);
      const records: AccidentRecord[] = [];
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        try {
          const vals = parseCSVLine(lines[i]);
          if (vals.length === 0 || vals.every(v => !v)) continue;
          
          // Create record with ALL original CSV columns
          const record: any = {};
          headers.forEach((header, j) => {
            record[header] = vals[j] || '';
          });

          // Intelligent field mapping for Dashboard compatibility
          // Try to find these fields in the CSV and map them to standard names
          const findField = (patterns: string[]) => {
            for (const header of headers) {
              const lower = header.toLowerCase();
              for (const pattern of patterns) {
                if (lower.includes(pattern.toLowerCase())) {
                  return record[header];
                }
              }
            }
            return undefined;
          };

          const getSeverity = () => {
            const val = findField(['severity', 'accident_severity', 'casualty_severity']);
            return val || 'Minor';
          };

          const getSpeed = () => {
            const val = findField(['speed', 'velocity', 'kmph', 'km/h']);
            return parseFloat(String(val || 0));
          };

          const getWeather = () => {
            const val = findField(['weather', 'weather_condition', 'condition']);
            return val || 'Clear';
          };

          const getVehicleType = () => {
            const val = findField(['vehicle', 'vehicle_type', 'vehicletype']);
            return val || 'Car';
          };

          const getRoadType = () => {
            const val = findField(['road_type', 'roadtype', 'road']);
            return val || 'Urban';
          };

          const getRoadCondition = () => {
            const val = findField(['road_condition', 'roadcondition', 'condition']);
            return val || 'Dry';
          };

          const getTimeOfDay = () => {
            let val: any = findField(['time_of_day', 'timeofday', 'time', 'hour']);
            if (val !== undefined) {
              val = parseInt(String(val));
              return isNaN(val) ? 0 : val;
            }
            return 0;
          };

          const getAlcoholInvolved = () => {
            const val = findField(['alcohol', 'drinking', 'alcohol_involved'];
            if (!val) return false;
            const lower = String(val).toLowerCase();
            return lower === 'true' || lower === 'yes' || lower === '1';
          };

          const getCrashForce = () => {
            const val = findField(['crash_force', 'crashforce', 'force', 'impact']);
            return parseFloat(String(val || 0));
          };

          const getDate = () => {
            const val = findField(['date', 'incident_date', 'datetime']);
            if (val) return String(val);
            // Try to construct date from year/month/day
            const year = findField(['year']);
            const month = findField(['month']);
            if (year && month) {
              return `${year}-${String(month).padStart(2, '0')}-01`;
            }
            return '2023-01-01';
          };

          const getLat = () => {
            const val = findField(['latitude', 'lat']);
            return parseFloat(String(val || 0)) || 0;
          };

          const getLng = () => {
            const val = findField(['longitude', 'lng', 'lon']);
            return parseFloat(String(val || 0)) || 0;
          };

          // Add mapped fields to the record
          records.push({
            ...record, // All original CSV columns preserved
            severity: getSeverity(),
            speed: getSpeed(),
            weather: getWeather(),
            vehicleType: getVehicleType(),
            roadType: getRoadType(),
            roadCondition: getRoadCondition(),
            timeOfDay: getTimeOfDay(),
            alcoholInvolved: getAlcoholInvolved(),
            crashForce: getCrashForce(),
            date: getDate(),
            lat: getLat(),
            lng: getLng(),
          });
        } catch (err) {
          errorCount++;
        }
      }

      if (records.length === 0) {
        alert('No valid data found in CSV');
        return;
      }

      loadDataset(records);
      alert(`✓ Loaded ${records.length} records with ${headers.length} columns from CSV`);
      
      // Also upload to backend for sync (optional)
      const formData = new FormData();
      formData.append('file', file);
      fetch('http://localhost:5000/upload_dataset', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      }).catch(err => {
        // Backend sync is optional
      });
    };
    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
  }, [loadDataset]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dataset Manager</h1>
          <p className="text-sm text-muted-foreground">Upload, preview, and manage your accident data</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={status === 'ready' ? 'default' : 'secondary'} className={status === 'ready' ? 'bg-chart-green/20 text-chart-green border-chart-green/30' : ''}>
            {status === 'ready' && <CheckCircle className="h-3 w-3 mr-1" />}
            {status === 'loading' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {status === 'ready' ? 'Ready' : status === 'loading' ? 'Processing' : 'Idle'}
          </Badge>
          <Button variant="outline" size="sm" onClick={resetDataset} className="border-border/50 hover:bg-accent">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>
        </div>
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`glass-card p-8 mb-6 text-center border-2 border-dashed transition-all cursor-pointer ${dragOver ? 'border-primary bg-primary/5 glow-blue' : 'border-border/50 hover:border-primary/50'}`}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground mb-1">Drag & drop your CSV dataset here</p>
        <p className="text-xs text-muted-foreground mb-3">or click to browse files</p>
        <label className="inline-block">
          <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <span className="px-4 py-2 rounded-lg gradient-blue text-background text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
            Browse Files
          </span>
        </label>
      </motion.div>

      {/* Column Stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {colStats.map(s => (
          <div key={s.col} className="glass-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{s.col}</p>
            <div className="flex justify-between text-sm">
              <span className="text-chart-green">Min: {s.min}</span>
              <span className="text-chart-blue">Mean: {s.mean}</span>
              <span className="text-chart-red">Max: {s.max}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{s.count} records</p>
          </div>
        ))}
      </motion.div>

      {/* Data info */}
      <div className="flex items-center gap-2 mb-3">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <span className="text-sm text-foreground font-medium">{data.length.toLocaleString()} records</span>
        <span className="text-xs text-muted-foreground">· {columns.length} columns</span>
        {data.length === 0 && (
          <span className="flex items-center gap-1 text-xs text-chart-orange"><AlertCircle className="h-3 w-3" /> No data loaded</span>
        )}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                {columns.map(col => (
                  <th key={col} onClick={() => handleSort(col)}
                    className="px-3 py-3 text-left text-muted-foreground font-medium uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors sticky top-0 bg-card">
                    {col} {sortCol === col && (sortDir === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, i) => (
                <tr key={i} className={`border-b border-border/30 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? 'bg-card/50' : ''}`}>
                  {columns.map(col => (
                    <td key={col} className="px-3 py-2.5 text-foreground whitespace-nowrap">
                      {col === 'severity' ? (
                        <Badge variant="outline" className={
                          row.severity === 'Fatal' ? 'border-chart-red/50 text-chart-red' :
                          row.severity === 'Serious' ? 'border-chart-orange/50 text-chart-orange' :
                          'border-chart-green/50 text-chart-green'
                        }>{row.severity}</Badge>
                      ) : String((row as any)[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
