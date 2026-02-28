import { motion } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Leaf, BarChart3, Recycle, Zap, Cpu, Shield, Globe, Activity, Layers, Boxes, Repeat, Lock, Copy, RefreshCw, Key } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/clerk-react";
import EtherealBeamsHero from "@/components/ui/ethereal-beams-hero";

export default function LandingPage() {
    const { isSignedIn } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="min-h-screen bg-[#050B0B] text-white selection:bg-teal-500/30 selection:text-white overflow-x-hidden font-sans">
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-[100] border-b border-white/5 bg-[#050B0B]/60 backdrop-blur-xl">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                            <Leaf className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight uppercase">EcoEx</span>
                    </div>
                    <div className="hidden md:flex items-center gap-12 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                        <a href="#features" className="hover:text-teal-400 transition-all duration-300">Architecture</a>
                        <a href="#impact" className="hover:text-teal-400 transition-all duration-300">Impact</a>
                        <a href="#developer-api" className="hover:text-teal-400 transition-all duration-300">API</a>
                    </div>
                    <div className="flex items-center gap-6">
                        {isSignedIn ? (
                            <Button asChild className="rounded-full bg-white text-black hover:bg-teal-400 hover:text-black transition-all font-bold px-8">
                                <Link to="/dashboard">DASHBOARD</Link>
                            </Button>
                        ) : (
                            <>
                                <Link to="/login" className="text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors">Sign In</Link>
                                <Button asChild className="rounded-full bg-white text-black hover:bg-teal-400 hover:text-black transition-all font-bold px-8">
                                    <Link to="/sign-up">ENTER SYSTEM</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <EtherealBeamsHero />

            {/* Capabilities Reveal Section */}
            <section id="features" className="py-24 relative z-10">
                <div className="container mx-auto px-6 relative">
                    <div className="max-w-4xl mb-24">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6"
                        >
                            <span className="h-[1px] w-8 bg-teal-400" /> SYSTEM ARCHITECTURE
                        </motion.div>
                        <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] uppercase">
                            ARCHITECTING <br />
                            <span className="text-white/20 italic">CIRCULARITY</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Large Interactive card */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="md:col-span-8 glass-card rounded-[2rem] p-8 md:p-12 overflow-hidden relative group min-h-[500px] flex flex-col justify-between industrial-border"
                        >
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-700 group-hover:scale-110">
                                <Globe className="h-64 w-64 text-teal-400" />
                            </div>
                            <div className="relative z-10">
                                <div className="h-14 w-14 rounded-xl bg-teal-500/10 flex items-center justify-center mb-8 border border-teal-500/20">
                                    <Activity className="h-7 w-7 text-teal-400" />
                                </div>
                                <h3 className="text-3xl md:text-4xl font-black mb-6 uppercase tracking-tight">GLOBAL DATA <br /> ORCHESTRATION</h3>
                                <p className="text-base md:text-lg text-white/40 max-w-xl leading-relaxed font-medium">
                                    Aggregate disparate industrial data streams into a single, cohesive intelligence layer. Real-time monitoring across multi-site operations with sub-metric accuracy.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3 relative z-10">
                                {["Scope 1,2,3", "ISO 14064", "Real-time sync"].map(tag => (
                                    <div key={tag} className="px-5 py-2 rounded-full border border-white/5 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">{tag}</div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Side card 1 */}
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="md:col-span-4 glass-card rounded-[2rem] p-8 flex flex-col justify-between glass-card-hover industrial-border group"
                        >
                            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                <Layers className="h-6 w-6 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black mb-4 uppercase tracking-tight">PREDICTIVE <br /> ENVIRONMENT</h3>
                                <p className="text-white/40 leading-relaxed text-sm font-medium">
                                    Leverage machine learning to forecast environmental liabilities before they materialize on the balance sheet.
                                </p>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Module 01</span>
                                <Link to={isSignedIn ? "/predictions" : "/login"}>
                                    <ArrowRight className="h-6 w-6 text-teal-400 group-hover:translate-x-2 transition-transform" />
                                </Link>
                            </div>
                        </motion.div>

                        {/* Bottom card 1 */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="md:col-span-4 glass-card rounded-[2rem] p-8 flex flex-col justify-between glass-card-hover industrial-border group"
                        >
                            <div className="h-12 w-12 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                                <Boxes className="h-6 w-6 text-teal-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black mb-4 uppercase tracking-tight">MATERIAL <br /> TOKENIZATION</h3>
                                <p className="text-white/40 leading-relaxed text-sm font-medium">
                                    Tokenize industrial side-streams. Every kg of waste recorded as a tradeable asset in your digital inventory.
                                </p>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Module 02</span>
                                <Link to={isSignedIn ? "/impact" : "/login"}>
                                    <ArrowRight className="h-6 w-6 text-white/40 group-hover:translate-x-2 transition-transform" />
                                </Link>
                            </div>
                        </motion.div>

                        {/* Bottom card 2 (Wide) */}
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="md:col-span-8 glass-card rounded-[2rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-12 group glass-card-hover industrial-border relative"
                        >
                            <div className="flex-1">
                                <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center mb-8 border border-white/10">
                                    <Repeat className="h-6 w-6 text-white/60" />
                                </div>
                                <h3 className="text-2xl md:text-3xl font-black mb-6 uppercase tracking-tight">AUTONOMOUS <br /> MATCHING ENGINE</h3>
                                <p className="text-white/40 leading-relaxed text-base font-medium">
                                    Our proprietary matching engine connects your waste output to external demand chains with zero manual intervention.
                                </p>
                            </div>
                            <div className="w-full md:w-40 aspect-square rounded-full border border-teal-500/10 flex items-center justify-center p-4 relative group-hover:border-teal-500/30 transition-colors">
                                <div className="absolute inset-2 border border-teal-500/5 rounded-full animate-[pulse_4s_infinite]" />
                                <Zap className="h-10 w-10 text-teal-400 blur-[1px] group-hover:blur-0 transition-all" />
                            </div>
                            <Link to={isSignedIn ? "/marketplace" : "/login"} className="absolute bottom-10 right-10">
                                <ArrowRight className="h-6 w-6 text-white/20 group-hover:text-teal-400 transition-colors" />
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Metrics Section */}
            <section id="impact" className="py-24 bg-[#050B0B]/50 relative border-t border-white/5">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="inline-flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6"
                            >
                                <span className="h-[1px] w-8 bg-teal-400" /> SYSTEM IMPACT
                            </motion.div>
                            <h2 className="text-5xl md:text-7xl font-black mb-8 leading-[0.9] uppercase tracking-tight">
                                QUANTIFIED <br />
                                <span className="text-white/20 italic">PERFORMANCE</span>
                            </h2>
                            <p className="text-lg text-white/40 mb-12 max-w-sm font-medium">
                                Precision metrics across our global industrial network. We don't just track data; we engineer outcomes.
                            </p>
                            <Button asChild size="lg" variant="outline" className="rounded-full border-white/10 text-white hover:bg-white hover:text-black font-black text-[10px] tracking-widest uppercase h-14 px-8 bg-transparent transition-all">
                                <Link to={isSignedIn ? "/impact-dashboard" : "/login"}>LIVE MONITORING TERMINAL</Link>
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:gap-6 perspective-1000">
                            {[
                                { label: "CO₂ Averted", value: "1.2M", desc: "Tonnes redirected" },
                                { label: "Circularity", value: "84%", desc: "Avg. efficiency" },
                                { label: "Econ. Value", value: "$4.5B", desc: "Capital optimized" },
                                { label: "Net. Nodes", value: "2.4K", desc: "Active sites" }
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, rotateX: 20 }}
                                    whileInView={{ opacity: 1, rotateX: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group industrial-border"
                                >
                                    <div className="text-4xl font-black text-white mb-2 tracking-tighter group-hover:text-teal-400 transition-colors">{stat.value}</div>
                                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">{stat.label}</div>
                                    <div className="text-white/10 text-[8px] font-bold uppercase tracking-tighter">{stat.desc}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Ecosystem Section */}
            <section id="ecosystem" className="py-40 relative border-t border-white/5">
                <div className="container mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-3xl mx-auto mb-24"
                    >
                        <h2 className="text-5xl md:text-7xl font-black mb-8 uppercase tracking-tight leading-[0.9]">THE INDUSTRIAL <br /><span className="text-white/10 italic">FRACTION</span></h2>
                    </motion.div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto opacity-10">
                        {["STEEL", "MANUFACTURING", "LOGISTICS", "ENERGY", "MINING", "PHARMA", "CHEMICAL", "AUTOMOTIVE"].map((name, i) => (
                            <motion.div
                                key={name}
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ delay: i * 0.05 }}
                                viewport={{ once: true }}
                                className="text-[10px] font-black tracking-[0.5em] italic hover:opacity-100 transition-opacity cursor-default py-8 border border-white/10 rounded-xl"
                            >
                                {name}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Developer API Section */}
            <section id="developer-api" className="py-32 relative border-t border-white/5 overflow-hidden">
                <div className="container mx-auto px-6 max-w-[1400px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center bg-[#070b0c] border border-white/5 rounded-[2rem] p-10 md:p-14 relative group industrial-border shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all duration-700 pointer-events-none">
                            <Cpu className="h-48 w-48 text-teal-400" />
                        </div>
                        <div className="relative z-10 md:pr-10">
                            <div className="inline-flex items-center gap-2 text-teal-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                                <span className="h-[1px] w-6 bg-teal-400" /> API CONNECTIVITY
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tight">
                                PROGRAMMATIC <br /> <span className="text-white/20 italic">INTEGRATION</span>
                            </h2>
                            <p className="text-sm md:text-base text-white/40 mb-10 font-medium leading-relaxed">
                                Generate your cryptographic API key to securely connect enterprise ERPs with our autonomous matching engine.
                            </p>
                            <Button size="lg" className="rounded-full bg-white text-black hover:bg-teal-400 hover:text-black font-black text-[10px] tracking-widest uppercase h-12 px-8 transition-colors">
                                VIEW DOCUMENTATION
                            </Button>
                        </div>

                        {/* API Key Generator Card */}
                        <div className="relative z-10">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                className="bg-[#030607]/80 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden group/key w-full max-w-md ml-auto"
                            >
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500/0 via-teal-400/50 to-teal-500/0 opacity-0 group-hover/key:opacity-100 transition-opacity duration-1000" />

                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-teal-400 animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                                        <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">Environment: Live</span>
                                    </div>
                                    <Lock className="h-4 w-4 text-white/20" />
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2 relative">
                                        <label className="text-[9px] text-teal-400 font-black uppercase tracking-widest flex items-center gap-2">
                                            <Key className="h-3 w-3" /> Root Access Token
                                        </label>
                                        <div className="flex items-center justify-between bg-black/80 border border-white/10 rounded-xl p-4 font-mono text-xs text-white/80 group-hover/key:text-teal-400 transition-colors shadow-inner overflow-hidden relative">
                                            <div className="absolute inset-0 bg-teal-400/5 translate-x-[-100%] group-hover/key:translate-x-[100%] transition-transform duration-1000" />
                                            <span className="relative z-10 tracking-widest">ecx_live_9f8d7a...4h20X</span>
                                            <button className="relative z-10 text-white/30 hover:text-white transition-colors">
                                                <Copy className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <button className="w-full bg-white/[0.03] hover:bg-teal-500/10 border border-white/10 hover:border-teal-500/30 text-white/70 hover:text-teal-400 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2 group/btn">
                                        <RefreshCw className="h-3 w-3 group-hover/btn:rotate-180 transition-transform duration-500" />
                                        Generate New Key
                                    </button>

                                    <div className="pt-2 border-t border-white/5">
                                        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/20">
                                            <span>Rate Limit: 10k/min</span>
                                            <span className="text-emerald-400/50 flex items-center gap-1"><Shield className="h-2 w-2" /> AES-256</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-white/5 bg-[#050B0B]">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
                                <Leaf className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-base font-black tracking-widest uppercase">EcoEx</span>
                        </div>
                        <div className="flex gap-8 md:gap-12 text-[9px] font-black uppercase tracking-widest text-white/30">
                            <a href="#" className="hover:text-white transition-colors">Terminals</a>
                            <a href="#" className="hover:text-white transition-colors">Nodes</a>
                            <a href="#" className="hover:text-white transition-colors">Compliance</a>
                            <a href="#" className="hover:text-white transition-colors">Security</a>
                        </div>
                        <div className="text-[9px] font-black text-white/10 uppercase tracking-[0.3em]">
                            © 2026 INDUSTRIAL PROTOCOL
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
