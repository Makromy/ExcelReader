
import React, { useState } from 'react';
import { AppState, TabType } from './types';
import ConfigTab from './components/ConfigTab';
import ViewTab from './components/ViewTab';
import ToolsMenu from './components/ToolsMenu';
import { LayoutGrid, Settings2, FileSpreadsheet, Box } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('configuration');
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>({
    data: [],
    headers: [],
    filterColumns: [],
    displayColumns: [],
    fileName: null,
    searchTerm: '',
    filters: {},
    frozenColumns: 0,
    frozenHeader: true,
    headerRowIndex: 0,
  });

  const handleStateChange = (newState: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...newState }));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">
                ExcelInsight <span className="text-indigo-600">Configurator</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <nav className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('configuration')}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'configuration'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                  <span className="hidden xs:inline">Config</span>
                </button>
                <button
                  disabled={appState.data.length === 0}
                  onClick={() => setActiveTab('view')}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'view'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : appState.data.length === 0
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden xs:inline">View</span>
                </button>
              </nav>

              <button
                disabled={appState.data.length === 0}
                onClick={() => setIsToolsOpen(true)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-bold rounded-xl border-2 transition-all ${
                  appState.data.length === 0
                  ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                  : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:scale-95'
                }`}
              >
                <Box className="w-4 h-4" />
                <span className="hidden sm:inline">All Tool</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 min-h-[600px] overflow-hidden">
          {activeTab === 'configuration' ? (
            <ConfigTab appState={appState} onStateChange={handleStateChange} />
          ) : (
            <ViewTab appState={appState} onStateChange={handleStateChange} />
          )}
        </div>
      </main>

      {/* Tools Modal/Drawer */}
      <ToolsMenu 
        isOpen={isToolsOpen} 
        onClose={() => setIsToolsOpen(false)} 
        appState={appState} 
        onStateChange={handleStateChange}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
          Built with precision for Excel data explorers.
        </div>
      </footer>
    </div>
  );
};

export default App;
