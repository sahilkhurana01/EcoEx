/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from "framer-motion";
import { Factory, Recycle, IndianRupee, Award, Cloud, Thermometer, Loader2, AlertTriangle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { StatCard } from "@/components/StatCard";
import { AIRecommendations } from "@/components/AIRecommendation";
import { FormulaFx } from "@/components/FormulaFx";

export default function Dashboard() {
  const { company } = useAuthStore();

  const { data: prediction, isLoading: isPredLoading, error: predError } = useQuery({
    queryKey: ['prediction', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const res: any = await api.get(`/predictions/${company.id}`);
      if (res.success) return res.data;
      throw new Error(res.error || "Failed to load dashboard data");
    },
    enabled: !!company?.id,
    retry: (failureCount, error: any) => {
      // Don't retry on 401 or 429
      if (error.status === 401 || error.status === 429) return false;
      return failureCount < 2;
    }
  });

  if (isPredLoading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (predError) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Dashboard Error</h2>
        <p className="text-sm text-muted-foreground w-1/2 text-center">
          {(predError as any).message || "An error occurred while loading your data."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-warning" />
        <h2 className="text-xl font-semibold">No Data Available</h2>
        <p className="text-sm text-muted-foreground w-1/2 text-center">
          We are currently generating your prediction model. Please ensure you have completed the onboarding process.
        </p>
      </div>
    );
  }

  // Formatting historical + forecasted data for the chart
  const historicalData = (prediction.historicalData || []).map((val: number, i: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (prediction.historicalData.length - i));
    return {
      month: d.toLocaleString('default', { month: 'short' }),
      actual: val,
      forecast: null,
      lower: null,
      upper: null,
    };
  });

  const forecastData = (prediction.forecasts || []).map((f: any, i: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i + 1);
    return {
      month: d.toLocaleString('default', { month: 'short' }),
      actual: null,
      forecast: f.value,
      lower: f.lower,
      upper: f.upper,
    };
  });

  const trendData = [...historicalData, ...forecastData];

  // Pie chart breakdown
  const bd = prediction.currentEmissions?.breakdown || {};
  const srcBreakdown = [
    { name: "Electricity", value: bd.electricity || 0, color: "hsl(202, 48%, 33%)" },
    { name: "Diesel", value: bd.diesel || 0, color: "hsl(150, 60%, 40%)" },
    { name: "Coal", value: bd.coal || 0, color: "hsl(181, 61%, 15%)" },
    { name: "Natural Gas", value: bd.naturalGas || 0, color: "hsl(16, 100%, 60%)" },
    { name: "Waste", value: bd.waste || 0, color: "hsl(210, 12%, 70%)" },
  ].filter(s => s.value > 0);

  // Normalize percentages
  const totalBd = srcBreakdown.reduce((sum, item) => sum + item.value, 0);
  const normalizedBreakdown = srcBreakdown.map(s => ({
    ...s,
    percentage: totalBd > 0 ? Math.round((s.value / totalBd) * 100) : 0,
  }));

  const co2Total = prediction.currentEmissions?.totalCo2e || 0;

  // Calculate trend
  const lastMonthValue = historicalData.length >= 2 ? historicalData[historicalData.length - 2].actual : co2Total;
  const trendPct = lastMonthValue > 0 ? ((co2Total - lastMonthValue) / lastMonthValue) * 100 : 0;
  const isTrendPositive = trendPct < 0; // Negative emissions growth means positive trend

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{company?.name || "Company"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Operations Dashboard · {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <Cloud className="h-4 w-4 text-secondary" />
            <span className="text-muted-foreground">Data Confidence: {prediction.dataQuality?.overallConfidence || 0}%</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <Thermometer className="h-4 w-4 text-accent" />
            <span className="text-muted-foreground">Scope: 1, 2 & Waste</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Carbon Footprint"
              value={`${co2Total.toLocaleString()} kg`}
              icon={<Factory className="h-5 w-5" />}
              trend={{ value: `${Math.abs(trendPct).toFixed(1)}%`, positive: isTrendPositive }}
              delay={0}
              formula={{
                name: "Scope 1 & 2 Emissions",
                expression: "CO₂ = (kWh × EF_grid) + (Fuel_L × EF_fuel)",
                inputs: "Electricity (kWh), Natural Gas, Generator Fuel",
                result: `${co2Total.toLocaleString()} kg CO₂`,
                source: "GHG Protocol, EPA Emission Factors",
                confidence: prediction.dataQuality?.overallConfidence || 92
              }}
            >
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">CO₂ this month</span>
              </div>
            </StatCard>
            <StatCard
              title="Projected Year-End"
              value={`${(prediction.annualProjection?.value / 1000).toLocaleString()} t`}
              subtitle={`±${(Math.abs(prediction.annualProjection?.value - prediction.annualProjection?.upper) / 1000).toLocaleString()}t margin`}
              icon={<Recycle className="h-5 w-5" />}
              trend={{ value: prediction.trendDirection === 'improving' ? 'Improving' : 'Stable', positive: prediction.trendDirection === 'improving' }}
              delay={0.1}
              formula={{
                name: "Triple Exponential Smoothing",
                expression: "F_(t+m) = (S_t + m·b_t) × c_(t-L+1+m_mod_L)",
                inputs: "Historical Monthly Emissions (12m window)",
                result: `${(prediction.annualProjection?.value / 1000).toLocaleString()} t`,
                source: "EcoExchange Predictive Engine",
                confidence: Math.round(prediction.confidenceScore) || 85
              }}
            />
            <StatCard
              title="Optimization Value"
              value="Checking..."
              subtitle="Pending AI evaluation of savings"
              icon={<IndianRupee className="h-5 w-5" />}
              delay={0.2}
              formula={{
                name: "AI Financial Savings Potential",
                expression: "₹ = ∑(Suggested_Reduction_kg × Carbon_Price) + Resource_Savings",
                inputs: "Groq LLM Output, Grid Tariffs, Setup Costs",
                result: "Calculating",
                source: "EcoExchange Resource Pricing Oracle",
                confidence: 75
              }}
            />
            <StatCard
              title="ESG Rating Alignment"
              value={`${prediction.dataQuality?.overallConfidence}/100`}
              subtitle="Data auditability score"
              icon={<Award className="h-5 w-5" />}
              delay={0.3}
              formula={{
                name: "Data Veracity Score",
                expression: "Score = (Completeness × 0.4) + (Meter_Resolution × 0.6)",
                inputs: "Onboarding Data Density, Verification Status",
                result: `${prediction.dataQuality?.overallConfidence}/100`,
                source: "EcoExchange Trust Algorithm",
                confidence: 95
              }}
            />
          </div>

          {/* Carbon trend chart with AI Forecasting */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="industrial-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Carbon Trend & AI Forecast</h3>
                  <FormulaFx data={{
                    name: "Holt-Winters Forecasting",
                    expression: "Forecast bounds ± (Z_score × Standard_Error)",
                    inputs: "12m Historical Profile, Confidence Score",
                    result: "Trend bounds rendered on chart",
                    source: "EcoExchange ML",
                    confidence: Math.round(prediction.confidenceScore) || 85
                  }} />
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 font-mono">Exponential Smoothing Model (±{Math.round(prediction.confidenceScore)}% Confidence)</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(16, 100%, 60%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(16, 100%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 18%, 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(210, 12%, 70%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(210, 12%, 70%)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(0, 0%, 100%)",
                    border: "1px solid hsl(210, 18%, 90%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [`${value.toLocaleString()} kg`, name]}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(181, 61%, 15%)"
                  fillOpacity={0}
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }}
                  name="Actual Emissions"
                />
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fillOpacity={0}
                  name="Upper Bound"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fillOpacity={0}
                  name="Lower Bound"
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="hsl(16, 100%, 60%)"
                  strokeDasharray="5 5"
                  strokeWidth={2.5}
                  fill="url(#forecastFill)"
                  name="AI Forecast"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Source breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="industrial-card p-5"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">Emission Sources Breakdown</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={normalizedBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="percentage"
                    strokeWidth={2}
                    stroke="hsl(0, 0%, 100%)"
                  >
                    {normalizedBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 grid grid-cols-2 gap-3">
                {normalizedBreakdown.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-muted-foreground">{s.name}</span>
                    <span className="text-xs font-mono font-semibold ml-auto">{s.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Carbon highlight */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl bg-gradient-forest p-5 text-primary-foreground"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs uppercase tracking-widest opacity-80">Monthly Carbon Output</p>
              <FormulaFx className="text-primary-foreground/70 hover:text-white" data={{
                name: "Total Scope 1 + Scope 2 Net",
                expression: "CO₂e = ∑(Activity_Data × Emission_Factor)",
                inputs: "Electricity, Fuel, Process Gas",
                result: `${co2Total.toLocaleString()} kg`,
                source: "GHG Protocol Corporate Standard",
                confidence: prediction.dataQuality?.overallConfidence || 90
              }} />
            </div>
            <p className="font-mono text-3xl font-bold tracking-tight">{co2Total.toLocaleString()}</p>
            <p className="text-sm opacity-80 mt-0.5">kg CO₂ equivalent</p>
            <div className="mt-3 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isTrendPositive ? 'bg-success/20 text-success-foreground' : 'bg-destructive/20 text-destructive-foreground'}`}>
                {isTrendPositive ? '↓' : '↑'} {Math.abs(trendPct).toFixed(1)}% vs Last Month
              </span>
            </div>
          </motion.div>

          <AIRecommendations companyId={company?.id} />
        </div>
      </div>
    </div>
  );
}
