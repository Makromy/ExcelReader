
import React, { useState, useMemo } from 'react';
import { AppState } from '../types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { 
  Save, Download, FileText, 
  Image as ImageIcon, Columns, ChevronLeft, Check, Heading
} from 'lucide-react';

interface ToolsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onStateChange: (newState: Partial<AppState>) => void;
}

type OutputRange = 'Selected worksheet' | 'Entire workbook' | 'Currently selected area';

const ToolsMenu: React.FC<ToolsMenuProps> = ({ isOpen, onClose, appState, onStateChange }) => {
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [showFreezeConfig, setShowFreezeConfig] = useState(false);
  const [showSheetConfig, setShowSheetConfig] = useState(false);
  const [selectedRange, setSelectedRange] = useState<OutputRange>('Selected worksheet');
  const [isExporting, setIsExporting] = useState(false);

  // Deriving the filtered data based on current state
  const filteredData = useMemo(() => {
    return appState.data.filter(row => {
      const matchesFilters = Object.entries(appState.filters).every(([col, val]) => {
        if (!val) return true;
        const cellValue = row[col];
        const compareValue = cellValue instanceof Date ? cellValue.toISOString() : String(cellValue);
        return compareValue === val;
      });

      const matchesSearch = appState.searchTerm === '' || Object.values(row).some(v => 
        String(v || '').toLowerCase().includes(appState.searchTerm.toLowerCase())
      );

      return matchesFilters && matchesSearch;
    });
  }, [appState.data, appState.filters, appState.searchTerm]);

  if (!isOpen) return null;

  const handleHeaderRowChange = (newIndex: number) => {
    if (newIndex < 0 || !appState.workbook) return;
    
    const firstSheetName = appState.workbook.SheetNames[0];
    const worksheet = appState.workbook.Sheets[firstSheetName];
    
    // Parse with specified header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: newIndex }) as any[];

    if (jsonData.length > 0) {
      const headers = Object.keys(jsonData[0]);
      onStateChange({
        data: jsonData,
        headers,
        // Reset these or keep them if they match? Let's reset for safety
        filterColumns: [],
        displayColumns: headers,
        headerRowIndex: newIndex,
        filters: {} // Clear filters as columns might have changed
      });
    } else {
      onStateChange({ headerRowIndex: newIndex });
    }
  };

  const exportToExcel = (fileName: string = 'export.xlsx') => {
    const dataToExport = filteredData;
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, fileName);
    onClose();
  };

  const handlePdfConfirm = async () => {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    
    if (selectedRange === 'Selected worksheet' || selectedRange === 'Currently selected area') {
      const tableData = filteredData.map(row => 
        appState.displayColumns.map(col => {
          const val = row[col];
          return val instanceof Date ? val.toLocaleDateString() : String(val || '');
        })
      );
      
      autoTable(doc, {
        head: [appState.displayColumns],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229] }
      });
    } else if (selectedRange === 'Entire workbook' && appState.workbook) {
      appState.workbook.SheetNames.forEach((sheetName, index) => {
        if (index > 0) doc.addPage();
        const worksheet = appState.workbook!.Sheets[sheetName];
        const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawData.length > 0) {
          const headers = rawData[0] as string[];
          const body = rawData.slice(1);
          doc.setFontSize(14);
          doc.text(sheetName, 14, 15);
          autoTable(doc, {
            head: [headers],
            body: body,
            startY: 20,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1.5 },
          });
        }
      });
    }

    doc.save(`${appState.fileName?.split('.')[0] || 'data_export'}.pdf`);
    setShowRangeModal(false);
    onClose();
  };

  const createHiddenTable = (data: any[]) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = 'auto';
    container.style.minWidth = '1200px';
    container.style.zIndex = '-10';
    
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.backgroundColor = 'white';
    table.style.fontFamily = 'Inter, sans-serif';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#f8fafc';
    appState.displayColumns.forEach(col => {
      const th = document.createElement('th');
      th.innerText = col;
      th.style.padding = '16px 24px';
      th.style.textAlign = 'left';
      th.style.fontSize = '12px';
      th.style.fontWeight = '700';
      th.style.color = '#475569';
      th.style.borderBottom = '2px solid #e2e8f0';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach((row, i) => {
      const tr = document.createElement('tr');
      if (i % 2 === 1) tr.style.backgroundColor = '#fcfcfc';
      appState.displayColumns.forEach(col => {
        const td = document.createElement('td');
        const val = row[col];
        td.innerText = val instanceof Date ? val.toLocaleDateString() : String(val || '');
        td.style.padding = '12px 24px';
        td.style.fontSize = '14px';
        td.style.color = '#1e293b';
        td.style.borderBottom = '1px solid #f1f5f9';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    document.body.appendChild(container);
    return { container, table };
  };

  const exportAsLongImage = async () => {
    setIsExporting(true);
    const { container, table } = createHiddenTable(filteredData);
    try {
      const canvas = await html2canvas(table, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `${appState.fileName?.split('.')[0] || 'export'}_filtered_full.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Long image export failed', err);
    } finally {
      document.body.removeChild(container);
      setIsExporting(false);
      onClose();
    }
  };

  const saveEachPageAsImage = async () => {
    setIsExporting(true);
    const itemsPerPage = 15;
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    for (let i = 0; i < totalPages; i++) {
      const start = i * itemsPerPage;
      const end = start + itemsPerPage;
      const pageData = filteredData.slice(start, end);

      const { container, table } = createHiddenTable(pageData);
      try {
        const canvas = await html2canvas(table, { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const link = document.createElement('a');
        link.download = `filtered_page_${i + 1}_of_${totalPages}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise(resolve => setTimeout(resolve, 400));
      } catch (err) {
        console.error(`Page ${i + 1} export failed`, err);
      } finally {
        document.body.removeChild(container);
      }
    }
    setIsExporting(false);
    onClose();
  };

  const menuItems = [
    { icon: <Save className="w-5 h-5" />, label: 'Save', action: () => exportToExcel() },
    { icon: <Download className="w-5 h-5" />, label: 'Save as', action: () => exportToExcel('new_export.xlsx') },
    { icon: <FileText className="w-5 h-5" />, label: 'Export as PDF', action: () => setShowRangeModal(true) },
    { icon: <ImageIcon className="w-5 h-5" />, label: 'Export as long image', action: exportAsLongImage },
    { icon: <ImageIcon className="w-5 h-5" />, label: 'Save each page as an image', action: saveEachPageAsImage },
    { icon: <Columns className="w-5 h-5" />, label: 'Freeze Panes', action: () => { setShowFreezeConfig(true); setShowSheetConfig(false); } },
    { icon: <Heading className="w-5 h-5" />, label: 'Header Configuration', action: () => { setShowSheetConfig(true); setShowFreezeConfig(false); } },
  ];

  const renderConfigHeader = (title: string, backAction: () => void) => (
    <div className="px-8 pb-4 flex justify-between items-center">
      <div>
        <h2 className="text-[20px] font-bold text-slate-900">{title}</h2>
        <p className="text-[13px] text-slate-500 font-medium">{appState.fileName}</p>
      </div>
      <button 
        onClick={backAction}
        className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-1 text-slate-600 font-bold"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Back</span>
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-white text-slate-900 rounded-t-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-300 border-t border-slate-200">
        {isExporting && (
          <div className="absolute inset-0 bg-white/80 z-[120] flex items-center justify-center backdrop-blur-sm transition-all animate-in fade-in">
            <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-2xl">
              <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-[17px] font-semibold text-slate-900">Exporting Images</p>
                <p className="text-[13px] text-slate-500 mt-1">Please wait, processing your filtered data...</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center py-4">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Main Content / Header */}
        {!showFreezeConfig && !showSheetConfig && (
          <div className="px-8 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-[20px] font-bold text-slate-900">
                {appState.fileName ? appState.fileName.split('.')[0] : 'Sheet'}
              </h2>
              <p className="text-[13px] text-slate-500 font-medium">
                Showing {filteredData.length} records in this view
              </p>
            </div>
          </div>
        )}

        {showFreezeConfig && renderConfigHeader('Freeze Panes', () => setShowFreezeConfig(false))}
        {showSheetConfig && renderConfigHeader('Header Configuration', () => setShowSheetConfig(false))}

        <div className="max-h-[60vh] overflow-y-auto pb-10 mt-2 relative">
          {!showFreezeConfig && !showSheetConfig ? (
            <div className="flex flex-col">
              {menuItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.action}
                  className="flex items-center gap-4 px-8 py-4 hover:bg-indigo-50 active:bg-indigo-100 transition-colors group disabled:opacity-50"
                  disabled={isExporting}
                >
                  <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                    {item.icon}
                  </div>
                  <span className="flex-1 text-left text-[16px] font-medium text-slate-700 group-hover:text-indigo-900">{item.label}</span>
                </button>
              ))}
            </div>
          ) : showFreezeConfig ? (
            <div className="px-8 py-4 animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-[17px] font-bold text-slate-800 mb-2">Freeze Panes Configuration</h3>
              <p className="text-sm text-slate-500 mb-6">Keep specific areas visible while you scroll through the sheet.</p>
              
              <div className="space-y-4">
                {/* Header Freeze Toggle */}
                <div 
                  onClick={() => onStateChange({ frozenHeader: !appState.frozenHeader })}
                  className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl cursor-pointer hover:border-indigo-200 transition-all group"
                >
                  <div className="flex flex-col">
                    <span className="text-[16px] font-bold text-slate-700">Freeze Top Row</span>
                    <span className="text-xs text-slate-400">Keep column headers visible</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${appState.frozenHeader ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all transform ${appState.frozenHeader ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>

                {/* Column Freeze Config */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-[16px] font-bold text-slate-700">Frozen Columns</span>
                      <span className="text-xs text-slate-400">Fix columns to the left</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onStateChange({ frozenColumns: Math.max(0, appState.frozenColumns - 1) }); }}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:border-indigo-300 active:bg-indigo-50 shadow-sm"
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-[18px] font-bold text-indigo-600">{appState.frozenColumns}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onStateChange({ frozenColumns: Math.min(appState.displayColumns.length, appState.frozenColumns + 1) }); }}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:border-indigo-300 active:bg-indigo-50 shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[0, 1, 2, 3].map(num => (
                      <button
                        key={num}
                        onClick={() => onStateChange({ frozenColumns: num })}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          appState.frozenColumns === num 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                        }`}
                      >
                        {num === 0 ? 'None' : `${num} Col${num > 1 ? 's' : ''}`}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowFreezeConfig(false)}
                  className="w-full py-4 mt-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Apply Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="px-8 py-4 animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-[17px] font-bold text-slate-800 mb-2">Header Row Configuration</h3>
              <p className="text-sm text-slate-500 mb-6">Configure how the Excel file structure is interpreted.</p>
              
              <div className="space-y-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <span className="text-[16px] font-bold text-slate-700">Header Row Number</span>
                      <span className="text-xs text-slate-400">Index of the row containing headers</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleHeaderRowChange(Math.max(0, appState.headerRowIndex - 1))}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:border-indigo-300 active:bg-indigo-50 shadow-sm"
                      >
                        -
                      </button>
                      <span className="w-10 text-center text-[18px] font-bold text-indigo-600">{appState.headerRowIndex + 1}</span>
                      <button 
                        onClick={() => handleHeaderRowChange(appState.headerRowIndex + 1)}
                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:border-indigo-300 active:bg-indigo-50 shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">Changing the header row will re-parse the data and reset your current view selections.</p>
                </div>

                <button
                  onClick={() => setShowSheetConfig(false)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {showRangeModal && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center p-6 z-[110] animate-in fade-in duration-200">
            <div className="w-full bg-white rounded-[24px] overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <h3 className="text-[21px] font-bold text-slate-900 mb-6">Output range</h3>
                
                <div className="space-y-0 divide-y divide-slate-100">
                  {(['Selected worksheet', 'Entire workbook', 'Currently selected area'] as OutputRange[]).map((range) => (
                    <button
                      key={range}
                      onClick={() => setSelectedRange(range)}
                      className="w-full flex items-center justify-between py-4 text-left group"
                    >
                      <span className={`text-[17px] font-medium transition-colors ${selectedRange === range ? 'text-indigo-600' : 'text-slate-500'}`}>
                        {range}
                      </span>
                      {selectedRange === range ? (
                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center border-2 border-indigo-600 shadow-sm shadow-indigo-200">
                          <div className="w-2.5 h-2.5 rounded-full bg-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-slate-300" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-8 flex justify-center gap-4">
                   <button
                    onClick={() => setShowRangeModal(false)}
                    className="text-[17px] font-semibold text-slate-400 hover:text-slate-600 px-6 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePdfConfirm}
                    className="text-[17px] font-bold text-indigo-600 hover:text-indigo-700 active:scale-95 transition-all px-12 py-2 bg-indigo-50 rounded-xl"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsMenu;
