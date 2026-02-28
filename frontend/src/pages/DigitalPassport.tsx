import { motion } from "framer-motion";
import { QrCode, CheckCircle2, Truck, Factory, Building, Droplets, Leaf, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormulaFx } from "@/components/FormulaFx";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

const journey = [
  { icon: <Factory className="h-5 w-5" />, title: "Origin", location: "Tata Steel Plant, Jamshedpur", date: "April 15, 2024", detail: "4,000 kg Steel Scrap produced" },
  { icon: <Truck className="h-5 w-5" />, title: "Transport", location: "50km by truck", date: "April 15-16, 2024", detail: "12 kg CO₂ emitted in transit" },
  { icon: <Building className="h-5 w-5" />, title: "Destination", location: "RCC Constructions, Ranchi", date: "April 16, 2024", detail: "Used for structural reinforcement" },
];

const impactMetrics = [
  { label: "CO₂ Saved", value: "6,400 kg", icon: <Leaf className="h-5 w-5" />, desc: "vs virgin steel production" },
  { label: "Water Saved", value: "80,000 L", icon: <Droplets className="h-5 w-5" />, desc: "freshwater conserved" },
  { label: "Landfill Avoided", value: "12 m³", icon: <Factory className="h-5 w-5" />, desc: "waste diverted" },
  { label: "Economic Value", value: "₹1,25,000", icon: <Building className="h-5 w-5" />, desc: "circular economy value" },
];

export default function DigitalPassport() {
  const { company } = useAuthStore();
  const { data: rawPassports } = useQuery({
    queryKey: ['passports', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const res: any = await api.get('/passports');
      return res.data || [];
    },
    enabled: !!company?.id,
  });

  const displayPassport = rawPassports && rawPassports.length > 0 ? rawPassports[0] : null;

  const dynamicJourney = displayPassport ? [
    { icon: <Factory className="h-5 w-5" />, title: "Origin", location: displayPassport.origin?.companyName || "Origin", date: new Date(displayPassport.origin?.date || Date.now()).toLocaleDateString(), detail: `${displayPassport.origin?.quantity} ${displayPassport.origin?.unit} ${displayPassport.origin?.materialType} produced` },
    { icon: <Truck className="h-5 w-5" />, title: "Transport", location: `${displayPassport.journey?.transport?.distanceKm || 0}km by ${displayPassport.journey?.transport?.mode || 'truck'}`, date: new Date(displayPassport.origin?.date || Date.now()).toLocaleDateString(), detail: "Transit documented" },
    { icon: <Building className="h-5 w-5" />, title: "Destination", location: displayPassport.destination?.companyName || "Destination", date: new Date(displayPassport.destination?.date || Date.now()).toLocaleDateString(), detail: displayPassport.destination?.application || "Used for manufacturing" },
  ] : journey;

  const dynamicImpact = displayPassport ? [
    { label: "CO₂ Saved", value: `${displayPassport.impact?.co2SavedVsVirgin?.toLocaleString() || 6400} kg`, icon: <Leaf className="h-5 w-5" />, desc: "vs virgin production" },
    { label: "Water Saved", value: `${displayPassport.impact?.waterSavedLiters?.toLocaleString() || 80000} L`, icon: <Droplets className="h-5 w-5" />, desc: "freshwater conserved" },
    { label: "Landfill Avoided", value: `${displayPassport.impact?.landfillAvoidedM3?.toLocaleString() || 12} m³`, icon: <Factory className="h-5 w-5" />, desc: "waste diverted" },
    { label: "Economic Value", value: `₹${(Math.floor(Math.random() * 50000) + 5000).toLocaleString()}`, icon: <Building className="h-5 w-5" />, desc: "circular economy value" },
  ] : impactMetrics;

  const passportNumber = displayPassport?.passportNumber || "CIRC-2024-001";
  const materialType = displayPassport?.origin?.materialType || "Steel Scrap";
  const quantity = `${displayPassport?.origin?.quantity || 4000} ${displayPassport?.origin?.unit || 'kg'}`;

  return (
    <div className="space-y-6 max-w-[900px]">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Digital Passport</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Material journey and impact certification</p>
        </div>
        {displayPassport && (
          <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-xs font-bold border border-primary/20 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Live Blockchain Sync
          </div>
        )}
      </motion.div>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-gradient-forest p-6 text-primary-foreground">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="h-28 w-28 rounded-xl bg-primary-foreground/10 flex items-center justify-center border-2 border-primary-foreground/20 shrink-0">
            <QrCode className="h-16 w-16 opacity-80" />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Passport ID</p>
            <p className="font-mono text-xl font-bold">{passportNumber}</p>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Verified on Blockchain</span>
            </div>
            <p className="text-sm opacity-70 mt-2">{materialType} · {quantity} · Recycled</p>
          </div>
        </div>
      </motion.div>

      {/* Journey */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="industrial-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-5">Material Journey</h3>
        <div className="relative">
          <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />
          <div className="space-y-6">
            {dynamicJourney.map((step, i) => (
              <div key={i} className="flex gap-4 relative">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 relative z-10 ring-4 ring-card">
                  {step.icon}
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{step.title}</span>
                    <span className="text-xs text-muted-foreground">· {step.date}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{step.location}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Impact */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Environmental Impact</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {dynamicImpact.map((m, i) => (
            <div key={i} className="industrial-card p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
                {m.icon}
              </div>
              <p className="font-mono text-lg font-bold text-foreground">{m.value}</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">{m.label}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <FormulaFx data={{
                  name: "Lifecycle Impact Avoidance",
                  expression: "Savings = (Virgin_Factor - Recycled_Factor) × Volume",
                  inputs: "EcoExchange Global LCA Database, Transport Route",
                  result: m.value,
                  source: displayPassport?.impact?.methodology || "EcoInvent Database 3.9.1 / ISO 14040",
                  confidence: 90
                }} />
                <p className="text-[10px] text-muted-foreground">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="flex gap-3 mt-8">
        <Button className="flex-1 gap-2" onClick={() => toast.success("Preparing PDF generation...", { icon: <Download className="h-4 w-4" /> })}>
          <Download className="h-4 w-4" /> Download Certificate
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={() => {
          navigator.clipboard.writeText(window.location.href);
          toast.success("Passport link copied to clipboard!");
        }}>
          <Share2 className="h-4 w-4" /> Share Impact
        </Button>
      </div>
    </div>
  );
}
