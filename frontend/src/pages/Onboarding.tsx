/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import {
  Building2, Zap, Fuel, Trash2, ArrowRight, ArrowLeft, Check, Plus, X,
  Factory, MapPin, Droplets, Box, AlertTriangle, Scale, ShieldCheck, FileCheck, Loader2
} from "lucide-react";

const STEPS = [
  "Identity", "Location", "Industry", "Energy", "Fuel",
  "Water", "Production", "Waste", "Compliance", "Review"
];

const INDUSTRIES = [
  { id: 'manufacturing', name: 'Manufacturing' },
  { id: 'healthcare', name: 'Healthcare & Pharma' },
  { id: 'steel', name: 'Steel & Metallurgy' },
  { id: 'textile', name: 'Textile & Apparel' },
  { id: 'food_processing', name: 'Food & Beverage' },
  { id: 'chemical', name: 'Chemicals' },
  { id: 'automotive', name: 'Automotive' },
  { id: 'energy', name: 'Energy & Utilities' },
  { id: 'construction', name: 'Construction & Materials' },
  { id: 'electronics', name: 'Electronics' },
];

const GRID_PROVIDERS = ['PSPCL', 'MSEDCL', 'Tata Power', 'Adani', 'BSES', 'CESC', 'Other'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { company, updateCompany } = useAuthStore();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Identity
    tradingName: "",
    registrationNumber: "",
    yearEstablished: "",
    website: "",

    // Step 2: Location
    address: "",
    state: "",
    facilityArea: "",
    operatingDaysPerWeek: "6",
    numberOfShifts: "2",

    // Step 3: Industry
    industry: "",
    subIndustry: "",
    productionCapacity: "",
    totalEmployees: "",

    // Step 4: Energy 
    electricityProvider: "",
    consumerNumber: "",
    monthlyElectricityKwh: "",
    renewablePercentage: "0",

    // Step 5: Fuel
    dieselGenerators: "",
    dieselVehicles: "",
    naturalGasKg: "",
    coalTons: "",

    // Step 6: Water
    waterSource: "",
    monthlyConsumptionKl: "",
    recyclingPercentage: "0",

    // Step 7: Production
    primaryProducts: "",
    monthlyProductionVolume: "",
    productionUnit: "",

    // Step 8: Waste
    wasteStreams: [
      { id: 1, type: "", quantityPerMonth: "", unit: "kg", disposalMethod: "" }
    ],

    // Step 9: Compliance
    iso14001: "none",
    esgReporting: false,
    sustainabilityTargets: "",
  });

  // Load from local storage cache gently
  useEffect(() => {
    const cached = localStorage.getItem('ecoexchange_onboarding_draft');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setFormData(p => ({ ...p, ...parsed }));
      } catch (e) {
        console.warn("Could not parse onboarding draft");
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('ecoexchange_onboarding_draft', JSON.stringify(formData));
  }, [formData]);

  const h = (k: keyof typeof formData, v: any) => setFormData(p => ({ ...p, [k]: v }));

  const addWaste = () => {
    setFormData(p => ({
      ...p,
      wasteStreams: [...p.wasteStreams, { id: Date.now(), type: "", quantityPerMonth: "", unit: "kg", disposalMethod: "" }]
    }));
  };

  const updateWaste = (id: number, field: string, value: string) => {
    setFormData(p => ({
      ...p,
      wasteStreams: p.wasteStreams.map(w => w.id === id ? { ...w, [field]: value } : w)
    }));
  };

  const removeWaste = (id: number) => {
    setFormData(p => ({
      ...p,
      wasteStreams: p.wasteStreams.filter(w => w.id !== id)
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // If store is somehow missing company ID, we can try to find from the decoded token
      let targetId = company?.id;

      if (!targetId) {
        const token = localStorage.getItem('ecoexchange_token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            targetId = payload.companyId || payload.userId || payload.sub;
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (!targetId) {
        toast.error("Session verification failed. Please try logging in again.");
        setIsSubmitting(false);
        navigate('/');
        return;
      }

      // Format payload to match the new robust schema
      // Helper: convert empty strings to undefined so Mongoose enum validators don't choke
      const str = (v: string) => v?.trim() ? v.trim() : undefined;

      // Build payload — only include defined values to avoid Zod enum issues
      const rawPayload: Record<string, any> = {
        tradingName: str(formData.tradingName),
        registrationNumber: str(formData.registrationNumber),
        yearEstablished: parseInt(formData.yearEstablished) || undefined,
        website: str(formData.website),

        location: {
          type: "Point",
          coordinates: [0, 0], // Mapbox geocoding later
          address: str(formData.address),
          state: str(formData.state),
        },
        facilityArea: parseInt(formData.facilityArea) || undefined,
        operatingDaysPerWeek: parseInt(formData.operatingDaysPerWeek) || undefined,
        numberOfShifts: parseInt(formData.numberOfShifts) || undefined,

        industry: formData.industry || 'other',
        subIndustry: str(formData.subIndustry),
        productionCapacity: str(formData.productionCapacity),
        totalEmployees: parseInt(formData.totalEmployees) || undefined,

        consumerNumber: str(formData.consumerNumber),
        renewablePercentage: parseInt(formData.renewablePercentage) || 0,

        fuelConsumption: {
          diesel: {
            generators: parseInt(formData.dieselGenerators) || 0,
            vehicles: parseInt(formData.dieselVehicles) || 0,
          },
          naturalGasKg: parseInt(formData.naturalGasKg) || 0,
          coalTons: parseInt(formData.coalTons) || 0,
        },

        waterUsage: {
          source: formData.waterSource || 'municipal',
          monthlyConsumptionKl: parseInt(formData.monthlyConsumptionKl) || 0,
          recyclingPercentage: parseInt(formData.recyclingPercentage) || 0,
        },

        productionData: {
          primaryProducts: formData.primaryProducts.split(',').map(s => s.trim()).filter(Boolean),
          monthlyProductionVolume: parseInt(formData.monthlyProductionVolume) || undefined,
          productionUnit: str(formData.productionUnit),
        },

        wasteStreams: formData.wasteStreams.filter(w => w.type && w.quantityPerMonth).map(w => ({
          type: w.type,
          quantityPerMonth: parseInt(w.quantityPerMonth) || 0,
          unit: w.unit,
          disposalMethod: w.disposalMethod || 'other'
        })),

        compliance: {
          iso14001: formData.iso14001 || 'none',
          esgReporting: formData.esgReporting,
          sustainabilityTargets: str(formData.sustainabilityTargets)
        },

        onboardingComplete: true,
        onboardingStep: 10,
        verificationStatus: 'in_progress'
      };

      // Only include electricityProvider if user actually selected one (avoids sending empty string to enum validator)
      if (str(formData.electricityProvider)) {
        rawPayload.electricityProvider = str(formData.electricityProvider);
      }

      // Strip undefined values so they don't get serialized as null
      const payload = JSON.parse(JSON.stringify(rawPayload));

      console.log("Submitting payload:", JSON.stringify(payload, null, 2));
      const res: any = await api.put(`/companies/${targetId}`, payload);

      if (res.success) {
        localStorage.removeItem('ecoexchange_onboarding_draft');
        updateCompany({ onboardingComplete: true });

        setIsGeneratingPredictions(true);
        toast.info("Generating intelligent predictions...");

        // Trigger mathematical engine & ai suggestions
        try {
          await api.post(`/predictions/${targetId}/generate`);
          // The generation takes a second, then trigger suggestions
          await api.post(`/suggestions/${targetId}/generate`);
        } catch (predErr) {
          console.error("Prediction engine error:", predErr);
        }

        toast.success("Ready! Welcome to your dashboard.");
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error("Company update error:", error);
      if (error?.details) console.error("Validation details:", JSON.stringify(error.details, null, 2));
      // Surface the exact Zod validation details if available
      if (error?.details && Array.isArray(error.details)) {
        const fieldErrors = error.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
        toast.error(`Validation failed — ${fieldErrors}`);
      } else {
        toast.error(error.message || error.error || "Failed to save profile");
      }
    } finally {
      setIsSubmitting(false);
      setIsGeneratingPredictions(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card px-4 sm:px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Factory className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-foreground block leading-tight">Setup Facility</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{company?.name}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-primary block">{Math.round(progress)}% Complete</span>
            <span className="text-xs text-muted-foreground font-mono">Step {step + 1} of {STEPS.length}</span>
          </div>
        </div>
      </header>

      <div className="bg-card border-b px-4 sm:px-6 py-2">
        <div className="max-w-4xl mx-auto">
          <Progress value={progress} className="h-1.5" />
          <div className="flex justify-between mt-2 pt-1 overflow-x-auto hide-scrollbar">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center min-w-[60px]">
                <div className={`h-2 w-2 rounded-full mb-1 transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
                <span className={`text-[9px] uppercase tracking-wider font-semibold whitespace-nowrap ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 py-8 pb-32">
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">

            {/* 1: IDENTITY */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><Building2 className="text-primary" /> Basic Identity</h2>
                  <p className="text-sm text-muted-foreground mt-1">Official registration details for verification</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium">Trading/Brand Name</Label>
                    <Input value={formData.tradingName} onChange={(e) => h('tradingName', e.target.value)} placeholder="e.g. Tata Steel Jamshedpur" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Registration Number (CIN/GST/MSME)</Label>
                    <Input value={formData.registrationNumber} onChange={(e) => h('registrationNumber', e.target.value)} className="mt-1 font-mono text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Year Established</Label>
                      <Input value={formData.yearEstablished} onChange={(e) => h('yearEstablished', e.target.value)} type="number" placeholder="2005" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Website</Label>
                      <Input value={formData.website} onChange={(e) => h('website', e.target.value)} type="url" placeholder="https://" className="mt-1" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2: LOCATION */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><MapPin className="text-primary" /> Location & Scale</h2>
                  <p className="text-sm text-muted-foreground mt-1">Physical footprint of primary operations</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label className="text-xs font-medium">Facility Address</Label>
                      <Input value={formData.address} onChange={(e) => h('address', e.target.value)} placeholder="Plot No, Industrial Area" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">State / Region</Label>
                      <Select value={formData.state} onValueChange={(v) => h('state', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {["Maharashtra", "Gujarat", "Tamil Nadu", "Karnataka", "UP", "Punjab", "Haryana", "Other"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Facility Built-up Area (sq meters)</Label>
                      <Input value={formData.facilityArea} onChange={(e) => h('facilityArea', e.target.value)} type="number" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Operating Days/Week</Label>
                      <Select value={formData.operatingDaysPerWeek} onValueChange={(v) => h('operatingDaysPerWeek', v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[5, 6, 7].map(n => <SelectItem key={n} value={n.toString()}>{n} Days</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Shifts/Day</Label>
                      <Select value={formData.numberOfShifts} onValueChange={(v) => h('numberOfShifts', v)}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3].map(n => <SelectItem key={n} value={n.toString()}>{n} Shifts</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3: INDUSTRY */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><Factory className="text-primary" /> Industry & Capacity</h2>
                  <p className="text-sm text-muted-foreground mt-1">Classification for benchmarking and matching</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium">Primary Industry</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {INDUSTRIES.map(i => (
                        <button
                          key={i.id}
                          onClick={() => h('industry', i.id)}
                          className={`p-3 text-left border rounded-lg text-sm font-medium transition-all ${formData.industry === i.id ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/50 text-muted-foreground'}`}
                        >
                          {i.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Sub-Industry / Niche</Label>
                    <Input value={formData.subIndustry} onChange={(e) => h('subIndustry', e.target.value)} placeholder="e.g. Cotton Spinning" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Total Employees</Label>
                      <Input value={formData.totalEmployees} onChange={(e) => h('totalEmployees', e.target.value)} type="number" placeholder="Includes contract" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Annual Production Capacity</Label>
                      <Input value={formData.productionCapacity} onChange={(e) => h('productionCapacity', e.target.value)} placeholder="100,000 tons" className="mt-1" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4: ENERGY */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><Zap className="text-primary" /> Electricity Profile</h2>
                  <p className="text-sm text-muted-foreground mt-1">Scope 2 emissions data</p>
                </div>
                <div className="space-y-4">
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-col items-center text-center space-y-2 mb-6">
                    <Zap className="h-8 w-8 text-primary" />
                    <h3 className="font-semibold text-primary-foreground">Monthly Electricity Consumption</h3>
                    <div className="flex items-end gap-2 text-primary">
                      <Input value={formData.monthlyElectricityKwh} onChange={(e) => h('monthlyElectricityKwh', e.target.value)} type="number" className="w-32 text-center text-2xl font-bold h-12 bg-background" placeholder="0" />
                      <span className="mb-2 font-medium">kWh / month</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Grid Utility Provider</Label>
                      <Select value={formData.electricityProvider} onValueChange={(v) => h('electricityProvider', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {GRID_PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Consumer Number (Optional)</Label>
                      <Input value={formData.consumerNumber} onChange={(e) => h('consumerNumber', e.target.value)} className="mt-1 font-mono text-sm" placeholder="For auto-fetch" />
                    </div>
                    <div className="col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <Label className="text-xs font-medium">Existing Renewable/Solar Percentage</Label>
                        <span className="text-xs font-bold font-mono">{formData.renewablePercentage}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={formData.renewablePercentage} onChange={(e) => h('renewablePercentage', e.target.value)} className="w-full accent-primary mt-2" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5: FUEL */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><Fuel className="text-primary" /> Fuel Consumption</h2>
                  <p className="text-sm text-muted-foreground mt-1">Scope 1 direct stationary & mobile emissions tracking</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="industrial-card p-4 space-y-3 col-span-2 sm:col-span-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Fuel className="h-3 w-3" /> Diesel</Label>
                      <div>
                        <Label className="text-[10px]">Generators (Liters/mo)</Label>
                        <Input value={formData.dieselGenerators} onChange={(e) => h('dieselGenerators', e.target.value)} type="number" placeholder="500" className="h-9 mt-1" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Vehicles (Liters/mo)</Label>
                        <Input value={formData.dieselVehicles} onChange={(e) => h('dieselVehicles', e.target.value)} type="number" placeholder="1200" className="h-9 mt-1" />
                      </div>
                    </div>
                    <div className="industrial-card p-4 space-y-3 col-span-2 sm:col-span-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Fuel className="h-3 w-3" /> Other Fuels</Label>
                      <div>
                        <Label className="text-[10px]">Natural/Pipeline Gas (kg/mo)</Label>
                        <Input value={formData.naturalGasKg} onChange={(e) => h('naturalGasKg', e.target.value)} type="number" placeholder="0" className="h-9 mt-1" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Coal (Tons/mo)</Label>
                        <Input value={formData.coalTons} onChange={(e) => h('coalTons', e.target.value)} type="number" placeholder="0" className="h-9 mt-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6: WATER */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><Droplets className="text-primary" /> Water Usage</h2>
                  <p className="text-sm text-muted-foreground mt-1">Water sustainability and recycling</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium">Primary Source</Label>
                    <Select value={formData.waterSource} onValueChange={(v) => h('waterSource', v)}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="municipal">Municipal / City</SelectItem>
                        <SelectItem value="groundwater">Groundwater / Borewell</SelectItem>
                        <SelectItem value="surface_water">Surface / River / Canal</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Monthly Intake (Kiloliters)</Label>
                    <Input value={formData.monthlyConsumptionKl} onChange={(e) => h('monthlyConsumptionKl', e.target.value)} type="number" className="mt-1" placeholder="1000" />
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-xs font-medium">Current Recycling / Reuse Percentage (ZLD)</Label>
                      <span className="text-xs font-bold font-mono">{formData.recyclingPercentage}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={formData.recyclingPercentage} onChange={(e) => h('recyclingPercentage', e.target.value)} className="w-full accent-primary mt-2" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 7: PRODUCTION */}
            {step === 6 && (
              <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><Box className="text-primary" /> Production Data</h2>
                  <p className="text-sm text-muted-foreground mt-1">Required for carbon intensity / per-unit benchmarking</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium">Primary Manufactured Products (comma separated)</Label>
                    <Input value={formData.primaryProducts} onChange={(e) => h('primaryProducts', e.target.value)} placeholder="Cotton yarn, polyester blends" className="mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Monthly Output Volume</Label>
                      <Input value={formData.monthlyProductionVolume} onChange={(e) => h('monthlyProductionVolume', e.target.value)} type="number" placeholder="500" className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Unit of Measurement</Label>
                      <Select value={formData.productionUnit} onValueChange={(v) => h('productionUnit', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tons">Tons</SelectItem>
                          <SelectItem value="pieces">Pieces / Units</SelectItem>
                          <SelectItem value="meters">Meters</SelectItem>
                          <SelectItem value="liters">Liters</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-3 text-amber-500/80">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <p className="text-xs leading-relaxed">Providing production volume enables the engine to calculate your <strong>Carbon Intensity (kg CO2 per unit)</strong>, which is crucial for identifying process optimization opportunities rather than just gross reductions.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 8: WASTE */}
            {step === 7 && (
              <motion.div key="s7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><Trash2 className="text-primary" /> Waste Profiles</h2>
                  <p className="text-sm text-muted-foreground mt-1">Add material streams for circular marketplace exchange AI matching</p>
                </div>

                <div className="space-y-4">
                  {formData.wasteStreams.map((ws, idx) => (
                    <div key={ws.id} className="industrial-card p-4 space-y-3 relative group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stream {idx + 1}</span>
                        {formData.wasteStreams.length > 1 && (
                          <button onClick={() => removeWaste(ws.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                          <Label className="text-[10px]">Material Type</Label>
                          <Select value={ws.type} onValueChange={(v) => updateWaste(ws.id, "type", v)}>
                            <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              {['metal_scrap', 'plastic', 'paper', 'wood', 'glass', 'textile', 'organic', 'e_waste', 'construction', 'chemical', 'mixed'].map(t => (
                                <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 sm:col-span-1 flex gap-2">
                          <div className="flex-1">
                            <Label className="text-[10px]">Monthly Qty</Label>
                            <Input value={ws.quantityPerMonth} onChange={(e) => updateWaste(ws.id, "quantityPerMonth", e.target.value)} type="number" className="mt-1 h-9 text-xs font-mono" placeholder="0" />
                          </div>
                          <div className="w-16">
                            <Label className="text-[10px]">Unit</Label>
                            <Select value={ws.unit} onValueChange={(v) => updateWaste(ws.id, "unit", v)}>
                              <SelectTrigger className="mt-1 h-9 text-xs px-2"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="ton">ton</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px]">Current Disposal</Label>
                          <Select value={ws.disposalMethod} onValueChange={(v) => updateWaste(ws.id, "disposalMethod", v)}>
                            <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Current destination" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="landfill">Landfill / Dumped</SelectItem>
                              <SelectItem value="recycling">Recycled</SelectItem>
                              <SelectItem value="sold">Sold to Scrapper</SelectItem>
                              <SelectItem value="incineration">Incinerated / Burned</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addWaste} className="w-full gap-2 border-dashed h-10 text-xs">
                    <Plus className="h-4 w-4" /> Add Material Stream
                  </Button>
                </div>
              </motion.div>
            )}

            {/* 9: COMPLIANCE */}
            {step === 8 && (
              <motion.div key="s8" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><ShieldCheck className="text-primary" /> Compliance & ESG</h2>
                  <p className="text-sm text-muted-foreground mt-1">Regulatory frameworks and targets</p>
                </div>
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 industrial-card">
                    <div className="space-y-0.5">
                      <Label className="text-sm">ISO 14001 Certification</Label>
                      <p className="text-xs text-muted-foreground">Certified Environmental Management</p>
                    </div>
                    <Select value={formData.iso14001} onValueChange={(v) => h('iso14001', v)}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="planned">Planned (1 yr)</SelectItem>
                        <SelectItem value="certified">Certified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 industrial-card">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Active ESG Reporting</Label>
                      <p className="text-xs text-muted-foreground">E.g., BRSR, GRI, SASB frameworks</p>
                    </div>
                    <Switch checked={formData.esgReporting} onCheckedChange={(v) => h('esgReporting', v)} />
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Key Sustainability Targets (if any)</Label>
                    <textarea
                      value={formData.sustainabilityTargets}
                      onChange={(e) => h('sustainabilityTargets', e.target.value)}
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                      placeholder="e.g. Net zero by 2040, 50% renewable energy by 2025..."
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 10: REVIEW & SUBMIT */}
            {step === 9 && (
              <motion.div key="s9" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileCheck className="text-primary" /> Review & Initialize Engine</h2>
                  <p className="text-sm text-muted-foreground mt-1">Data verification before generating intelligent predictions</p>
                </div>

                <div className="space-y-4">
                  <div className="industrial-card p-4 space-y-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Identity & Location</span>
                      <button onClick={() => setStep(0)} className="text-xs text-primary hover:underline font-medium">Edit</button>
                    </div>
                    <p className="text-sm font-medium">{formData.tradingName || 'Unnamed Facility'}</p>
                    <p className="text-xs text-muted-foreground">{formData.address}, {formData.state}</p>
                    <p className="text-xs text-muted-foreground">{formData.industry} • {formData.totalEmployees || 0} employees</p>
                  </div>

                  <div className="industrial-card p-4 space-y-1 bg-primary/5 border-primary/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">Key Operational Math Inputs</span>
                      <button onClick={() => setStep(3)} className="text-xs text-primary hover:underline font-medium">Edit</button>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 mt-2">
                      <div><span className="text-[10px] text-muted-foreground block">Monthly Power</span><span className="font-mono text-sm font-semibold">{formData.monthlyElectricityKwh || 0} kWh</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Renewable Base</span><span className="font-mono text-sm font-semibold">{formData.renewablePercentage}%</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Diesel Usage</span><span className="font-mono text-sm font-semibold">{(parseInt(formData.dieselGenerators) || 0) + (parseInt(formData.dieselVehicles) || 0)} L/mo</span></div>
                      <div><span className="text-[10px] text-muted-foreground block">Coal Usage</span><span className="font-mono text-sm font-semibold">{formData.coalTons || 0} T/mo</span></div>
                    </div>
                  </div>

                  <div className="industrial-card p-4 space-y-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider">Circular Economy Config</span>
                      <button onClick={() => setStep(7)} className="text-xs text-primary hover:underline font-medium">Edit</button>
                    </div>
                    <p className="text-sm font-medium">{formData.wasteStreams.filter(w => w.type && w.quantityPerMonth).length} Waste Streams Defined</p>
                    <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar">
                      {formData.wasteStreams.filter(w => w.type && w.quantityPerMonth).map(w => (
                        <span key={w.id} className="text-[10px] bg-muted px-2 py-1 rounded-md font-mono whitespace-nowrap">{w.type}: {w.quantityPerMonth}{w.unit}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      <div className="border-t bg-card px-4 sm:px-6 py-4 fixed bottom-0 left-0 right-0 z-10 w-full shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || isSubmitting || isGeneratingPredictions}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} className="gap-2 w-32 bg-primary hover:bg-primary/90">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isGeneratingPredictions}
              className="gap-2 w-48 bg-primary hover:bg-primary/90 h-10 shadow-lg shadow-primary/20"
            >
              {(isSubmitting || isGeneratingPredictions) ? (
                <><Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> {isGeneratingPredictions ? 'Initializing...' : 'Saving...'}</>
              ) : (
                <><Scale className="h-4 w-4" /> Complete Setup</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
