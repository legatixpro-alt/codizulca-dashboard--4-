import React from 'react';
import { cn } from '../../lib/utils';

interface ProgressBarProps extends React.ComponentProps<"div"> {
  value: number;
  max?: number;
  indicatorColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, indicatorColor = 'bg-primary-600', className, ...props }) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-gray-100", className)} {...props}>
      <div 
        className={cn("h-full transition-all duration-500 ease-in-out", indicatorColor)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
