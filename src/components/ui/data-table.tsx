import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataTableProps<T> {
  columns: {
    key: string;
    header: string;
    className?: string;
    render?: (item: T) => ReactNode;
  }[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({ 
  columns, 
  data, 
  keyExtractor, 
  onRowClick,
  emptyMessage = 'Nenhum item encontrado',
  className 
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="table-header">
            {columns.map((col) => (
              <th 
                key={col.key} 
                className={cn('px-6 py-4 text-left', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr 
              key={keyExtractor(item)} 
              className={cn('table-row', onRowClick && 'cursor-pointer')}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-6 py-4', col.className)}>
                  {col.render 
                    ? col.render(item) 
                    : String((item as Record<string, unknown>)[col.key] ?? '')
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
