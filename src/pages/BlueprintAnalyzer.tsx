import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Sparkles, Loader2, FileText, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";

const CATEGORY_OPTIONS = [
  { key: "sitework_concrete", label: "Sitework + Concrete/Foundations" },
  { key: "demolition", label: "Demolition" },
  { key: "earthwork_utilities", label: "Earthwork + Site Utilities" },
  { key: "paving_landscape", label: "Paving + Landscape" },
  { key: "masonry", label: "Masonry" },
  { key: "structural_steel", label: "Structural Steel + Metals" },
  { key: "framing_envelope", label: "Framing + Envelope" },
  { key: "thermal_moisture", label: "Thermal + Moisture Protection" },
  { key: "roofing_waterproofing", label: "Roofing + Waterproofing" },
  { key: "doors_windows_glazing", label: "Doors, Windows + Glazing" },
  { key: "interior_finishes", label: "Interior Finishes" },
  { key: "flooring", label: "Flooring" },
  { key: "paint_coatings", label: "Painting + Coatings" },
  { key: "specialties", label: "Specialties" },
  { key: "equipment_furnishings", label: "Equipment + Furnishings" },
  { key: "fire_protection", label: "Fire Protection" },
  { key: "electrical", label: "Electrical" },
  { key: "plumbing", label: "Plumbing" },
  { key: "hvac", label: "HVAC" },
  { key: "mep_specialty", label: "MEP + Specialty (FRP, coatings)" },
  { key: "general_conditions", label: "General Conditions" },
];

// Price book for manual (no-AI) takeoff. Seeds common line items per category
// with reasonable USD unit costs the user can adjust before saving.
const PRICE_BOOK: Record<string, { description: string; unit: string; unit_cost: number }[]> = {
  sitework_concrete: [
    { description: "Site clearing & grubbing", unit: "SF", unit_cost: 0.75 },
    { description: "Fine grading", unit: "SF", unit_cost: 0.65 },
    { description: "Spread footings (concrete + rebar + formwork)", unit: "CY", unit_cost: 650 },
    { description: "Slab on grade, 4\" w/ WWF", unit: "SF", unit_cost: 8.5 },
    { description: "Foundation walls, 8\" CIP", unit: "SF", unit_cost: 28 },
  ],
  demolition: [
    { description: "Selective interior demolition", unit: "SF", unit_cost: 3.5 },
    { description: "Slab sawcut & removal", unit: "LF", unit_cost: 12 },
    { description: "Disposal / dumpster", unit: "EA", unit_cost: 650 },
  ],
  earthwork_utilities: [
    { description: "Mass excavation", unit: "CY", unit_cost: 18 },
    { description: "Backfill & compaction", unit: "CY", unit_cost: 22 },
    { description: "Storm drainage piping", unit: "LF", unit_cost: 65 },
    { description: "Sanitary sewer lateral", unit: "LF", unit_cost: 85 },
    { description: "Water service line", unit: "LF", unit_cost: 55 },
  ],
  paving_landscape: [
    { description: "Asphalt paving, 3\" over base", unit: "SF", unit_cost: 5.25 },
    { description: "Concrete sidewalk, 4\"", unit: "SF", unit_cost: 9 },
    { description: "Striping & signage", unit: "LS", unit_cost: 2500 },
    { description: "Landscape & irrigation", unit: "SF", unit_cost: 4 },
  ],
  masonry: [
    { description: "CMU wall, 8\" reinforced", unit: "SF", unit_cost: 18 },
    { description: "Brick veneer", unit: "SF", unit_cost: 28 },
  ],
  structural_steel: [
    { description: "Structural steel (supply + erect)", unit: "TON", unit_cost: 4200 },
    { description: "Steel decking", unit: "SF", unit_cost: 6.5 },
    { description: "Misc metals & railings", unit: "LS", unit_cost: 8500 },
  ],
  framing_envelope: [
    { description: "Wood framing, exterior walls", unit: "SF", unit_cost: 14 },
    { description: "Metal stud framing, interior", unit: "SF", unit_cost: 9 },
    { description: "Sheathing & WRB", unit: "SF", unit_cost: 4.25 },
    { description: "Exterior siding / cladding", unit: "SF", unit_cost: 16 },
  ],
  thermal_moisture: [
    { description: "Batt insulation R-21 walls", unit: "SF", unit_cost: 1.95 },
    { description: "Spray foam, ceilings", unit: "SF", unit_cost: 3.5 },
    { description: "Air & vapor barrier", unit: "SF", unit_cost: 1.25 },
  ],
  roofing_waterproofing: [
    { description: "TPO single-ply roofing", unit: "SF", unit_cost: 9.5 },
    { description: "Roof insulation, R-30", unit: "SF", unit_cost: 4.25 },
    { description: "Flashings & accessories", unit: "LS", unit_cost: 4500 },
  ],
  doors_windows_glazing: [
    { description: "HM door + frame + hardware", unit: "EA", unit_cost: 1850 },
    { description: "Aluminum storefront", unit: "SF", unit_cost: 95 },
    { description: "Vinyl/aluminum windows", unit: "EA", unit_cost: 850 },
  ],
  interior_finishes: [
    { description: "Gypsum board, taped & finished", unit: "SF", unit_cost: 3.25 },
    { description: "Acoustic ceiling tile (ACT)", unit: "SF", unit_cost: 5.5 },
    { description: "Wall base, vinyl 4\"", unit: "LF", unit_cost: 2.25 },
  ],
  flooring: [
    { description: "LVT / vinyl plank", unit: "SF", unit_cost: 6.5 },
    { description: "Carpet tile", unit: "SF", unit_cost: 5 },
    { description: "Sealed concrete (polish)", unit: "SF", unit_cost: 4 },
    { description: "Porcelain tile", unit: "SF", unit_cost: 14 },
  ],
  paint_coatings: [
    { description: "Interior paint, 2 coats", unit: "SF", unit_cost: 1.75 },
    { description: "Exterior paint / coatings", unit: "SF", unit_cost: 2.85 },
    { description: "FRP wall panels", unit: "SF", unit_cost: 7.5 },
  ],
  specialties: [
    { description: "Toilet partitions & accessories", unit: "EA", unit_cost: 1200 },
    { description: "Signage package", unit: "LS", unit_cost: 3500 },
  ],
  equipment_furnishings: [
    { description: "Casework / millwork", unit: "LF", unit_cost: 425 },
    { description: "Appliances allowance", unit: "LS", unit_cost: 6500 },
  ],
  fire_protection: [
    { description: "Wet sprinkler system", unit: "SF", unit_cost: 4.5 },
    { description: "Fire alarm system", unit: "SF", unit_cost: 2.75 },
  ],
  electrical: [
    { description: "Electrical rough-in & devices", unit: "SF", unit_cost: 11 },
    { description: "Service & distribution", unit: "LS", unit_cost: 28000 },
    { description: "Lighting fixtures (allowance)", unit: "SF", unit_cost: 6 },
  ],
  plumbing: [
    { description: "Plumbing rough-in", unit: "SF", unit_cost: 6.5 },
    { description: "Plumbing fixtures", unit: "EA", unit_cost: 1450 },
    { description: "Domestic water heater", unit: "EA", unit_cost: 3800 },
  ],
  hvac: [
    { description: "Rooftop unit (RTU), 5-ton", unit: "EA", unit_cost: 12500 },
    { description: "Ductwork", unit: "SF", unit_cost: 9 },
    { description: "Controls & balancing", unit: "LS", unit_cost: 6500 },
  ],
  mep_specialty: [
    { description: "FRP panel installation", unit: "SF", unit_cost: 8.5 },
    { description: "Specialty coating system", unit: "SF", unit_cost: 6.25 },
  ],
  general_conditions: [
    { description: "Project management & supervision", unit: "MO", unit_cost: 14500 },
    { description: "Temporary facilities & utilities", unit: "MO", unit_cost: 2200 },
    { description: "Cleanup & final clean", unit: "LS", unit_cost: 3800 },
    { description: "Permits & fees allowance", unit: "LS", unit_cost: 5000 },
  ],
};

const categoryLabel = (key: string) =>
  CATEGORY_OPTIONS.find((c) => c.key === key)?.label || key;

type ExtractedItem = {
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  notes?: string;
};

interface Props {
  embeddedProjectId?: string;
}

export default function BlueprintAnalyzer({ embeddedProjectId }: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialProject = embeddedProjectId || searchParams.get("project") || "";

  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string>(initialProject);
  const [file, setFile] = useState<File | null>(null);
  const [bidDocs, setBidDocs] = useState<File[]>([]);
  const [categories, setCategories] = useState<string[]>(CATEGORY_OPTIONS.map((c) => c.key));
  const [notes, setNotes] = useState("");
  const [outputMode, setOutputMode] = useState<"review" | "auto">("review");
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    if (embeddedProjectId) return;
    supabase
      .from("projects")
      .select("id, name, status")
      .order("name")
      .then(({ data }) => setProjects(sortProjectsOpenFirst(data || [])));
  }, [embeddedProjectId]);

  const toggleCategory = (key: string) =>
    setCategories((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const total = useMemo(
    () =>
      items
        .filter((_, i) => selected[i])
        .reduce((s, it) => s + (it.quantity || 0) * (it.unit_cost || 0), 0),
    [items, selected],
  );

  const handleAnalyze = async () => {
    if (!projectId) return toast.error("Select a project first");
    if (categories.length === 0) return toast.error("Select at least one scope category");

    // Manual takeoff: skip AI entirely, seed items from the built-in price book.
    if (mode === "manual") {
      const seeded: ExtractedItem[] = [];
      categories.forEach((cat) => {
        const label = categoryLabel(cat);
        (PRICE_BOOK[cat] || []).forEach((row) => {
          seeded.push({
            category: label,
            description: row.description,
            quantity: 0,
            unit: row.unit,
            unit_cost: row.unit_cost,
            notes: "Manual takeoff — enter quantity",
          });
        });
      });
      if (seeded.length === 0) {
        toast.error("No price-book entries for the selected categories.");
        return;
      }
      setItems(seeded);
      setSummary(
        `Manual takeoff seeded with ${seeded.length} line items across ${categories.length} categories. Enter quantities and adjust unit costs as needed.`,
      );
      setAssumptions([]);
      const sel: Record<number, boolean> = {};
      seeded.forEach((_, i) => (sel[i] = true));
      setSelected(sel);
      setHasRun(true);
      toast.success(`Seeded ${seeded.length} items from price book — no AI credits used.`);
      return;
    }

    if (!file) return toast.error("Upload a blueprint file (PDF or image)");

    try {
      setUploading(true);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || "bin";
      const path = `blueprints/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("plan_documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("plan_documents").getPublicUrl(path);

      // Upload supporting bid documents in parallel
      const bidDocUploads = await Promise.all(
        bidDocs.map(async (bd) => {
          const bext = bd.name.split(".").pop() || "bin";
          const bpath = `bid-docs/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${bext}`;
          const { error: bErr } = await supabase.storage
            .from("plan_documents")
            .upload(bpath, bd, { contentType: bd.type, upsert: false });
          if (bErr) throw bErr;
          const { data: bPub } = supabase.storage.from("plan_documents").getPublicUrl(bpath);
          return { url: bPub.publicUrl, name: bd.name, fileType: bd.type };
        }),
      );

      const { data: analysisRow, error: insErr } = await supabase
        .from("blueprint_analyses")
        .insert({
          user_id: userId,
          project_id: projectId,
          file_url: pub.publicUrl,
          file_name: file.name,
          file_type: file.type,
          selected_categories: categories,
          status: "analyzing",
          notes,
          bid_document_urls: bidDocUploads,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      setAnalysisId(analysisRow.id);
      setUploading(false);
      setAnalyzing(true);
      setHasRun(true);

      const { data: result, error: fnErr } = await supabase.functions.invoke("analyze-blueprint", {
        body: {
          fileUrl: pub.publicUrl,
          fileType: file.type,
          categories,
          notes,
          bidDocumentUrls: bidDocUploads,
        },
      });
      if (fnErr) throw fnErr;
      if (!result?.success) throw new Error(result?.error || "Analysis failed");

      const extracted: ExtractedItem[] = result.items || [];
      setItems(extracted);
      setSummary(result.scope_summary || "");
      setAssumptions(result.assumptions || []);
      const sel: Record<number, boolean> = {};
      extracted.forEach((_, i) => (sel[i] = true));
      setSelected(sel);

      await supabase
        .from("blueprint_analyses")
        .update({ status: "complete", result })
        .eq("id", analysisRow.id);

      if (extracted.length === 0) {
        toast.warning("AI couldn't extract line items. Try a clearer blueprint.");
      } else if (outputMode === "auto") {
        await insertItems(extracted, extracted.map((_, i) => i));
      } else {
        toast.success(`Extracted ${extracted.length} line items — review below.`);
      }
    } catch (err: any) {
      console.error(err);
      const ctx = (err?.context ?? err?.cause ?? {}) as any;
      const detail = ctx?.error || err?.message || "Analysis failed";
      const isCredits =
        ctx?.code === "payment_required" ||
        /credits|payment_required|402/i.test(String(detail));
      toast.error(isCredits
        ? "AI credits exhausted. Add credits in Lovable Settings → Plans & credits."
        : detail);
      if (analysisId) {
        await supabase
          .from("blueprint_analyses")
          .update({ status: "error", error: err.message })
          .eq("id", analysisId);
      }
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const insertItems = async (source: ExtractedItem[], indexes: number[]) => {
    if (!projectId) return;
    const rows = indexes.map((i) => {
      const it = source[i];
      return {
        project_id: projectId,
        category: it.category || "General",
        description: it.description,
        quantity: it.quantity || 1,
        unit: it.unit || "EA",
        unit_cost: it.unit_cost || 0,
      };
    });
    const { error } = await supabase.from("bid_items").insert(rows);
    if (error) return toast.error("Failed to create bid items: " + error.message);
    toast.success(`Created ${rows.length} bid items in selected project`);
    setTimeout(() => navigate(`/bid-planner`), 800);
  };

  const handleConfirmCreate = () => {
    const idx = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (idx.length === 0) return toast.error("Select at least one item");
    insertItems(items, idx);
  };

  const updateItem = (i: number, patch: Partial<ExtractedItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setSelected((prev) => {
      const next: Record<number, boolean> = {};
      Object.keys(prev).forEach((k) => {
        const n = Number(k);
        if (n < i) next[n] = prev[n];
        else if (n > i) next[n - 1] = prev[n];
      });
      return next;
    });
  };

  const Body = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Blueprint to Bid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Analysis mode</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setMode("ai")}
                className={`p-3 rounded-lg border text-left text-sm ${
                  mode === "ai" ? "border-primary bg-primary/10" : ""
                }`}
              >
                <div className="font-medium">AI takeoff</div>
                <div className="text-xs text-muted-foreground">
                  Uses Lovable AI credits to read the blueprint
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`p-3 rounded-lg border text-left text-sm ${
                  mode === "manual" ? "border-primary bg-primary/10" : ""
                }`}
              >
                <div className="font-medium">Manual takeoff (no credits)</div>
                <div className="text-xs text-muted-foreground">
                  Seed line items from built-in price book — you enter quantities
                </div>
              </button>
            </div>
          </div>

          {!embeddedProjectId && (
            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>
              Blueprint (PDF or image){mode === "manual" ? " — optional" : ""}
            </Label>
            <Input
              type="file"
              accept="application/pdf,image/*"
              className="mt-1"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && (
              <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" /> {file.name} (
                {(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          <div>
            <Label>Scope categories to calculate</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {CATEGORY_OPTIONS.map((c) => (
                <label
                  key={c.key}
                  className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                >
                  <Checkbox
                    checked={categories.includes(c.key)}
                    onCheckedChange={() => toggleCategory(c.key)}
                  />
                  <span className="text-sm">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Additional context (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 8,000 SF tenant improvement, gypsum ceilings, exclude furniture..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Supporting bid documents (optional)</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Subcontractor quotes, vendor proposals, prior bids, or pricing sheets. The AI will use
              these to calibrate unit costs.
            </p>
            <Input
              type="file"
              accept="application/pdf,image/*"
              multiple
              className="mt-2"
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                setBidDocs((prev) => [...prev, ...list]);
                e.target.value = "";
              }}
            />
            {bidDocs.length > 0 && (
              <div className="mt-2 space-y-1">
                {bidDocs.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 text-sm bg-muted/50 rounded px-2 py-1"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate">{d.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(d.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setBidDocs((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>After analysis</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setOutputMode("review")}
                className={`p-3 rounded-lg border text-left text-sm ${
                  outputMode === "review" ? "border-primary bg-primary/10" : ""
                }`}
              >
                <div className="font-medium">Review first</div>
                <div className="text-xs text-muted-foreground">
                  Confirm items before adding to bid
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOutputMode("auto")}
                className={`p-3 rounded-lg border text-left text-sm ${
                  outputMode === "auto" ? "border-primary bg-primary/10" : ""
                }`}
              >
                <div className="font-medium">Auto-create bid items</div>
                <div className="text-xs text-muted-foreground">
                  Write directly into the project bid
                </div>
              </button>
            </div>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={uploading || analyzing}
            className="w-full"
            size="lg"
          >
            {(uploading || analyzing) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {uploading
              ? "Uploading..."
              : analyzing
                ? "Analyzing blueprint..."
                : mode === "manual"
                  ? "Generate Manual Takeoff"
                  : "Analyze Blueprint"}
          </Button>
        </CardContent>
      </Card>

      {(hasRun || items.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Extracted Scope & Bid Items</CardTitle>
                {analyzing ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Analyzing blueprint with AI — this can take 30–90 seconds for detailed plans...
                  </p>
                ) : summary ? (
                  <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{summary}</p>
                ) : items.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    No line items were extracted. Try a higher-resolution plan or add supporting
                    bid documents.
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Selected total</div>
                <div className="text-xl font-semibold">
                  ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            {assumptions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {assumptions.map((a, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {a}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {items.length === 0 && analyzing && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Running AI takeoff...
              </div>
            )}
            {items.length > 0 && (
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Qty</TableHead>
                    <TableHead className="w-20">Unit</TableHead>
                    <TableHead className="w-32">Unit Cost</TableHead>
                    <TableHead className="w-32 text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Checkbox
                          checked={!!selected[i]}
                          onCheckedChange={(v) =>
                            setSelected((s) => ({ ...s, [i]: !!v }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.category}
                          onChange={(e) => updateItem(i, { category: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.description}
                          onChange={(e) => updateItem(i, { description: e.target.value })}
                          className="h-8"
                        />
                        {it.notes && (
                          <div className="text-xs text-muted-foreground mt-1">{it.notes}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(i, { quantity: Number(e.target.value) || 0 })
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.unit}
                          onChange={(e) => updateItem(i, { unit: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={it.unit_cost}
                          onChange={(e) =>
                            updateItem(i, { unit_cost: Number(e.target.value) || 0 })
                          }
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${((it.quantity || 0) * (it.unit_cost || 0)).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => removeItem(i)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handleConfirmCreate} size="lg">
                <Upload className="w-4 h-4 mr-2" />
                Create Selected Bid Items
              </Button>
            </div>
            </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (embeddedProjectId) return Body;

  return (
    <Layout title="Blueprint Analyzer" subtitle="AI-powered scope extraction and bid generation">
      {Body}
    </Layout>
  );
}