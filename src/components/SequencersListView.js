import React from 'react';
import Header from './SequencersHeader';
import ListItem from './SequencersListItem';


const ListView = ({ data, onSort, sortConfig }) => {
  const getSortArrow = (columnKey) => {
    if (sortConfig.key !== columnKey) return '';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'sequencerId', label: 'Sequencer ID' },
    { key: 'balance', label: 'Balance' },
    { key: 'lastActive', label: 'Last Active' },
  ];

  return (
    <table className="sequencer-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              onClick={() => onSort(col.key)}
              className="sortable-header"
            >
              <span className="header-content">
                {col.label}
                <span
                  className={`sort-arrow ${
                    sortConfig.key === col.key ? 'active' : ''
                  }`}
                >
                  {getSortArrow(col.key) || '⇅'}
                </span>
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((seq) => (
          <ListItem key={seq.sequencerId} name={seq.name} sequencerId={seq.sequencerId} balance={seq.balance} lastActive={seq.lastActive} />
        ))}
      </tbody>

      <style>{`
        .sequencer-table {
          width: 100%;
          border-collapse: collapse;
          font-family: sans-serif;
        }

        .sequencer-table th {
          background: #f4f4f4;
          border-bottom: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          cursor: pointer;
          user-select: none;
          position: relative;
        }

        .sequencer-table th .header-content {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Initially hide the arrow */
        .sort-arrow {
          opacity: 0;
          transition: opacity 0.15s ease-in-out;
          font-size: 12px;
        }

        /* Show arrow on hover */
        .sortable-header:hover .sort-arrow {
          opacity: 1;
        }

        /* Always show active sort arrow (for the currently sorted column) */
        .sort-arrow.active {
          opacity: 1;
          color: #007bff;
          font-weight: bold;
        }

        .sequencer-table tr:hover {
          background-color: #fafafa;
        }
      `}</style>
    </table>
  );
}

export default ListView;
