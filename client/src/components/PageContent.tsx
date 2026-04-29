/**
 * PageContent wrapper for responsive layouts
 * Provides flexible padding and full-width/max-width options
 */

import React from 'react';
import { PageHeader } from './PageHeader';

interface PageContentProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** If true, content takes full width. If false, centers with max-width */
  fullWidth?: boolean;
  /** Custom className for additional styling */
  className?: string;
  /** Padding size: 'sm' | 'md' | 'lg' (default: 'md') */
  padding?: 'sm' | 'md' | 'lg';
}

export function PageContent({
  title,
  description,
  actions,
  children,
  fullWidth = false,
  className = '',
  padding = 'md',
}: PageContentProps) {
  const paddingClass = {
    sm: 'p-4 md:p-4',
    md: 'p-6 md:p-8',
    lg: 'p-8 md:p-10',
  }[padding];

  const contentClass = fullWidth
    ? 'w-full'
    : 'max-w-7xl mx-auto w-full';

  return (
    <div className={`flex flex-col flex-1 ${className}`}>
      {/* Header section with padding */}
      <div className={`${paddingClass} border-b border-gray-200`}>
        <div className={contentClass}>
          <PageHeader title={title} description={description} actions={actions} />
        </div>
      </div>

      {/* Content section - grows to fill available space */}
      <div className={`flex-1 overflow-y-auto ${paddingClass}`}>
        <div className={contentClass}>
          {children}
        </div>
      </div>
    </div>
  );
}
