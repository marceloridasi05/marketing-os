/**
 * PageLayout - Flexible responsive layout wrapper
 * Allows full-width or max-width content with responsive padding
 */

import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  /** If true, content takes full width. If false, centers with max-width */
  fullWidth?: boolean;
  /** Padding size: 'sm' | 'md' | 'lg' (default: 'md') */
  padding?: 'sm' | 'md' | 'lg';
  /** Custom className */
  className?: string;
}

export function PageLayout({
  children,
  fullWidth = false,
  padding = 'md',
  className = '',
}: PageLayoutProps) {
  const paddingClass = {
    sm: 'p-4 md:p-4',
    md: 'p-6 md:p-8',
    lg: 'p-8 md:p-10',
  }[padding];

  const contentClass = fullWidth
    ? 'w-full'
    : 'max-w-7xl mx-auto w-full';

  return (
    <div className={`flex flex-col flex-1 overflow-y-auto ${className}`}>
      <div className={`${paddingClass}`}>
        <div className={contentClass}>
          {children}
        </div>
      </div>
    </div>
  );
}
