import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Info, Calculator, Database, ShieldCheck } from "lucide-react";
import { useState } from "react";

export interface FormulaData {
    name: string;
    expression: string;
    inputs: string;
    result: string;
    source: string;
    confidence: number;
}

export function FormulaFx({ data, className = "" }: { data?: FormulaData; className?: string }) {
    const [open, setOpen] = useState(false);

    if (!data) return null;

    return (
        <TooltipProvider delayDuration={200}>
            <Dialog open={open} onOpenChange={setOpen}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <button
                                className={`inline-flex items-center justify-center p-1 rounded-md text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors ${className}`}
                                aria-label="View Calculation Formula"
                            >
                                <div className="flex items-center gap-0.5 px-1 bg-muted/50 rounded text-[9px] font-mono font-bold uppercase tracking-wider border border-border/50 shadow-sm cursor-pointer hover:border-primary/50">
                                    <span className="italic">f</span>(x)
                                </div>
                            </button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="text-xs bg-card border-border shadow-xl p-3 max-w-xs z-50">
                        <div className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><Calculator className="h-3 w-3 text-primary" /> {data.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground bg-muted p-1.5 rounded">{data.expression}</div>
                        <div className="mt-1.5 flex justify-between items-center text-[10px]">
                            <span className="text-muted-foreground">Click to view full calculation</span>
                            <span className="text-primary font-semibold">{data.confidence}% Conf.</span>
                        </div>
                    </TooltipContent>
                </Tooltip>

                <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <Calculator className="h-5 w-5" />
                            Calculation Methodology
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Fully transparent audit trail for compliance verification.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Metric</span>
                            <p className="text-sm font-semibold text-foreground">{data.name}</p>
                        </div>

                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Mathematical Expression</span>
                            <div className="bg-muted/50 font-mono text-xs p-3 rounded-lg border border-border/50 text-foreground overflow-x-auto">
                                {data.expression}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Input Values</span>
                                <p className="text-xs font-mono bg-primary/5 text-primary-foreground/90 p-2 rounded border border-primary/20">{data.inputs}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Computed Result</span>
                                <p className="text-xs font-mono bg-success/10 text-success p-2 rounded border border-success/20 font-bold">{data.result}</p>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1"><Database className="h-3 w-3" /> Factor Source</span>
                                <p className="text-xs text-muted-foreground">{data.source}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Data Confidence</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: `${data.confidence}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-foreground">{data.confidence}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}
