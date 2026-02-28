import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Zap, Fuel, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FormulaFx } from "@/components/FormulaFx";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import { toast } from "sonner";

export default function ImpactCalculator() {
  const { company } = useAuthStore();
  const [electricity, setElectricity] = useState([50000]);
  const [fuel, setFuel] = useState([3000]);
  const [waste, setWaste] = useState([5000]);

  const { data: facilityData } = useQuery({
    queryKey: ['company', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const res: any = await api.get(`/companies/${company.id}`);
      return res.data ?? null;
    },
    enabled: !!company?.id,
  });

  useEffect(() => {
    if (facilityData?.baselineMetrics) {
      if (facilityData.baselineMetrics.monthlyElectricityKwh) setElectricity([facilityData.baselineMetrics.monthlyElectricityKwh]);
      if (facilityData.baselineMetrics.monthlyFuelLiters?.diesel) setFuel([facilityData.baselineMetrics.monthlyFuelLiters.diesel]);
    }
  }, [facilityData]);

  const co2Electricity = electricity[0] * 0.82;
  const co2Fuel = fuel[0] * 2.68;
  const co2Waste = waste[0] * 0.5;
  const totalCO2 = co2Electricity + co2Fuel + co2Waste;
  const industryAvg = 95000;

  const breakdown = [
    { source: "Electricity", co2: Math.round(co2Electricity), fill: "hsl(202, 48%, 33%)" },
    { source: "Fuel", co2: Math.round(co2Fuel), fill: "hsl(16, 100%, 60%)" },
    { source: "Waste", co2: Math.round(co2Waste), fill: "hsl(150, 60%, 40%)" },
  ];

  return (
    <div className="space-y-6 max-w-[1000px]">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Impact Calculator</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Estimate your carbon footprint in real time</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="industrial-card p-6 space-y-6">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" /> Input Parameters
          </h3>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="data-label flex items-center gap-1.5 pt-1">
                  <Zap className="h-3 w-3" /> Electricity (kWh/month)
                  <FormulaFx className="ml-1" data={{
                    name: "Scope 2 Emissons: Electricity",
                    expression: "CO₂ = kWh × Grid_EF",
                    inputs: "Grid Emission Factor (India Avg)",
                    result: `Calculates ${electricity[0]} × 0.82`,
                    source: "Central Electricity Authority (CEA)",
                    confidence: 90
                  }} />
                </label>
                <span className="font-mono text-sm font-semibold">{electricity[0].toLocaleString()}</span>
              </div>
              <Slider value={electricity} onValueChange={setElectricity} min={0} max={200000} step={1000} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="data-label flex items-center gap-1.5 pt-1">
                  <Fuel className="h-3 w-3" /> Fuel (liters/month)
                  <FormulaFx className="ml-1" data={{
                    name: "Scope 1 Emissons: Diesel",
                    expression: "CO₂ = Liters × Density × Net_Calorific_Value × EF",
                    inputs: "Standard Diesel Specs",
                    result: `Calculates ${fuel[0]} × 2.68`,
                    source: "IPCC 2006 Guidelines",
                    confidence: 95
                  }} />
                </label>
                <span className="font-mono text-sm font-semibold">{fuel[0].toLocaleString()}</span>
              </div>
              <Slider value={fuel} onValueChange={setFuel} min={0} max={20000} step={100} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="data-label flex items-center gap-1.5 pt-1">
                  <Trash2 className="h-3 w-3" /> Waste (kg/month)
                  <FormulaFx className="ml-1" data={{
                    name: "Scope 3 Emissons: Waste",
                    expression: "CO₂ = kg × Disposal_EF",
                    inputs: "Mixed Industrial Waste to Landfill",
                    result: `Calculates ${waste[0]} × 0.50`,
                    source: "EPA WARM Model",
                    confidence: 85
                  }} />
                </label>
                <span className="font-mono text-sm font-semibold">{waste[0].toLocaleString()}</span>
              </div>
              <Slider value={waste} onValueChange={setWaste} min={0} max={50000} step={500} />
            </div>
          </div>
        </motion.div>

        {/* Results */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <div className="rounded-xl bg-gradient-forest p-6 text-primary-foreground">
            <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Estimated CO₂ Output</p>
            <p className="font-mono text-4xl font-bold">{Math.round(totalCO2).toLocaleString()}</p>
            <p className="text-sm opacity-80 mt-1">kg CO₂ per month</p>
            <div className="mt-4 pt-3 border-t border-primary-foreground/20 flex items-center justify-between">
              <div>
                <p className="text-xs opacity-70">Industry Average</p>
                <p className="font-mono text-lg font-semibold">{industryAvg.toLocaleString()} kg</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${totalCO2 < industryAvg ? "bg-primary-foreground/20" : "bg-accent/80 text-accent-foreground"}`}>
                {totalCO2 < industryAvg ? `${Math.round(((industryAvg - totalCO2) / industryAvg) * 100)}% Below Avg` : `${Math.round(((totalCO2 - industryAvg) / industryAvg) * 100)}% Above Avg`}
              </span>
            </div>
          </div>

          <div className="industrial-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Breakdown by Source</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={breakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(210, 18%, 90%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} stroke="hsl(210, 12%, 70%)" />
                <YAxis type="category" dataKey="source" tick={{ fontSize: 12 }} stroke="hsl(210, 12%, 70%)" width={70} />
                <Tooltip formatter={(value: number) => [`${value.toLocaleString()} kg CO₂`, ""]} />
                <Bar dataKey="co2" radius={[0, 6, 6, 0]} barSize={24}>
                  {breakdown.map((entry, i) => (
                    <motion.rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <Button className="w-full gap-2" onClick={() => toast.success("Compiling comprehensive Impact Report. Download starting shortly...")}>
            <Download className="h-4 w-4" /> Generate Report (PDF)
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
