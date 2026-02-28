import { ReactNode } from "react";
import { motion } from "framer-motion";
import { FormulaFx, FormulaData } from "./FormulaFx";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  children?: ReactNode;
  delay?: number;
  formula?: FormulaData;
}

export function StatCard({ title, value, subtitle, icon, trend, children, delay = 0, formula }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="industrial-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="data-label">{title}</span>
          {formula && <FormulaFx data={formula} />}
        </div>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
      <div className="data-value text-foreground">{value}</div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-xs font-semibold ${trend.positive ? "text-success" : "text-destructive"}`}>
            {trend.positive ? "↓" : "↑"} {trend.value}
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {children}
    </motion.div>
  );
}
