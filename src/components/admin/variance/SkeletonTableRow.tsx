import React from 'react';

interface SkeletonTableRowProps {
  columns?: number;
}

const SkeletonTableRow: React.FC<SkeletonTableRowProps> = ({ columns = 10 }) => {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="py-3 px-4 border-b border-gray-100 dark:border-gray-800">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </td>
      ))}
    </tr>
  );
};

export default SkeletonTableRow;