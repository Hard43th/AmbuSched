import React from 'react';

const StatsCard = ({ icon: Icon, value, label, color = 'blue', trend, onClick }) => {
  const colorClasses = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    gray: 'text-gray-600'
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Icon className={`h-8 w-8 ${colorClasses[color]}`} />
          <div className="ml-4">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
          </div>
        </div>
        {trend && (
          <div className={`text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.positive ? '↗' : '↘'} {trend.value}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
