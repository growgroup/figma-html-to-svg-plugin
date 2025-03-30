import * as React from 'react';

interface ProgressIndicatorProps {
  stage: string;
  percentage: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ stage, percentage }) => {
  return (
    <div className="progress-indicator">
      <div className="progress-stage">{stage}</div>
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="progress-percentage">{percentage}%</div>
    </div>
  );
};

export default ProgressIndicator; 