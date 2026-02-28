/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from "framer-motion";
import { Flame, Recycle, AlertTriangle, Zap, Droplets, Banknote, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FormulaFx } from "@/components/FormulaFx";

interface Suggestion {
  _id: string;
  category: string;
  title: string;
  description: string;
  impactScore: number;
  annualSavings: {
    co2Kg: number;
    inr: number;
  };
}

const CATEGORY_ICONS: Record<string, any> = {
  energy_efficiency: { icon: <Zap className="h-4 w-4" />, color: "text-accent bg-accent/10", type: "Energy" },
  fuel_switching: { icon: <Flame className="h-4 w-4" />, color: "text-destructive bg-destructive/10", type: "Fuel" },
  waste_valorization: { icon: <Recycle className="h-4 w-4" />, color: "text-success bg-success/10", type: "Circular" },
  process_optimization: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-warning bg-warning/10", type: "Process" },
  water_efficiency: { icon: <Droplets className="h-4 w-4" />, color: "text-blue-500 bg-blue-500/10", type: "Water" },
};

export function AIRecommendations({ companyId }: { companyId?: string }) {
  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['suggestions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const res: any = await api.get(`/suggestions/${companyId}?sort=impact`);
      return res.data;
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          AI Recommendations
        </h3>
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        AI Recommendations
      </h3>

      {!suggestions || suggestions.length === 0 ? (
        <div className="industrial-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Gathering operations intelligence. Suggestions will appear once the AI completes processing your data.</p>
        </div>
      ) : (
        suggestions.slice(0, 4).map((rec: Suggestion, i: number) => {
          const style = CATEGORY_ICONS[rec.category] || CATEGORY_ICONS.energy_efficiency;

          return (
            <motion.div
              key={rec._id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
              className="industrial-card p-3 cursor-pointer hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-md shrink-0 ${style.color}`}>
                  {style.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {style.type} Impact
                    </span>
                    <div className="flex items-center gap-1.5">
                      <FormulaFx data={{
                        name: "AI Savings & Feasibility Score",
                        expression: "Impact = (GHG_reduction × 0.4) + (ROI × 0.4) + (Ease_of_Implementation × 0.2)",
                        inputs: "Hardware Cost, Grid Tariffs, Llama 3 Inference",
                        result: `${rec.impactScore}/100`,
                        source: "EcoExchange LLM Engine",
                        confidence: 88
                      }} />
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold">{rec.impactScore}/100</span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-foreground leading-tight">{rec.title}</p>

                  <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-border/50">
                    {rec.annualSavings.inr > 0 && (
                      <span className="text-[10px] flex items-center gap-1 font-mono text-muted-foreground font-semibold"><Banknote className="h-3 w-3 text-success" /> {rec.annualSavings.inr >= 100000 ? `₹${(rec.annualSavings.inr / 100000).toFixed(1)}L` : `₹${rec.annualSavings.inr.toLocaleString()}`}/yr</span>
                    )}
                    {rec.annualSavings.co2Kg > 0 && (
                      <span className="text-[10px] flex items-center gap-1 font-mono text-muted-foreground font-semibold"><Flame className="h-3 w-3 opacity-60" /> {rec.annualSavings.co2Kg.toLocaleString()} kg/yr</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })
      )}
    </div>
  );
}
