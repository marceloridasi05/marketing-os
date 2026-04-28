import { useState, useEffect } from 'react';
import { Target, TrendingUp } from 'lucide-react';

export type DashboardMode = 'normal' | 'abm';

const STORAGE_KEY = 'dashboard_mode';

export function useDashboardMode() {
  const [mode, setMode] = useState<DashboardMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'abm' ? 'abm' : 'normal');
  });

  const setModeAndPersist = (newMode: DashboardMode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  return { mode, setMode: setModeAndPersist };
}

interface ModeToggleProps {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => onModeChange('normal')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
          mode === 'normal'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
        title="Marketing performance view"
      >
        <TrendingUp size={16} />
        Desempenho
      </button>
      <button
        onClick={() => onModeChange('abm')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
          mode === 'abm'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
        title="Account-Based Marketing view"
      >
        <Target size={16} />
        ABM
      </button>
    </div>
  );
}
