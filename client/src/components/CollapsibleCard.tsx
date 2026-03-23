import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function CollapsibleCard({ title, subtitle, defaultOpen = true, className = '', children, actions }: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-left">
          {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </button>
        {actions && <div>{actions}</div>}
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
