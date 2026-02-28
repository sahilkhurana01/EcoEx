import { motion } from "framer-motion";
import {
  Handshake, ArrowRight, MapPin, Leaf, Check, Clock, MessageSquare,
  Loader2, PackageSearch, RefreshCw, X, Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ===================== STATUS CONFIG =====================

const negotiationStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-warning/15 text-warning border-warning/20" },
  in_progress: { label: "Negotiating", color: "bg-secondary/15 text-secondary border-secondary/20" },
  accepted: { label: "Accepted", color: "bg-success/15 text-success border-success/20" },
  rejected: { label: "Rejected", color: "bg-destructive/15 text-destructive border-destructive/20" },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
};

const executionStatusConfig: Record<string, { label: string; color: string }> = {
  not_started: { label: "Not Started", color: "bg-muted text-muted-foreground" },
  pickup_scheduled: { label: "Pickup Scheduled", color: "bg-secondary/15 text-secondary border-secondary/20" },
  in_transit: { label: "In Transit", color: "bg-secondary/15 text-secondary border-secondary/20" },
  delivered: { label: "Delivered", color: "bg-primary/15 text-primary border-primary/20" },
  verified: { label: "Verified", color: "bg-success/15 text-success border-success/20" },
  completed: { label: "Completed", color: "bg-success/15 text-success border-success/20" },
};

// ===================== HELPERS =====================

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function mapRawMatch(r: any, companyId: string | undefined) {
  const negStatus = r.negotiation?.status || 'pending';
  const execStatus = r.execution?.status || 'not_started';
  const listing = r.wasteListingId;

  // Determine if current company is buyer or seller
  const isSeller = r.sellerId?._id === companyId || r.sellerId === companyId;

  return {
    id: r._id,
    buyer: r.buyerId?.name || "Verified Buyer",
    buyerCity: r.buyerId?.['location.city'] || r.buyerId?.location?.city || null,
    seller: r.sellerId?.name || "Verified Seller",
    sellerCity: r.sellerId?.['location.city'] || r.sellerId?.location?.city || null,
    material: listing?.material?.category?.replace(/_/g, ' ') || "Material",
    qty: listing ? `${listing.quantity?.value?.toLocaleString() || 0} ${listing.quantity?.unit || 'kg'}` : "—",
    price: listing?.pricing?.amount ? `₹${listing.pricing.amount.toLocaleString()}` : null,
    score: Math.round(r.matchScore) || 0,
    negStatus,
    execStatus,
    isSeller,
    // Impact data
    co2Saved: r.predictedImpact?.co2SavedKg || r.actualImpact?.netCo2Saved || 0,
    waterSaved: r.predictedImpact?.waterSavedLiters || r.actualImpact?.waterSavedLiters || 0,
    economicValue: r.predictedImpact?.economicValue || r.actualImpact?.economicValueRealized || 0,
    // Logistics
    distance: r.matchFactors?.distanceScore || null,
    // AI
    aiExplanation: r.aiAnalysis?.explanation || null,
    aiConfidence: r.aiAnalysis?.confidence || null,
    // Dates
    createdAt: r.createdAt,
    acceptedAt: r.negotiation?.acceptedAt,
    completedAt: r.completedAt,
    // Passport
    passportId: r.passportId,
    // Raw for negotiate
    rawListingPrice: listing?.pricing?.amount || 0,
    rawListingQty: listing?.quantity?.value || 0,
  };
}

// ===================== COMPONENT =====================

export default function Matches() {
  const { company } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');
  const [negotiateDialogOpen, setNegotiateDialogOpen] = useState(false);
  const [negotiateMatchId, setNegotiateMatchId] = useState<string | null>(null);
  const [negotiateForm, setNegotiateForm] = useState({ price: "", message: "" });

  // ===================== QUERIES =====================

  const { data: rawMatches, isLoading, isError, refetch } = useQuery({
    queryKey: ['matches', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const res: any = await api.get('/matches');
      return res.data || [];
    },
    enabled: !!company?.id,
  });

  // ===================== MUTATIONS =====================

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const res: any = await api.post(`/matches/${id}/accept`);
      return res;
    },
    onSuccess: () => {
      toast.success("Match accepted! The deal is now in progress.");
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: () => toast.error("Failed to accept match"),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      // Use negotiate endpoint to reject
      const res: any = await api.post(`/matches/${id}/negotiate`, {
        message: "Match declined",
      });
      return res;
    },
    onSuccess: () => {
      toast.info("Match declined.");
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: () => toast.error("Failed to decline match"),
  });

  const negotiateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res: any = await api.post(`/matches/${id}/negotiate`, {
        proposedPrice: data.price ? Number(data.price) : undefined,
        message: data.message || "Counter offer submitted",
      });
      return res;
    },
    onSuccess: () => {
      toast.success("Counter offer sent!");
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setNegotiateDialogOpen(false);
      setNegotiateForm({ price: "", message: "" });
    },
    onError: () => toast.error("Failed to send counter offer"),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res: any = await api.post(`/matches/${id}/complete`, {});
      return res;
    },
    onSuccess: (data: any) => {
      toast.success("Transaction completed! Digital passport generated.");
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      const passportId = data?.data?.passport?._id;
      if (passportId) {
        setTimeout(() => navigate(`/passports/${passportId}`), 1500);
      }
    },
    onError: () => toast.error("Failed to complete transaction"),
  });

  // ===================== DATA =====================

  const allMatches = (rawMatches || []).map((r: any) => mapRawMatch(r, company?.id));

  const filteredMatches = allMatches.filter((m: any) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return m.negStatus === 'pending';
    if (filter === 'accepted') return m.negStatus === 'accepted';
    if (filter === 'completed') return m.execStatus === 'completed';
    return true;
  });

  const counts = {
    all: allMatches.length,
    pending: allMatches.filter((m: any) => m.negStatus === 'pending').length,
    accepted: allMatches.filter((m: any) => m.negStatus === 'accepted').length,
    completed: allMatches.filter((m: any) => m.execStatus === 'completed').length,
  };

  // ===================== HANDLERS =====================

  const openNegotiate = (matchId: string, currentPrice: number) => {
    setNegotiateMatchId(matchId);
    setNegotiateForm({ price: String(currentPrice), message: "" });
    setNegotiateDialogOpen(true);
  };

  const handleNegotiateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!negotiateMatchId) return;
    negotiateMutation.mutate({ id: negotiateMatchId, data: negotiateForm });
  };

  // ===================== RENDER =====================

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matches</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI-matched waste exchange opportunities</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'pending', 'accepted', 'completed'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="text-xs capitalize"
            onClick={() => setFilter(f)}
          >
            {f} {counts[f] > 0 && <span className="ml-1 font-mono">({counts[f]})</span>}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex h-[50vh] w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-center py-16 text-destructive">
          <p className="text-sm font-medium">Failed to load matches.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredMatches.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-5">
            <PackageSearch className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">No matches {filter !== 'all' ? `with "${filter}" status` : 'found yet'}</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {filter === 'all'
              ? "Matches are created when your waste listings are paired with buyers looking for compatible materials. List your waste in the Marketplace to start getting matched."
              : `There are no matches with "${filter}" status right now. Try checking another filter.`
            }
          </p>
          {filter === 'all' && (
            <Button className="gap-2" onClick={() => navigate('/marketplace')}>
              <PackageSearch className="h-4 w-4" /> Go to Marketplace
            </Button>
          )}
        </motion.div>
      )}

      {/* Matches Grid */}
      {!isLoading && !isError && filteredMatches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMatches.map((match: any, i: number) => {
            const negConfig = negotiationStatusConfig[match.negStatus] || negotiationStatusConfig.pending;
            const isCompleted = match.execStatus === 'completed';
            const isAccepted = match.negStatus === 'accepted';
            const isPending = match.negStatus === 'pending';
            const isNegotiating = match.negStatus === 'in_progress';

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="industrial-card p-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isCompleted ? 'bg-success/10' : 'bg-primary/10'}`}>
                      {isCompleted ? <Check className="h-5 w-5 text-success" /> : <Handshake className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground capitalize">{match.material}</h3>
                      <p className="text-xs text-muted-foreground">{match.qty}{match.price ? ` · ${match.price}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={negConfig.color}>{negConfig.label}</Badge>
                    {isAccepted && !isCompleted && (
                      <span className="text-[10px] text-muted-foreground">
                        {(executionStatusConfig[match.execStatus] || executionStatusConfig.not_started).label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Seller → Buyer */}
                <div className="flex items-center gap-2 mb-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className={`font-medium ${match.isSeller ? 'text-primary' : 'text-foreground'}`}>
                      {match.seller} {match.isSeller && <span className="text-[10px] text-muted-foreground">(You)</span>}
                    </span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-1">
                    <span className={`font-medium ${!match.isSeller ? 'text-primary' : 'text-foreground'}`}>
                      {match.buyer} {!match.isSeller && <span className="text-[10px] text-muted-foreground">(You)</span>}
                    </span>
                  </div>
                  <span className="ml-auto flex items-center gap-1 text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" /> {formatTimeAgo(match.createdAt)}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50 mb-4">
                  <div className="text-center">
                    <p className="data-label text-[10px]">Match Score</p>
                    <p className={`font-mono font-bold ${match.score >= 80 ? 'text-success' : match.score >= 60 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {match.score}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="data-label text-[10px]">CO₂ Saved</p>
                    <p className="font-mono font-bold text-success">
                      {match.co2Saved > 0 ? `${Math.round(match.co2Saved).toLocaleString()} kg` : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="data-label text-[10px]">Value</p>
                    <p className="font-mono font-bold text-foreground">
                      {match.economicValue > 0 ? `₹${Math.round(match.economicValue).toLocaleString()}` : match.price || '—'}
                    </p>
                  </div>
                </div>

                {/* AI Insight */}
                {match.aiExplanation && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 mb-4">
                    <Leaf className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground">
                      <span className="font-semibold">AI Insight: </span>{match.aiExplanation}
                    </p>
                  </div>
                )}

                {!match.aiExplanation && (match.distance || match.sellerCity || match.buyerCity) && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 mb-4">
                    <Leaf className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground">
                      <span className="font-semibold">AI Insight: </span>
                      Compatible material match
                      {match.distance ? `, ${Math.round(match.distance)}km distance` : ''}
                      . Price is within market range. Recommended deal.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  {/* PENDING: Accept / Negotiate / Decline */}
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => acceptMutation.mutate(match.id)}
                        disabled={acceptMutation.isPending}
                      >
                        {acceptMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1"
                        onClick={() => openNegotiate(match.id, match.rawListingPrice)}
                      >
                        <MessageSquare className="h-3 w-3" /> Negotiate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm("Decline this match?")) {
                            rejectMutation.mutate(match.id);
                          }
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  )}

                  {/* NEGOTIATING: Continue negotiation */}
                  {isNegotiating && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => acceptMutation.mutate(match.id)}
                        disabled={acceptMutation.isPending}
                      >
                        {acceptMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Accept Offer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1"
                        onClick={() => openNegotiate(match.id, match.rawListingPrice)}
                      >
                        <MessageSquare className="h-3 w-3" /> Counter Offer
                      </Button>
                    </>
                  )}

                  {/* ACCEPTED: Track / Mark Complete */}
                  {isAccepted && !isCompleted && (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => toast.info("Tracking information will be available once shipment starts.")}>
                        <Truck className="h-3 w-3" /> Track
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-success hover:bg-success/90 text-success-foreground gap-1"
                        onClick={() => completeMutation.mutate(match.id)}
                        disabled={completeMutation.isPending}
                      >
                        {completeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Mark Complete
                      </Button>
                    </>
                  )}

                  {/* COMPLETED: View Passport */}
                  {isCompleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 gap-1"
                      onClick={() => navigate(match.passportId ? `/passports/${match.passportId}` : '/passports')}
                    >
                      <Leaf className="h-3 w-3" /> View Digital Passport
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Negotiate Dialog */}
      <Dialog open={negotiateDialogOpen} onOpenChange={setNegotiateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Send Counter Offer</DialogTitle>
            <DialogDescription>
              Propose a new price or add a message to the other party.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleNegotiateSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="neg-price" className="text-xs text-muted-foreground">Proposed Price (₹)</Label>
              <Input
                id="neg-price"
                type="number"
                placeholder="e.g. 12000"
                value={negotiateForm.price}
                onChange={(e) => setNegotiateForm({ ...negotiateForm, price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neg-msg" className="text-xs text-muted-foreground">Message</Label>
              <Input
                id="neg-msg"
                placeholder="e.g. Can we discuss bulk discount?"
                value={negotiateForm.message}
                onChange={(e) => setNegotiateForm({ ...negotiateForm, message: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNegotiateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={negotiateMutation.isPending}>
                {negotiateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Offer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
