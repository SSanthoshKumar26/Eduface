import React, { useState } from 'react';
import { Info } from 'lucide-react';

const ThemeSelector = ({ selectedTheme, onThemeSelect }) => {
  const [hoveredTheme, setHoveredTheme] = useState(null);

  const themes = [
    {
      id: 'modern_blue',
      name: 'Blue',
      icon: '🎨',
      description: 'Professional blue gradient'
    },
    {
      id: 'modern_purple',
      name: 'Purple',
      icon: '💜',
      description: 'Creative purple theme'
    },
    {
      id: 'modern_green',
      name: 'Green',
      icon: '🌿',
      description: 'Fresh green palette'
    },
    {
      id: 'modern_sunset',
      name: 'Sunset',
      icon: '🌅',
      description: 'Warm sunset colors'
    },
    {
      id: 'minimal_dark',
      name: 'Dark',
      icon: '🌙',
      description: 'Minimalist dark theme'
    },
    {
      id: 'minimal_light',
      name: 'Light',
      icon: '☀️',
      description: 'Bright and minimal'
    },
    {
      id: 'corporate',
      name: 'Corporate',
      icon: '💼',
      description: 'Professional business'
    },
    {
      id: 'creative',
      name: 'Creative',
      icon: '🎭',
      description: 'Bold and artistic'
    }
  ];

  const selectedThemeData = themes.find(t => t.id === selectedTheme);

  return (
    <div className="ppt-theme-selector">
      <div className="ppt-theme-grid">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className={`ppt-theme-option ${theme.id === selectedTheme ? 'active' : ''}`}
            onClick={() => onThemeSelect(theme.id)}
            onMouseEnter={() => setHoveredTheme(theme.id)}
            onMouseLeave={() => setHoveredTheme(null)}
            title={theme.name}
          >
            <div className={`ppt-theme-preview ppt-theme-${theme.id.replace('_', '-')}`}>
              <span className="ppt-theme-icon">{theme.icon}</span>
            </div>
            <p className="ppt-theme-name">{theme.name}</p>
            {theme.id === selectedTheme && (
              <div className="ppt-theme-badge">✓</div>
            )}
          </div>
        ))}
      </div>

      {selectedThemeData && (
        <div className="ppt-theme-info">
          <Info size={16} className="ppt-theme-info-icon" />
          <div className="ppt-theme-info-content">
            <p className="ppt-theme-info-title">{selectedThemeData.name}</p>
            <p className="ppt-theme-info-desc">{selectedThemeData.description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;