interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-5 ${className}`}>
      {title && <h3 className="text-sm font-medium text-gray-500 mb-3">{title}</h3>}
      {children}
    </div>
  );
}
