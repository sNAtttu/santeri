interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  description?: string;
  color?: string;
}

export default function MetricCard({
  label,
  value,
  unit,
  description,
  color = "text-gray-900",
}: MetricCardProps) {
  const displayValue = value === null || value === undefined ? "—" : value;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <span className={`text-2xl font-bold ${color}`}>
        {displayValue}
        {unit && value !== null && value !== undefined && (
          <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
        )}
      </span>
      {description && (
        <span className="text-xs text-gray-400">{description}</span>
      )}
    </div>
  );
}
