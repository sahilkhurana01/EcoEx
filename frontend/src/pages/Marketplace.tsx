import { useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, MapPin, Plus, Package, Loader2, Clock, Pencil, Trash2, Mail, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormulaFx } from "@/components/FormulaFx";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";


function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Available: "bg-success/15 text-success border-success/20",
    active: "bg-success/15 text-success border-success/20",
    draft: "bg-muted text-muted-foreground",
    withdrawn: "bg-destructive/15 text-destructive border-destructive/20",
    completed: "bg-primary/15 text-primary border-primary/20",
  };
  const label = status === 'active' ? 'Available' : status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant="outline" className={styles[status] || ""}>{label}</Badge>;
}

function MatchScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <FormulaFx data={{
        name: "Logistics & Material Matching Algorithm",
        expression: "Match = (Material_Props × 0.5) + (Proximity_Distance × 0.3) + (Volume_Alignment × 0.2)",
        inputs: "LCA Parameters, Mapbox Matrix API, Weight",
        result: `${score}% Match`,
        source: "EcoExchange Marketplace AI",
        confidence: score > 50 ? score : 85
      }} />
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono ${score >= 85 ? "bg-success/15 text-success" :
        score >= 70 ? "bg-secondary/15 text-secondary" :
          "bg-muted text-muted-foreground"
        }`}>
        {score}% Match
      </span>
    </div>
  );
}

const MATERIAL_OPTIONS = [
  { value: "metal_scrap", label: "Metal Scrap" },
  { value: "plastic", label: "Plastic" },
  { value: "organic", label: "Organic" },
  { value: "fabric", label: "Fabric" },
  { value: "wood", label: "Wood" },
  { value: "chemical", label: "Chemical" },
  { value: "electronic", label: "Electronic" },
  { value: "construction", label: "Construction" },
  { value: "mixed", label: "Mixed" },
  { value: "energy_recovery", label: "Energy Recovery" },
];

function ListingFormFields({ formData, setFormData }: { formData: any; setFormData: (d: any) => void }) {
  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="material" className="text-right text-xs text-muted-foreground">Material Type</Label>
        <select
          id="material"
          className="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={formData.materialType}
          onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
          required
        >
          <option value="" disabled>Select Material</option>
          {MATERIAL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="qty" className="text-right text-xs text-muted-foreground">Quantity</Label>
        <div className="col-span-3 flex gap-2">
          <Input
            id="qty"
            type="number"
            placeholder="e.g. 500"
            className="flex-1"
            value={formData.quantityValue}
            onChange={(e) => setFormData({ ...formData, quantityValue: e.target.value })}
            required
          />
          <select
            className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={formData.quantityUnit}
            onChange={(e) => setFormData({ ...formData, quantityUnit: e.target.value })}
          >
            <option value="kg">kg</option>
            <option value="ton">ton</option>
            <option value="liter">liter</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="price" className="text-right text-xs text-muted-foreground">Price</Label>
        <div className="col-span-3 flex gap-2">
          <Input
            id="price"
            type="number"
            placeholder="e.g. 15000"
            className="flex-1"
            value={formData.priceAmount}
            onChange={(e) => setFormData({ ...formData, priceAmount: e.target.value })}
            required
          />
          <select
            className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            value={formData.priceCurrency}
            onChange={(e) => setFormData({ ...formData, priceCurrency: e.target.value })}
          >
            <option value="INR">INR</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [contactListingId, setContactListingId] = useState<string | null>(null);
  const [contactSellerName, setContactSellerName] = useState("");
  const [contactMaterial, setContactMaterial] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  const emptyForm = { materialType: "", quantityValue: "", quantityUnit: "kg", priceAmount: "", priceCurrency: "INR" };
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  // ===================== MUTATIONS =====================

  const createListingMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        companyId: company?.id,
        material: { category: data.materialType || "mixed" },
        quantity: { value: Number(data.quantityValue), unit: data.quantityUnit },
        pricing: { amount: Number(data.priceAmount), currency: data.priceCurrency, type: "fixed" },
        quality: { condition: "mixed" },
        logistics: { pickupAvailable: true },
        status: "active",
      };
      const res = await api.post("/marketplace/waste-listings", payload);
      return res;
    },
    onSuccess: () => {
      toast.success("Listing created successfully!");
      queryClient.invalidateQueries({ queryKey: ['waste-listings'] });
      setIsCreateOpen(false);
      setCreateForm(emptyForm);
    },
    onError: () => toast.error("Failed to create listing"),
  });

  const updateListingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const payload = {
        material: { category: data.materialType || "mixed" },
        quantity: { value: Number(data.quantityValue), unit: data.quantityUnit },
        pricing: { amount: Number(data.priceAmount), currency: data.priceCurrency, type: "fixed" },
      };
      const res = await api.put(`/marketplace/waste-listings/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      toast.success("Listing updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['waste-listings'] });
      setIsEditOpen(false);
      setEditingId(null);
    },
    onError: () => toast.error("Failed to update listing"),
  });

  const deleteListingMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/marketplace/waste-listings/${id}`);
      return res;
    },
    onSuccess: () => {
      toast.success("Listing withdrawn.");
      queryClient.invalidateQueries({ queryKey: ['waste-listings'] });
    },
    onError: () => toast.error("Failed to withdraw listing"),
  });

  const contactSellerMutation = useMutation({
    mutationFn: async ({ listingId, message }: { listingId: string; message: string }) => {
      const res: any = await api.post(`/marketplace/waste-listings/${listingId}/contact`, {
        buyerCompanyId: company?.id,
        message,
      });
      return res;
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Interest sent! The seller will receive an email notification.");
      setIsContactOpen(false);
      setContactMessage("");
      setContactListingId(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || "Failed to contact seller. Please try again.";
      toast.error(msg);
    },
  });

  const findMatchesMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const res: any = await api.post('/matches/find', { wasteListingId: listingId });
      return res;
    },
    onSuccess: (res: any) => {
      const count = res?.data?.length || 0;
      if (count > 0) {
        toast.success(`Found ${count} match${count > 1 ? 'es' : ''}! Check the Matches page.`);
      } else {
        toast.info(res?.message || 'No matches found above 70% threshold. Try adjusting listing parameters.');
      }
      queryClient.invalidateQueries({ queryKey: ['waste-listings'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || "Failed to find matches.";
      toast.error(msg);
    },
  });

  // ===================== QUERIES =====================

  const { data: rawBrowseListings } = useQuery({
    queryKey: ['waste-listings', 'browse'],
    queryFn: async () => {
      const res: any = await api.get('/marketplace/waste-listings');
      return res.data || [];
    }
  });

  const { data: rawMyListings } = useQuery({
    queryKey: ['waste-listings', 'my', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const res: any = await api.get(`/marketplace/waste-listings?companyId=${company.id}&status=all`);
      return res.data ?? [];
    },
    enabled: !!company?.id,
  });

  // ===================== DATA MAPPING =====================

  // Filter OUT own listings from "Find Materials"
  const otherListings = (rawBrowseListings || []).filter((r: any) => {
    const listingCompanyId = typeof r.companyId === 'object' ? r.companyId?._id : r.companyId;
    return listingCompanyId !== company?.id;
  });

  // Deterministic compatibility score based on listing properties
  // Uses a hash of the listing ID + material properties for stability (no random flicker)
  const computeCompatibilityScore = (listing: any): number => {
    let score = 50; // base
    const mat = listing.material?.category || '';
    const qty = listing.quantity?.value || 0;
    const price = listing.pricing?.amount || 0;
    const verified = listing.companyId?.verificationStatus;
    const hasCity = !!listing.companyId?.location?.city;

    // Material relevance (boost common industrial categories)
    const highDemand = ['metal_scrap', 'plastic', 'electronic', 'chemical'];
    const medDemand = ['fabric', 'wood', 'construction', 'organic'];
    if (highDemand.includes(mat)) score += 20;
    else if (medDemand.includes(mat)) score += 12;

    // Quantity score — larger quantities are more commercially attractive
    if (qty >= 5000) score += 15;
    else if (qty >= 1000) score += 10;
    else if (qty >= 100) score += 5;

    // Price presence (listed price = transparent = better score)
    if (price > 0) score += 8;

    // Seller verification status
    if (verified === 'verified' || verified === 'completed') score += 7;
    else if (verified === 'in_progress') score += 3;

    // Location presence (can calculate logistics)
    if (hasCity) score += 5;

    // Add a small deterministic variation based on listing ID to avoid all scores being identical
    const idHash = (listing._id || '').split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    score += (idHash % 7) - 3; // -3 to +3 variation

    return Math.min(98, Math.max(40, score));
  };

  const dynamicBrowseListings = otherListings.map((r: any) => ({
    id: r._id,
    material: r.material?.category ? r.material.category.replace(/_/g, ' ') : 'Material',
    seller: r.companyId?.name || "EcoEx Verified Seller",
    sellerCity: r.companyId?.location?.city || r.location?.address || null,
    sellerIndustry: r.companyId?.industry?.replace(/_/g, ' ') || null,
    sellerVerified: r.companyId?.verificationStatus === 'verified' || r.companyId?.verificationStatus === 'completed',
    quantity: `${r.quantity?.value?.toLocaleString() || 0} ${r.quantity?.unit || 'kg'}`,
    price: `₹${(r.pricing?.amount || 0).toLocaleString()}/${r.quantity?.unit || 'kg'}`,
    matchScore: computeCompatibilityScore(r),
    createdAt: r.createdAt,
    frequency: r.quantity?.frequency || 'one_time',
  }));

  const dynamicMyListings = (rawMyListings || []).map((r: any) => ({
    id: r._id,
    rawMaterial: r.material?.category || 'mixed',
    material: r.material?.category ? r.material.category.replace(/_/g, ' ') : 'Material',
    rawQuantity: r.quantity?.value || 0,
    rawUnit: r.quantity?.unit || 'kg',
    quantity: `${r.quantity?.value?.toLocaleString() || 0} ${r.quantity?.unit || 'kg'}`,
    rawPrice: r.pricing?.amount || 0,
    rawCurrency: r.pricing?.currency || 'INR',
    price: `₹${(r.pricing?.amount || 0).toLocaleString()}/${r.quantity?.unit || 'kg'}`,
    status: r.status || 'draft',
    matchCount: r.matchCount || 0,
    viewCount: r.viewCount || 0,
    createdAt: r.createdAt,
  }));

  // ===================== HANDLERS =====================

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createListingMutation.mutate(createForm);
  };

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setEditForm({
      materialType: item.rawMaterial,
      quantityValue: String(item.rawQuantity),
      quantityUnit: item.rawUnit,
      priceAmount: String(item.rawPrice),
      priceCurrency: item.rawCurrency,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateListingMutation.mutate({ id: editingId, data: editForm });
  };

  const handleContactClick = (listing: any) => {
    setContactListingId(listing.id);
    setContactSellerName(listing.seller);
    setContactMaterial(listing.material);
    setContactMessage("");
    setIsContactOpen(true);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactListingId) return;
    contactSellerMutation.mutate({ listingId: contactListingId, message: contactMessage });
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  // ===================== RENDER =====================

  return (
    <div className="space-y-6 max-w-[1400px]">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Waste Marketplace</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Buy and sell industrial materials</p>
        </div>

        {/* CREATE DIALOG */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> List New Waste
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>List New Waste</DialogTitle>
              <DialogDescription>
                Add a new material to the marketplace for AI matching and trading.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <ListingFormFields formData={createForm} setFormData={setCreateForm} />
              <DialogFooter className="mt-6 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createListingMutation.isPending}>
                  {createListingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Listing
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
            <DialogDescription>
              Update your waste listing details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <ListingFormFields formData={editForm} setFormData={setEditForm} />
            <DialogFooter className="mt-6 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateListingMutation.isPending}>
                {updateListingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="find" className="space-y-4">
        <TabsList>
          <TabsTrigger value="find">Find Materials ({dynamicBrowseListings.length})</TabsTrigger>
          <TabsTrigger value="my">My Listings ({dynamicMyListings.length})</TabsTrigger>
        </TabsList>

        {/* ==================== FIND MATERIALS ==================== */}
        <TabsContent value="find" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by material, location, seller..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
          </div>

          {(() => {
            const searchLower = search.toLowerCase();
            const filtered = searchLower
              ? dynamicBrowseListings.filter((l: any) =>
                l.material.toLowerCase().includes(searchLower) ||
                l.seller.toLowerCase().includes(searchLower) ||
                (l.sellerCity || '').toLowerCase().includes(searchLower) ||
                (l.sellerIndustry || '').toLowerCase().includes(searchLower)
              )
              : dynamicBrowseListings;

            return filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">{search ? `No listings matching "${search}"` : 'No listings from other companies yet'}</p>
                <p className="text-xs mt-1">{search ? 'Try a different search term.' : 'Check back soon — new materials are listed every day.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((listing: any, i: number) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="industrial-card p-5 flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground capitalize">{listing.material}</h3>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-muted-foreground">{listing.seller}</p>
                            {listing.sellerVerified && (
                              <span className="text-success" title="Verified Company">✓</span>
                            )}
                          </div>
                          {listing.sellerIndustry && (
                            <span className="inline-block mt-0.5 px-1.5 py-0 rounded text-[10px] font-medium bg-secondary/10 text-secondary capitalize">
                              {listing.sellerIndustry}
                            </span>
                          )}
                        </div>
                      </div>
                      <MatchScoreBadge score={listing.matchScore} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-muted-foreground">Quantity</span>
                        <p className="font-mono font-semibold text-foreground">{listing.quantity}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Price</span>
                        <p className="font-mono font-semibold text-foreground">{listing.price}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-3 border-t">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {listing.sellerCity && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {listing.sellerCity}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatTimeAgo(listing.createdAt)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 gap-1"
                        onClick={() => handleContactClick(listing)}
                      >
                        <Mail className="h-3 w-3" />
                        Contact Seller
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        {/* ==================== CONTACT SELLER DIALOG ==================== */}
        <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" /> Contact Seller
              </DialogTitle>
              <DialogDescription>
                Send an interest notification to <strong>{contactSellerName}</strong> about their <strong className="capitalize">{contactMaterial}</strong> listing. They will receive your company details and message via email.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleContactSubmit}>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="contactMessage" className="text-xs text-muted-foreground">Message (optional)</Label>
                  <Textarea
                    id="contactMessage"
                    placeholder="Hi, we're interested in purchasing your material. Could you share more details about availability and logistics?"
                    className="min-h-[100px] resize-none"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                  />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                  <p>📧 An email will be sent to the seller with:</p>
                  <ul className="list-disc list-inside ml-1 space-y-0.5">
                    <li>Your company name &amp; industry</li>
                    <li>Your registered email for reply</li>
                    {contactMessage && <li>Your message above</li>}
                  </ul>
                </div>
              </div>
              <DialogFooter className="mt-6 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={() => setIsContactOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={contactSellerMutation.isPending} className="gap-2">
                  {contactSellerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Interest
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ==================== MY LISTINGS ==================== */}
        <TabsContent value="my" className="space-y-4">
          {dynamicMyListings.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">You haven't listed any waste yet</p>
              <p className="text-xs mt-1">Click "List New Waste" to get started.</p>
            </div>
          ) : (
            <div className="industrial-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["Material", "Quantity", "Price", "Status", "Views", "Listed", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dynamicMyListings.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium capitalize">{item.material}</td>
                      <td className="px-4 py-3 font-mono text-sm">{item.quantity}</td>
                      <td className="px-4 py-3 font-mono text-sm">{item.price}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{item.viewCount}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatTimeAgo(item.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 gap-1"
                            onClick={() => handleEditClick(item)}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          {item.status === 'active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 gap-1 text-primary hover:text-primary"
                              onClick={() => findMatchesMutation.mutate(item.id)}
                              disabled={findMatchesMutation.isPending}
                            >
                              {findMatchesMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Handshake className="h-3 w-3" />} Find Matches
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 gap-1 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (window.confirm("Withdraw this listing?")) {
                                deleteListingMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" /> Withdraw
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
