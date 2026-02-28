import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, User, Building, Settings as SettingsIcon, Shield, Bell, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Settings() {
    const { company, updateCompany } = useAuthStore();
    const [formData, setFormData] = useState({
        name: "",
        tradingName: "",
        industry: "",
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (company) {
            setFormData({
                name: company.name || "",
                tradingName: company.tradingName || "",
                industry: company.industry || "",
            });
        }
    }, [company]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            if (company?.id) {
                // Filter out empty industry or other empty strings if they don't match the schema
                const submissionData = { ...formData };
                if (!submissionData.industry) {
                    delete (submissionData as any).industry;
                }

                await api.put(`/companies/${company.id}`, submissionData);
                // Update local auth store so header reflects changes immediately
                updateCompany(submissionData);
                toast.success("Settings saved successfully.");
            }
        } catch (error: any) {
            console.error("Save error:", error);
            const errorMsg = error.details?.[0]?.message || error.error || "Failed to save settings.";
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-[1000px]">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage your facility profile and preferences</p>
            </motion.div>

            <Tabs defaultValue="company" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="company" className="gap-2"><Building className="h-4 w-4" /> Company Profile</TabsTrigger>
                    <TabsTrigger value="account" className="gap-2"><User className="h-4 w-4" /> Account</TabsTrigger>
                    <TabsTrigger value="preferences" className="gap-2"><SettingsIcon className="h-4 w-4" /> Preferences</TabsTrigger>
                    <TabsTrigger value="api" className="gap-2"><Key className="h-4 w-4" /> API Access</TabsTrigger>
                </TabsList>

                <TabsContent value="company">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="industrial-card p-6 space-y-6">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Facility Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="data-label mb-1.5 block">Legal Entity Name</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Tata Steel Ltd."
                                />
                            </div>
                            <div>
                                <label className="data-label mb-1.5 block">Trading / Facility Name (Optional)</label>
                                <Input
                                    value={formData.tradingName}
                                    onChange={(e) => setFormData({ ...formData, tradingName: e.target.value })}
                                    placeholder="e.g. Jamshedpur Plant"
                                />
                            </div>
                            <div>
                                <label className="data-label mb-1.5 block">Primary Industry</label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={formData.industry}
                                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                >
                                    <option value="">Select Industry</option>
                                    <option value="manufacturing">Manufacturing</option>
                                    <option value="steel">Steel & Metallurgy</option>
                                    <option value="textile">Textile & Apparel</option>
                                    <option value="food_processing">Food & Beverage</option>
                                    <option value="chemical">Chemicals</option>
                                    <option value="construction">Construction & Materials</option>
                                    <option value="automotive">Automotive</option>
                                    <option value="healthcare">Healthcare</option>
                                    <option value="pharmaceutical">Pharmaceutical</option>
                                    <option value="electronics">Electronics</option>
                                    <option value="energy">Energy & Utilities</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-border flex justify-end">
                            <Button onClick={handleSave} disabled={isLoading} className="gap-2">
                                <Save className="h-4 w-4" /> {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </motion.div>
                </TabsContent>

                <TabsContent value="account">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="industrial-card p-6 space-y-6">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Account Security</h3>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm text-foreground flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-primary" /> Single Sign-On (SSO)
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Managed securely by Clerk authentication.</p>
                                </div>
                                <Button variant="outline" size="sm">Manage Auth</Button>
                            </div>
                        </div>
                    </motion.div>
                </TabsContent>

                <TabsContent value="preferences">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="industrial-card p-6 space-y-6">
                        <h3 className="text-sm font-semibold text-foreground mb-4">System Preferences</h3>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm text-foreground flex items-center gap-2">
                                        <Bell className="h-4 w-4 text-warning" /> Match Notifications
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Receive email alerts when high-confidence matches are found.</p>
                                </div>
                                <Button variant="outline" size="sm">Enabled</Button>
                            </div>
                        </div>
                    </motion.div>
                </TabsContent>

                <TabsContent value="api">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="industrial-card p-6 space-y-6">
                        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Key className="h-4 w-4 text-primary" /> Live External Connectivity
                        </h3>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">EcoExchange offers programmatic access to your facility data, impact reports, and marketplace listings via REST API.</p>

                            <div className="p-4 rounded-lg bg-black text-green-400 font-mono text-xs overflow-x-auto border border-white/10">
                                curl -X GET "https://api.ecoex.com/v1/passports" \<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-H "Authorization: Bearer sk_live_..."
                            </div>

                            <div className="pt-2">
                                <Button variant="default" className="gap-2"><Key className="h-4 w-4" /> Generate New API Key</Button>
                            </div>
                        </div>
                    </motion.div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
