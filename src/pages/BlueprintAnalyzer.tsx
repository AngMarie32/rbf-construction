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
  { key: "framing_envelope", label: "Framing + Envelope" },
  { key: "interior_finishes", label: "Interior Finishes" },
  { key: "mep_specialty", label: "MEP + Specialty (FRP, coatings)" },
];

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
      .then(({ data }) => setProjects(data || []));
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
    if (!file) return toast.error("Upload a blueprint file (PDF or image)");
    if (categories.length === 0) return toast.error("Select at least one scope category");

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
      toast.error(err.message || "Analysis failed");
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
            <Label>Blueprint (PDF or image)</Label>
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
            {uploading ? "Uploading..." : analyzing ? "Analyzing blueprint..." : "Analyze Blueprint"}
          </Button>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Extracted Scope & Bid Items</CardTitle>
                {summary && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{summary}</p>
                )}
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