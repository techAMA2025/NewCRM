import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  gradient: string;
  textColor: string;
  progress?: number;
  icon?: React.ReactNode;
  showProgress?: boolean;
  className?: string;
  // New props for dual value display
  collectedValue?: string | number;
  targetValue?: string | number;
  collectedColor?: string;
  targetColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  gradient,
  textColor,
  progress = 0,
  icon,
  showProgress = false,
  className = "",
  collectedValue,
  targetValue,
  collectedColor = "text-green-400",
  targetColor = "text-gray-400"
}) => {
  return (
    <div className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden shadow-lg border border-gray-700 flex flex-col h-full ${className}`}>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className={`${textColor} font-medium text-xs uppercase tracking-wider mb-1`}>
          {title}
        </h3>
        
        {/* Display dual values if provided, otherwise show single value */}
        {collectedValue && targetValue ? (
          <div className="mb-2">
            <div className="flex items-baseline space-x-1">
              <p className={`text-xl font-bold ${collectedColor}`}>{collectedValue}</p>
              <span className="text-gray-500 text-lg">/</span>
            </div>
            <div className="flex items-baseline space-x-1">
              <p className={`text-lg font-semibold ${targetColor}`}>{targetValue}</p>
              {subtitle && (
                <p className="text-xs text-gray-400">{subtitle}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-baseline space-x-1 mb-2">
            <p className="text-xl font-bold text-white">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-400">{subtitle}</p>
            )}
          </div>
        )}
        
        <div className="mt-auto">
          {showProgress ? (
            <>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${gradient} rounded-full`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </>
          ) : icon ? (
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center p-1.5 bg-gray-700/50 rounded-full">
                {icon}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className={`w-full h-1 ${gradient}`}></div>
    </div>
  );
}; 