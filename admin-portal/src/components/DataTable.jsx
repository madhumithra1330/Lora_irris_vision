import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function DataTable({ columns, data, searchPlaceholder = 'Search...', searchField, onRowClick }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Handle Sort
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter & Sort Data
  const processedData = useMemo(() => {
    let result = [...(data || [])];

    // Search
    if (searchQuery && searchField) {
      result = result.filter((item) => {
        const value = item[searchField];
        return value ? String(value).toLowerCase().includes(searchQuery.toLowerCase()) : false;
      });
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === undefined || bValue === undefined) return 0;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();

        if (aString < bString) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aString > bString) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, searchField, sortConfig]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      {searchField && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-field-text-secondary" size={16} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-field-card border border-field-border rounded-xl text-sm text-field-text-primary placeholder-field-text-secondary/60 focus:outline-none focus:border-field-primary focus:ring-1 focus:ring-field-primary shadow-card transition"
          />
        </div>
      )}

      {/* Table Wrapper with Sticky Headers */}
      <div className="overflow-x-auto rounded-2xl border border-field-border bg-field-card shadow-card max-h-[600px] scrollbar-thin">
        <table className="w-full border-collapse text-left text-sm text-field-text-primary">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_var(--color-field-border)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && requestSort(col.key)}
                  className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-field-text-secondary ${col.sortable !== false ? 'cursor-pointer select-none hover:text-field-text-primary' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.title}
                    {col.sortable !== false && sortConfig.key === col.key && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-field-border">
            {processedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-field-text-secondary">
                  No records found.
                </td>
              </tr>
            ) : (
              processedData.map((row, idx) => (
                <tr
                  key={row.id || row.gateway_id || row.nodeId || idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition hover:bg-field-hover ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-field-text-primary font-medium">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
