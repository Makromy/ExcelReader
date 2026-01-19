
import * as XLSX from 'xlsx';

export interface DataRow {
  [key: string]: any;
}

export interface AppState {
  data: DataRow[];
  headers: string[];
  filterColumns: string[];
  displayColumns: string[];
  fileName: string | null;
  workbook?: XLSX.WorkBook; // Store the full workbook for "Entire workbook" exports
  searchTerm: string;
  filters: { [key: string]: string };
  frozenColumns: number;
  frozenHeader: boolean;
  headerRowIndex: number;
}

export type TabType = 'configuration' | 'view';
