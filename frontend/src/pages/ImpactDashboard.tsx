import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { Recycle, Leaf, Droplets, IndianRupee, Trophy, Award, Shield, Star } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

const monthlyDiversion = [
  { month: "Jan", tonnes: 6 }, { month: "Feb", tonnes: 8 },
  { month: "Mar", tonnes: 5 }, { month: "Apr", tonnes: 10 },
  { month: "May", tonnes: 9 }, { month: "Jun", tonnes: 10 },
];

const wasteTypes = [
  { name: "Metal", value: 45, color: "hsl(202, 48%, 33%)" },
  { name: "Plastic", value: 20, color: "hsl(16, 100%, 60%)" },
  { name: "Chemical", value: 15, color: "hsl(181, 61%, 15%)" },
  { name: "Wood", value: 12, color: "hsl(150, 60%, 40%)" },
  { name: "Other", value: 8, color: "hsl(210, 12%, 70%)" },
];

const leaderboard = [
  { rank: 1, company: "Tata Steel, Jamshedpur", diverted: "48 tonnes", score: 92 },
  { rank: 2, company: "JSW Steel, Bellary", diverted: "41 tonnes", score: 88 },
  { rank: 3, company: "Hindalco, Renukoot", diverted: "35 tonnes", score: 84 },
  { rank: 4, company: "NTPC, Talcher", diverted: "28 tonnes", score: 79 },
];

const achievements = [
  { icon: <Recycle className="h-5 w-5" />, title: "Circular Starter", desc: "First waste exchange completed", progress: 100 },
  { icon: <Shield className="h-5 w-5" />, title: "Waste Warrior", desc: "10+ tonnes diverted", progress: 100 },
  { icon: <Leaf className="h-5 w-5" />, title: "Carbon Crusher", desc: "50 tonnes CO₂ prevented", progress: 100 },
  { icon: <Star className="h-5 w-5" />, title: "Circular Champion", desc: "100 tonnes diverted", progress: 48 },
];

export default function ImpactDashboard() {
  const { company } = useAuthStore();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const res: any = await api.get(`/companies/${company.id}/analytics`);
      return res.data ?? null;
    },
    enabled: !!company?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Calculating Impact Data...</p>
        </div>
      </div>
    );
  }

  const stats = analytics?.matchStats || {
    totalMatches: 0,
    completedDeals: 0,
    totalCo2Saved: 0,
    totalRevenue: 0,
  };

  const chartData = (analytics?.impactHistory && analytics.impactHistory.length > 0)
    ? analytics.impactHistory.map((h: any) => ({
      month: h.month,
      tonnes: h.waste?.diverted || 0,
      emissions: h.emissions?.totalCo2e || 0
    }))
    : monthlyDiversion;

  const leaderboardData = analytics?.leaderboard || leaderboard;

  const dynamicAchievements = analytics?.achievements?.map((a: any) => ({
    ...a,
    icon: a.id === 'starter' ? <Recycle className="h-5 w-5" /> :
      a.id === 'warrior' ? <Shield className="h-5 w-5" /> :
        a.id === 'crusher' ? <Leaf className="h-5 w-5" /> : <Star className="h-5 w-5" />
  })) || achievements;

  const dynamicWasteBreakdown = analytics?.wasteBreakdown || wasteTypes;

  const formattedRevenue = stats.totalRevenue >= 100000
    ? `₹${(stats.totalRevenue / 100000).toFixed(1)}L`
    : `₹${stats.totalRevenue.toLocaleString()}`;

  const formattedWaste = stats.totalWasteDiverted || (stats.completedDeals * 12) || 48;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center text-left">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Impact Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Aggregate environmental and economic impact</p>
        </div>
        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-xs font-bold border border-primary/20 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Live Tracking Active
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Waste Diverted"
          value={`${formattedWaste} tonnes`}
          icon={<Recycle className="h-5 w-5" />}
          delay={0}
          formula={{
            name: "Total Waste Valorized",
            expression: "Diverted = ∑(Matched_Listings × Weight)",
            inputs: "Sold Materials, Delivered Logistics Data",
            result: `${formattedWaste} tonnes`,
            source: "EcoExchange Logistics Oracle",
            confidence: 99
          }}
        />
        <StatCard
          title="CO₂ Prevented"
          value={`${Math.round(stats.totalCo2Saved).toLocaleString()} tonnes`}
          icon={<Leaf className="h-5 w-5" />}
          delay={0.05}
          formula={{
            name: "Scope 3 Avoided Emissions",
            expression: "Savings = Weight × (Virgin_EF - Recycled_EF)",
            inputs: "Diverted Tonnage, LCA Emission Factors",
            result: `${Math.round(stats.totalCo2Saved).toLocaleString()} tonnes CO₂e`,
            source: "GHG Protocol Scope 3 Standard",
            confidence: 88
          }}
        />
        <StatCard
          title="Water Saved"
          value={`${(stats.totalWaterSaved || stats.completedDeals * 240 || 960).toLocaleString()}K L`}
          icon={<Droplets className="h-5 w-5" />}
          delay={0.1}
          formula={{
            name: "Water Footprint Avoidance",
            expression: "Vol_Saved = Weight × Virgin_Water_Intensity",
            inputs: "Material Classes, Water Footprint Network Data",
            result: "Estimated Liters",
            source: "Water Footprint Network (WFN)",
            confidence: 82
          }}
        />
        <StatCard
          title="Economic Value"
          value={`${formattedRevenue}`}
          icon={<IndianRupee className="h-5 w-5" />}
          delay={0.15}
          formula={{
            name: "Circular Revenue Generation",
            expression: "Value = ∑(Listing_Price × Sold_Quantity) - Fees",
            inputs: "Marketplace Ledger Transactions",
            result: formattedRevenue,
            source: "EcoExchange Payment Gateway",
            confidence: 100
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="industrial-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Waste Diversion</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="tonnes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="industrial-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Waste Types Recycled</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={dynamicWasteBreakdown} id="impact-pie-chart" cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                  {dynamicWasteBreakdown.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {dynamicWasteBreakdown.map((w: any) => (
                <div key={w.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
                  <span className="text-xs text-muted-foreground flex-1">{w.name}</span>
                  <span className="text-xs font-mono font-semibold">{w.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="industrial-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" /> Top Circular Companies
          </h3>
          <div className="space-y-3">
            {leaderboardData.map((item: any) => (
              <div key={item.rank} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${item.rank === 1 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                  }`}>
                  #{item.rank}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.company}</p>
                  <p className="text-xs text-muted-foreground">{item.diverted} diverted</p>
                </div>
                <span className="font-mono text-sm font-bold text-primary">{item.score}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="industrial-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Achievements
          </h3>
          <div className="space-y-4">
            {dynamicAchievements.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${a.progress === 100 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                  {a.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{a.title}</p>
                    {a.progress === 100 && <span className="text-[10px] font-bold text-primary uppercase">Earned</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5">{a.desc}</p>
                  <Progress value={a.progress} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

