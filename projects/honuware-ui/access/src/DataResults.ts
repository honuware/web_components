export interface DataResults {
  sortedColumnNames: string[]; // Keys in sorted order
  // Arrays of string arrays with values matching key order
  dataTable: string[][];
}

export interface DataResultsWithCount extends DataResults {
  totalCount: number;
}
