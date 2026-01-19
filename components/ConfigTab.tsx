
import React from 'react';
import { AppState } from '../types';
import * as XLSX from 'xlsx';
import { Upload, Check, Filter, Table } from 'lucide-react';

interface ConfigTabProps {
  ConfigTabProps: AppState; // Error in original provided code interface, keeping consistent with appState name
  appState: AppState;
  onStateChange: (newState: Partial<AppState>) => void;
}

const ConfigTab: React.FC<ConfigTabProps> = ({ appState, onStateChange }) => {
  const detectHeaderRow = (rows: any[][]): number => {
    // Try to find the first row that has a reasonable number of populated columns
    // We check if a row has at most 2 empty columns (up to the first 10 columns)
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      // Look at the first N columns to see if they are mostly filled
      const sampleSize = Math.min(row.length, 10);
      let emptyCount = 0;
      for (let j = 0; j < sampleSize; j++) {
        if (row[j] === undefined || row[j] === null || String(row[j]).trim() === '') {
          emptyCount++;
        }
      }
      
      // If we have 2 or fewer empty columns in our sample, it's likely the header
      if (emptyCount <= 2 && row.length > 2) {
        return i;
      }
    }
    return 0; // Default to first row if detection fails
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Get all data as an array of arrays to detect header row
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      const detectedHeaderIndex = detectHeaderRow(rows);
      
      // Parse with specified header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: detectedHeaderIndex }) as any[];

      if (jsonData.length > 0) {
        const headers = Object.keys(jsonData[0]);
        onStateChange({
          data: jsonData,
          headers,
          filterColumns: [],
          displayColumns: headers,
          fileName: file.name,
          workbook: workbook,
          headerRowIndex: detectedHeaderIndex
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleSelection = (header: string, type: 'filter' | 'display') => {
    const listKey = type === 'filter' ? 'filterColumns' : 'displayColumns';
    const currentList = [...appState[listKey]];
    const index = currentList.indexOf(header);

    if (index > -1) {
      currentList.splice(index, 1);
    } else {
      currentList.push(header);
    }

    onStateChange({ [listKey]: currentList });
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <div className="max-w-3xl mx-auto space-y-10">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">1</span>
            <h2 className="text-lg font-semibold text-slate-800">Upload Data Source</h2>
          </div>
          <div className="relative group">
            <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              appState.fileName ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-white'
            }`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className={`w-10 h-10 mb-3 ${appState.fileName ? 'text-green-500' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                <p className="mb-2 text-sm text-slate-700">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">XLSX, XLS, or CSV (max. 10MB)</p>
                {appState.fileName && (
                  <div className="mt-4 px-3 py-1 bg-white rounded-full border border-green-200 shadow-sm flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-medium text-green-700">{appState.fileName}</span>
                  </div>
                )}
              </div>
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            </label>
          </div>
        </section>

        {appState.headers.length > 0 && (
          <>
            <section className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">2</span>
                  <h2 className="text-lg font-semibold text-slate-800">Select Filter Columns</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {appState.headers.map(header => (
                  <button
                    key={header}
                    onClick={() => toggleSelection(header, 'filter')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      appState.filterColumns.includes(header)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Filter className={`w-4 h-4 ${appState.filterColumns.includes(header) ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">{header}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="animate-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">3</span>
                  <h2 className="text-lg font-semibold text-slate-800">Select Display Columns</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {appState.headers.map(header => (
                  <button
                    key={header}
                    onClick={() => toggleSelection(header, 'display')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      appState.displayColumns.includes(header)
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Table className={`w-4 h-4 ${appState.displayColumns.includes(header) ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">{header}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfigTab;
