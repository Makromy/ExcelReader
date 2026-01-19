
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppState, DataRow } from '../types';
import { Search, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';

interface ViewTabProps {
  appState: AppState;
  onStateChange: (newState: Partial<AppState>) => void;
}

const ViewTab: React.FC<ViewTabProps> = ({ appState, onStateChange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const tableRef = useRef<HTMLTableElement>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);

  const { filters, searchTerm, frozenColumns, frozenHeader } = appState;

  // Track column widths for sticky horizontal calculation
  useEffect(() => {
    if (tableRef.current) {
      const headerCells = tableRef.current.querySelectorAll('thead th');
      const widths = Array.from(headerCells).map(cell => (cell as HTMLElement).offsetWidth);
      setColumnWidths(widths);
    }
  }, [appState.displayColumns, frozenColumns, appState.data, frozenHeader]);

  // Helper to format values consistently for display
  const formatDisplayValue = (val: any): string => {
    if (val instanceof Date) {
      return val.toLocaleDateString();
    }
    if (val !== undefined && val !== null) {
      return String(val);
    }
    return '';
  };

  /**
   * Faceted Filter Options calculation:
   * For each filter column, we calculate the available options by filtering the 
   * original dataset using ALL OTHER active filters and the search term.
   */
  const filterOptions = useMemo(() => {
    const options: { [key: string]: { label: string; value: string }[] } = {};
    
    appState.filterColumns.forEach(targetCol => {
      const subDataset = appState.data.filter(row => {
        const matchesOtherFacets = Object.entries(filters).every(([col, val]) => {
          if (!val || col === targetCol) return true;
          const cellValue = row[col];
          const compareValue = cellValue instanceof Date ? cellValue.toISOString() : String(cellValue);
          return compareValue === val;
        });

        const matchesSearch = searchTerm === '' || Object.values(row).some(v => 
          formatDisplayValue(v).toLowerCase().includes(searchTerm.toLowerCase())
        );

        return matchesOtherFacets && matchesSearch;
      });

      const uniqueRawValues = Array.from(new Set(subDataset.map(row => row[targetCol])))
        .filter(v => v !== undefined && v !== null && v !== '');

      const sortedValues = uniqueRawValues.sort((a, b) => {
        if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
        const numA = Number(a);
        const numB = Number(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
      });

      options[targetCol] = sortedValues.map(val => ({
        label: formatDisplayValue(val),
        value: val instanceof Date ? val.toISOString() : String(val)
      }));
    });
    return options;
  }, [appState.data, appState.filterColumns, filters, searchTerm]);

  const filteredData = useMemo(() => {
    return appState.data.filter(row => {
      const matchesFilters = Object.entries(filters).every(([col, val]) => {
        if (!val) return true;
        const cellValue = row[col];
        const compareValue = cellValue instanceof Date ? cellValue.toISOString() : String(cellValue);
        return compareValue === val;
      });

      const matchesSearch = searchTerm === '' || Object.values(row).some(v => 
        formatDisplayValue(v).toLowerCase().includes(searchTerm.toLowerCase())
      );

      return matchesFilters && matchesSearch;
    });
  }, [appState.data, filters, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (col: string, value: string) => {
    onStateChange({ filters: { ...filters, [col]: value } });
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    onStateChange({ searchTerm: value });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    onStateChange({ filters: {}, searchTerm: '' });
    setCurrentPage(1);
  };

  const getFrozenLeftOffset = (index: number) => {
    return columnWidths.slice(0, index).reduce((acc, curr) => acc + curr, 0);
  };

  if (appState.data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-12 text-slate-500">
        Please upload and configure data in the Configuration tab.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[600px] bg-slate-50">
      {/* Top Filter Bar */}
      <div className="flex-none p-4 bg-white border-b border-slate-200 shadow-sm space-y-4 z-40">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search across all records..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          
          {appState.filterColumns.map(col => (
            <div key={col} className="flex flex-col min-w-[160px]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">{col}</label>
              <select
                className="bg-white border border-slate-200 rounded-lg text-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                value={filters[col] || ''}
                onChange={(e) => handleFilterChange(col, e.target.value)}
              >
                <option value="">All {col}s</option>
                {filterOptions[col]?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}

          <button 
            onClick={clearFilters}
            className="text-sm text-indigo-600 font-medium hover:text-indigo-700 px-2 mt-4 sm:mt-0"
          >
            Reset
          </button>
        </div>
        
        <div className="flex justify-between items-center px-1">
          <div className="text-xs text-slate-500 font-medium">
            Found {filteredData.length} records {Object.keys(filters).length > 0 || searchTerm ? '(Filtered)' : ''}
          </div>
          <div className="text-xs text-slate-400 italic">
            Displaying {appState.displayColumns.length} columns | Header: {frozenHeader ? 'Frozen' : 'Normal'} | {frozenColumns} Col(s) Frozen
          </div>
        </div>
      </div>

      {/* Main Table Scroll Container */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar relative">
        <div className="min-w-full inline-block align-middle">
          {/* 
            CRITICAL: We removed 'overflow-hidden' from intermediate parents 
            as it often breaks sticky positioning if the container itself 
            isn't the scrolling target.
          */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <table ref={tableRef} className="min-w-full text-left border-separate border-spacing-0 table-auto">
              <thead>
                <tr className="bg-slate-100">
                  {appState.displayColumns.map((col, idx) => {
                    const isFrozenCol = idx < frozenColumns;
                    const leftOffset = isFrozenCol ? getFrozenLeftOffset(idx) : undefined;
                    
                    const style: React.CSSProperties = {
                      backgroundColor: isFrozenCol ? '#f1f5f9' : '#f8fafc',
                      zIndex: isFrozenCol ? 50 : 20,
                    };
                    
                    // Always sticky if frozenHeader is true
                    if (frozenHeader) {
                      style.position = 'sticky';
                      style.top = 0;
                    }

                    // Also sticky horizontally if it's a frozen column
                    if (isFrozenCol) {
                      style.position = 'sticky';
                      style.left = leftOffset;
                      // When both are true, it needs the highest z-index
                      if (frozenHeader) {
                        style.zIndex = 60;
                      }
                    }

                    return (
                      <th 
                        key={col} 
                        style={style}
                        className={`px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-b border-slate-200 ${
                          isFrozenCol && idx === frozenColumns - 1 ? 'border-r-2 border-r-indigo-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''
                        }`}
                      >
                        {col}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors group">
                    {appState.displayColumns.map((col, colIdx) => {
                      const isFrozenCol = colIdx < frozenColumns;
                      const leftOffset = isFrozenCol ? getFrozenLeftOffset(colIdx) : undefined;
                      
                      const tdStyle: React.CSSProperties = {
                        backgroundColor: '#ffffff'
                      };
                      if (isFrozenCol) {
                        tdStyle.position = 'sticky';
                        tdStyle.left = leftOffset;
                        tdStyle.zIndex = 10;
                      }
                      
                      return (
                        <td 
                          key={col} 
                          style={tdStyle}
                          className={`px-6 py-4 text-sm text-slate-700 whitespace-nowrap max-w-md truncate ${
                            isFrozenCol ? 'group-hover:bg-slate-50' : ''
                          } ${
                            isFrozenCol && colIdx === frozenColumns - 1 ? 'border-r-2 border-r-indigo-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]' : ''
                          }`}
                        >
                          {formatDisplayValue(row[col]) || <span className="text-slate-300">-</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={appState.displayColumns.length} className="px-6 py-20 text-center text-slate-400">
                      <div className="flex flex-col items-center">
                        <ListFilter className="w-10 h-10 mb-2 opacity-10" />
                        <p>No results match your current filter combination</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pagination Bar */}
      <div className="flex-none p-4 bg-white border-t border-slate-200 flex justify-between items-center no-print z-40">
        <div className="text-sm text-slate-500">
          Page <span className="font-semibold text-slate-900">{currentPage}</span> of {totalPages || 1}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1 hidden sm:flex">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = currentPage - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        /* Ensure table stays separate for spacing-0 trick */
        table {
          border-collapse: separate;
        }
      `}</style>
    </div>
  );
};

export default ViewTab;
