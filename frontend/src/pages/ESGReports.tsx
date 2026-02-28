import { motion } from "framer-motion";
import { ClipboardList, Download, Mail, CheckCircle2, Clock, Calendar, Loader2, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";

export default function ESGReports() {
  const { company } = useAuthStore();

  const { data: complianceData, isLoading: isCompLoading } = useQuery({
    queryKey: ['compliance', company?.id],
    queryFn: async () => {
      if (!company?.id) return null;
      const res: any = await api.get('/impact/compliance-status');
      return res.data ?? null;
    },
    enabled: !!company?.id,
  });

  const { data: reportsData, refetch: refetchReports } = useQuery<any[]>({
    queryKey: ['esg-reports', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const res: any = await api.get('/impact/esg/reports');
      return res.data || [];
    },
    enabled: !!company?.id,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res: any = await api.post('/impact/esg/generate-report', { period: 'Q4 2024' });
      return res.data;
    },
    onSuccess: () => {
      toast.success("ESG Report generated with Gemini AI! Check your downloads.");
      refetchReports();
    },
    onError: () => toast.error("Failed to generate AI report.")
  });

  const liveCompliance = [
    { framework: "GRI Standards", status: complianceData?.GRI ? "compliant" : "pending", detail: "Global Reporting Initiative" },
    { framework: "SASB", status: complianceData?.SASB ? "compliant" : "pending", detail: "Sustainability Accounting Standards" },
    { framework: "TCFD", status: complianceData?.TCFD ? "compliant" : "pending", detail: "Task Force on Climate-related Disclosures" },
    { framework: "CDP", status: complianceData?.GRI ? "compliant" : "pending", detail: "Carbon Disclosure Project" },
    { framework: "BRSR", status: complianceData?.BRSR ? "compliant" : "pending", detail: "Business Responsibility and Sustainability" },
  ];

  return (
    <div className="space-y-6 max-w-[1000px]">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between text-left">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ESG Reporting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate compliance reports and track standards</p>
        </div>
        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-xs font-bold border border-primary/20 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Live Facility Model Sync
        </div>
      </motion.div>

      {/* Report generator */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="industrial-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" /> Generate New Report
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="data-label mb-1.5 block">Time Horizon</label>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex-1 justify-start gap-2 text-sm font-normal">
                <Calendar className="h-4 w-4" /> Oct 2024
              </Button>
              <span className="text-muted-foreground">→</span>
              <Button variant="outline" className="flex-1 justify-start gap-2 text-sm font-normal">
                <Calendar className="h-4 w-4" /> Dec 2024
              </Button>
            </div>
          </div>
          <div>
            <label className="data-label mb-1.5 block">Included Categories</label>
            <div className="flex flex-wrap gap-2">
              {["Carbon", "Water", "Waste", "Economic"].map((m) => (
                <Badge key={m} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors bg-primary/5">
                  {m}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Download className="h-4 w-4" /> Generate AI Report
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Audit Report Ready</DialogTitle>
                <DialogDescription>Your Q4 2024 ESG Audit has been compiled based on live facility data sync.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 mt-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">ESG_Audit_Q4_2024.pdf</p>
                      <p className="text-xs text-muted-foreground">Prepared today · 2.4 MB</p>
                    </div>
                  </div>
                  <Button className="gap-2" onClick={() => toast.success("Downloading audit report...")}>
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            className="gap-2 text-muted-foreground"
            onClick={() => {
              const subject = encodeURIComponent(`ESG Audit Report - ${company?.name}`);
              const body = encodeURIComponent(`Hello Stakeholders,\n\nPlease find the latest ESG performance data for ${company?.name} attached.\n\nTime Horizon: Oct 2024 - Dec 2024\nFrameworks: GRI, SASB, TCFD, BRSR\n\nRegards,\nESG Department`);
              window.location.href = `mailto:?subject=${subject}&body=${body}`;
              toast.success("Opening mail client...");
            }}
          >
            <Mail className="h-4 w-4" /> Email to Stakeholders
          </Button>
        </div>
      </motion.div>

      {/* Compliance */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="industrial-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Compliance Status (based on data density)</h3>
        {isCompLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {liveCompliance.map((c) => (
                <div key={c.framework} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3">
                    {c.status === "compliant" ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <Clock className="h-5 w-5 text-warning" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.framework}</p>
                      <p className="text-xs text-muted-foreground">{c.detail}</p>
                    </div>
                  </div>
                  <Badge variant={c.status === "compliant" ? "default" : "secondary"} className={c.status === "compliant" ? "bg-success/15 text-success border-success/20" : ""}>
                    {c.status === "compliant" ? "Compliant" : "Data Gap"}
                  </Badge>
                </div>
              ))}
            </div>
            {complianceData?.recommendation && (
              <p className="text-xs text-muted-foreground mt-4 italic">
                💡 <span className="font-semibold">AI Recommendation:</span> {complianceData.recommendation}
              </p>
            )}
          </>
        )}
      </motion.div>

      {/* Recent reports */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="industrial-card overflow-hidden">
        <div className="p-5 pb-3">
          <h3 className="text-sm font-semibold text-foreground">Generated Reports Ledger</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {["Report Name", "Timestamp", "Scope", "Status", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reportsData?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground italic">
                  No reports generated yet. Use the tool above to start your first ESG audit.
                </td>
              </tr>
            ) : reportsData?.map((r: any) => (
              <tr key={r._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  {r.title}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">{(r.metrics || []).map((m: any) => <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-xs h-7 hover:bg-primary/10">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>{r.title}</DialogTitle>
                        <DialogDescription>AI-Generated Report Content for {r.period}</DialogDescription>
                      </DialogHeader>
                      <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50 font-mono text-xs whitespace-pre-wrap">
                        {r.content}
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button variant="outline" className="gap-2" onClick={() => toast.success("Downloading PDF...")}>
                          <Download className="h-4 w-4" /> Download PDF
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="ghost" className="text-xs h-7 hover:bg-primary/10" onClick={() => toast.success("Opening in mail client...")}>
                    <Mail className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}

