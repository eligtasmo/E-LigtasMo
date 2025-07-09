import { Link } from "react-router-dom";

type KeyMetricCardProps = {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  to: string;
  color: string; // e.g., 'bg-blue-500'
};

const KeyMetricCard = ({ title, value, subtext, icon, to, color }: KeyMetricCardProps) => (
  <Link to={to} className="block p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
    <div className="flex items-center">
      <div className={`p-3 rounded-full mr-4 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-gray-500 text-sm font-medium">{title}</div>
        <div className="text-2xl font-bold text-gray-800">{value}</div>
        {subtext && <div className="text-gray-400 text-xs">{subtext}</div>}
      </div>
    </div>
  </Link>
);

export default KeyMetricCard; 