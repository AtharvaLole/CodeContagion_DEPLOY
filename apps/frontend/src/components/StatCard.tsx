import { cn } from "@/lib/utils";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface StatCardProps {
  title: string;
  value: string | number;
  sparklineData?: number[];
  color?: string;
  className?: string;
}

const StatCard = ({ title, value, sparklineData, color = "hsl(var(--primary))", className }: StatCardProps) => {
  const chartData = sparklineData?.map((v, i) => ({ v, i })) || [];

  return (
    <div className={cn("glass rounded-lg p-4", className)}>
      <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase mb-1">{title}</div>
      <div className="font-display text-2xl text-foreground">{value}</div>
      {chartData.length > 0 && (
        <div className="h-8 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default StatCard;
