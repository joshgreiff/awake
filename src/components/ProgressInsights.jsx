import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getSnapshots, getNeedTrend, getTraitTrend, getInsights, getWeeklyAverages } from '../utils/dataTracking';
import { getTraitColor } from '../utils/traitSystem';
import './ProgressInsights.css';

const ProgressInsights = ({ userId, needs, attributes, curiosities }) => {
  const [timeRange, setTimeRange] = useState(7); // 7, 14, or 30 days
  const [selectedView, setSelectedView] = useState('needs'); // 'needs', 'traits', or 'curiosities'
  const [insights, setInsights] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadInsights();
    loadChartData();
  }, [userId, timeRange, selectedView]);

  const loadInsights = () => {
    const userInsights = getInsights(userId);
    setInsights(userInsights);
  };

  const loadChartData = () => {
    const snapshots = getSnapshots(userId, timeRange);
    
    if (snapshots.length === 0) {
      setChartData([]);
      return;
    }

    if (selectedView === 'needs') {
      // Create chart data for needs
      const data = snapshots.map(s => {
        const dataPoint = { date: formatDate(s.date) };
        s.needs.forEach(n => {
          dataPoint[n.name] = n.value;
        });
        return dataPoint;
      });
      setChartData(data);
    } else if (selectedView === 'traits') {
      // Create chart data for traits (using score 0-10)
      const data = snapshots.map(s => {
        const dataPoint = { date: formatDate(s.date) };
        s.traits.forEach(t => {
          dataPoint[t.name] = t.score.toFixed(1);
        });
        return dataPoint;
      });
      setChartData(data);
    } else if (selectedView === 'curiosities') {
      // Create chart data for curiosities inspiration levels
      const data = snapshots.map(s => {
        const dataPoint = { date: formatDate(s.date) };
        if (s.curiosities) {
          s.curiosities.forEach(c => {
            dataPoint[c.text] = c.inspiration;
          });
        }
        return dataPoint;
      });
      setChartData(data);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getLineColor = (name, index) => {
    if (selectedView === 'traits') {
      return getTraitColor(name);
    }
    
    if (selectedView === 'needs') {
      // Need colors
      const needColors = {
        'Energy': '#FF6B6B',
        'Focus': '#4ECDC4',
        'Joy': '#FFE66D',
        'Connection': '#A8E6CF'
      };
      return needColors[name] || `hsl(${index * 60}, 70%, 60%)`;
    }
    
    // Curiosity colors - vibrant palette
    const curiosityColors = [
      '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF',
      '#FF8B94', '#95E1D3', '#F38181', '#AA96DA',
      '#FCBAD3', '#FFFFD2', '#A8DADC', '#F1C0E8'
    ];
    return curiosityColors[index % curiosityColors.length];
  };

  if (chartData.length === 0) {
    return (
      <div className="progress-insights">
        <div className="insights-header">
          <h3>📊 Progress Insights</h3>
        </div>
        <div className="no-data-message">
          <p>🌱 Complete your daily reflection to start tracking progress!</p>
          <p className="subtitle">Your journey data will appear here as you use Awake.</p>
        </div>
      </div>
    );
  }

  const dataKeys = selectedView === 'needs' 
    ? needs.map(n => n.name)
    : selectedView === 'traits'
    ? attributes.map(a => a.name)
    : curiosities.map(c => c.text);

  return (
    <div className="progress-insights">
      <div className="insights-header">
        <h3>📊 Progress Insights</h3>
        <div className="insights-controls">
          <div className="view-toggle">
            <button 
              className={selectedView === 'needs' ? 'active' : ''}
              onClick={() => setSelectedView('needs')}
            >
              Needs
            </button>
            <button 
              className={selectedView === 'traits' ? 'active' : ''}
              onClick={() => setSelectedView('traits')}
            >
              Traits
            </button>
            <button 
              className={selectedView === 'curiosities' ? 'active' : ''}
              onClick={() => setSelectedView('curiosities')}
            >
              Curiosities
            </button>
          </div>
          <div className="time-range-selector">
            <button 
              className={timeRange === 7 ? 'active' : ''}
              onClick={() => setTimeRange(7)}
            >
              7d
            </button>
            <button 
              className={timeRange === 14 ? 'active' : ''}
              onClick={() => setTimeRange(14)}
            >
              14d
            </button>
            <button 
              className={timeRange === 30 ? 'active' : ''}
              onClick={() => setTimeRange(30)}
            >
              30d
            </button>
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="insights-list">
          {insights.map((insight, index) => (
            <div key={index} className="insight-item">
              {insight}
            </div>
          ))}
        </div>
      )}

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis 
              stroke="#666"
              domain={selectedView === 'needs' ? [0, 100] : [0, 10]}
              style={{ fontSize: '0.75rem' }}
            />
            <Tooltip 
              contentStyle={{ 
                background: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '0.85rem' }}
            />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={getLineColor(key, index)}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressInsights; 