interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  desc?: string;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
}) => {
  return (
    <div
      className={`bento-card ${className}`}
    >
      {/* Card Header */}
      <div className="px-6 py-5">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
          {title}
        </h3>
        {desc && (
          <p className="mt-1 text-sm font-medium text-gray-500">
            {desc}
          </p>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 border-t border-brand-50 sm:p-8">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
