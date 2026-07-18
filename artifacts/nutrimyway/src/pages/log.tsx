import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sunrise, Sun, Apple, Moon, Camera, Sparkles, Loader2, X, ChevronLeft, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useCreateConsumptionLog, getGetDailySummaryQueryKey, useGetConsumptionLogs, getGetConsumptionLogsQueryKey, useGetMember, getGetMemberQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { native, snapPhoto } from "@/lib/capacitor";
import { apiFetch } from "@/lib/api-base";
import { format, parseISO, isValid, isToday } from "date-fns";
import { Link } from "wouter";

function todayLocal() { return new Date().toLocaleDateString("en-CA"); }

function autoSlot(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const h = new Date(Date.now() + IST_OFFSET_MS).getUTCHours();
  if (h < 12) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 18) return "Snack";
  return "Dinner";
}

const slots = [
  { id: "Breakfast", icon: Sunrise },
  { id: "Lunch", icon: Sun },
  { id: "Snack", icon: Apple },
  { id: "Dinner", icon: Moon },
];

interface MealLog {
  id: number;
  meal_slot: string;
  food_item: string;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  logged_at: string;
  photo_url: string | null;
}

function safeFormat(val: string | null | undefined, fmt: string, fallback = "--"): string {
  if (!val) return fallback;
  try { const d = parseISO(val); return isValid(d) ? format(d, fmt) : fallback; } catch { return fallback; }
}

export function Log() {
  const { memberId: MEMBER_ID } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeSlot, setActiveSlot] = useState(autoSlot());
  const [foodItem, setFoodItem] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customFiber, setCustomFiber] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [aiEstimated, setAiEstimated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  
  // Track open state for collapsible meal categories
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({ 
    Breakfast: true, Lunch: true, Snack: true, Dinner: true 
  });

  const [isSaving, setIsSaving] = useState(false);

  const createLog = useCreateConsumptionLog();
  const { data: member } = useGetMember(MEMBER_ID!, {
    query: { enabled: !!MEMBER_ID, queryKey: getGetMemberQueryKey(MEMBER_ID!) }
  });
  const isPremium = member?.valid_until && new Date(member.valid_until) >= new Date(new Date().toISOString().split('T')[0]);

  const { data: logs, refetch: refetchLogs } = useGetConsumptionLogs(
    MEMBER_ID!, 
    { date: todayLocal() }, 
    { query: { enabled: !!MEMBER_ID, queryKey: getGetConsumptionLogsQueryKey(MEMBER_ID!, { date: todayLocal() }) } }
  );

  const handleSave = async () => {
    if (!foodItem.trim() || isSaving) return;
    setIsSaving(true);
    
    const kcal = customKcal !== "" ? Number(customKcal) : null;
    const protein = customProtein !== "" ? Number(customProtein) : null;
    const fiber = customFiber !== "" ? Number(customFiber) : null;
    let photoUrl: string | null = null;

    if (pendingPhoto) {
      try {
        const urlRes = await apiFetch(`/storage/uploads/request-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: pendingPhoto.name, size: pendingPhoto.size, contentType: pendingPhoto.type }),
        });
        if (urlRes.ok) {
          const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
          const putRes = await fetch(uploadURL, { method: "PUT", body: pendingPhoto, headers: { "Content-Type": pendingPhoto.type } });
          if (putRes.ok) {
            photoUrl = objectPath;
          }
        }
      } catch {
        // non-blocking
      }
    }

    createLog.mutate(
      {
        memberId: MEMBER_ID!,
        data: {
          meal_slot: activeSlot,
          food_item: foodItem,
          calories_kcal: kcal,
          protein_g: protein,
          fiber_g: fiber,
          carbs_g: null,
          fat_g: null,
          photo_url: photoUrl,
          logged_at: new Date().toISOString(),
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDailySummaryQueryKey(MEMBER_ID!, { date: todayLocal() }) });
          queryClient.invalidateQueries({ queryKey: getGetConsumptionLogsQueryKey(MEMBER_ID!, { date: todayLocal() }) });
          refetchLogs();
          toast({ title: "Meal logged!" });
          setFoodItem("");
          setCustomKcal("");
          setCustomProtein("");
          setCustomFiber("");
          setAiEstimated(false);
          setPendingPhoto(null);
          if (photoPreviewUrl) { URL.revokeObjectURL(photoPreviewUrl); setPhotoPreviewUrl(null); }
        },
        onError: () => {
          setPendingPhoto(null);
          if (photoPreviewUrl) { URL.revokeObjectURL(photoPreviewUrl); setPhotoPreviewUrl(null); }
        },
        onSettled: () => {
          setIsSaving(false);
        }
      }
    );
  };

  const handleDelete = async (logId: number) => {
    if (!window.confirm("Are you sure you want to delete this meal?")) return;
    try {
      const res = await apiFetch(`/members/${MEMBER_ID}/consumption/${logId}`, { method: "DELETE" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: getGetDailySummaryQueryKey(MEMBER_ID!, { date: todayLocal() }) });
        queryClient.invalidateQueries({ queryKey: getGetConsumptionLogsQueryKey(MEMBER_ID!, { date: todayLocal() }) });
        refetchLogs();
        toast({ title: "Meal removed" });
      }
    } catch (error: any) {
      toast({ title: "Error deleting meal", description: error.message, variant: "destructive" });
    }
  };

  function handleCameraClick() {
    if (!isPremium) {
      toast({ title: "Premium Required", description: "Your trial has expired. Renew membership to use AI Food Vision.", variant: "destructive" });
      return;
    }
    if (native()) {
      void handleNativeCamera();
    } else {
      fileInputRef.current?.click();
    }
  }

  async function handleNativeCamera() {
    if (!MEMBER_ID) return;
    setAiLoading(true);
    try {
      const base64 = await snapPhoto();
      if (!base64) { setAiLoading(false); return; }

      const byteChars = atob(base64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const photoFile = new File([byteArr], "scan_\.jpg", { type: "image/jpeg" });
      setPendingPhoto(photoFile);
      setPhotoPreviewUrl(URL.createObjectURL(photoFile));

      await processImageWithAI(photoFile);
    } catch (err: any) {
      toast({ title: "Camera failed", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !MEMBER_ID) return;
    const file = e.target.files[0];
    
    setPendingPhoto(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setAiLoading(true);

    try {
      await processImageWithAI(file);
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
      e.target.value = "";
    }
  }

  async function processImageWithAI(file: File) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // remove data:image/...;base64,
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await apiFetch(`/members/${MEMBER_ID}/vision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, mimeType: file.type }),
    });
    
    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error || "Failed to analyze image");
    }

    const aiData = await res.json();
    setFoodItem(aiData.food_item || "");
    setCustomKcal(aiData.calories_kcal ? String(aiData.calories_kcal) : "");
    setCustomProtein(aiData.protein_g ? String(aiData.protein_g) : "");
    setCustomFiber(aiData.fiber_g ? String(aiData.fiber_g) : "");
    setAiEstimated(true);
    toast({ title: "Analyzed by AI ?", description: "Values estimated from photo. Please review." });
  }

  return (
    <div className="min-h-[100dvh] bg-muted/30 pb-24">
      <header className="bg-card border-b px-4 py-3 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <button className="p-1.5 -ml-1.5 rounded-full hover:bg-muted text-muted-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-lg font-bold">Log Meal</h1>
        </div>
        <div className="w-10"></div> {/* Empty space to center the title */}
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelected} 
        />
      </header>

      <div className="p-3 max-w-lg mx-auto">
        <div className="space-y-4">
          {/* Meal Slot Picker */}
        <section>
          <h2 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">When did you eat?</h2>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSlot(s.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 ${
                  activeSlot === s.id 
                    ? "bg-primary border-primary text-primary-foreground shadow-sm scale-[1.02]" 
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <s.icon className="w-4 h-4 mb-1" />
                <span className="text-[10px] font-medium">{s.id}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Manual Entry */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Custom Entry</h2>
            <button 
              onClick={handleCameraClick}
              disabled={aiLoading}
              className="px-3 py-1.5 rounded-full border border-primary text-primary flex items-center gap-1.5 active:scale-95 transition-transform bg-primary/5 text-xs font-medium"
            >
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              Snap & Analyse
            </button>
          </div>
          
          <div className="bg-card rounded-xl border p-3 shadow-sm space-y-3">
            <input
              type="text"
              placeholder="e.g. Grilled Chicken Salad"
              value={foodItem}
              onChange={(e) => setFoodItem(e.target.value)}
              className="w-full px-3 py-2 bg-transparent text-sm font-medium border rounded-lg focus:border-primary outline-none transition-colors"
            />

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="0"
                  value={customKcal}
                  onChange={(e) => setCustomKcal(e.target.value)}
                  className="w-full pl-2 pr-8 py-2 bg-transparent border rounded-lg focus:border-primary outline-none font-medium text-sm text-center"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">kcal</span>
              </div>
              
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="0"
                  value={customProtein}
                  onChange={(e) => setCustomProtein(e.target.value)}
                  className="w-full pl-2 pr-6 py-2 bg-transparent border rounded-lg focus:border-primary outline-none font-medium text-sm text-center"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">g</span>
              </div>

              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="0"
                  value={customFiber}
                  onChange={(e) => setCustomFiber(e.target.value)}
                  className="w-full pl-2 pr-6 py-2 bg-transparent border rounded-lg focus:border-primary outline-none font-medium text-sm text-center"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">g</span>
              </div>
            </div>

            {/* Photo Preview inside Card */}
            <AnimatePresence>
              {photoPreviewUrl && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative rounded-xl overflow-hidden shadow-sm border mt-4"
                >
                  <img src={photoPreviewUrl} alt="Meal preview" className="w-full h-48 object-cover" />
                  <button 
                    onClick={() => { setPendingPhoto(null); setPhotoPreviewUrl(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {aiEstimated && (
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-lg flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-xs font-medium text-white">AI Estimated — tap any field to adjust</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            disabled={createLog.isPending || isSaving || !foodItem.trim()}
            onClick={handleSave}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            {createLog.isPending || isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Meal"}
            {isSaving && "Saving..."}
          </button>
        </section>

        {/* Today's Logged Meals (Collapsible by Category) */}
        <section className="pt-4">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">Today's Logs</h2>
          <div className="space-y-2 pb-6">
            {slots.map(s => {
              const slotLogs = logs?.filter(l => l.meal_slot.toLowerCase() === s.id.toLowerCase()) || [];
              if (slotLogs.length === 0) return null;
              
              const isExpanded = expandedSlots[s.id];
              return (
                <div key={s.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setExpandedSlots(prev => ({...prev, [s.id]: !prev[s.id]}))}
                    className="w-full p-3 flex items-center justify-between bg-muted/20 active:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <s.icon className="w-4 h-4 text-primary" />
                      <span className="font-bold text-sm text-foreground">{s.id}</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {slotLogs.length} {slotLogs.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-2 space-y-2 border-t">
                          {slotLogs.map(log => (
                            <div key={log.id} className="bg-background border rounded-lg p-2.5 flex justify-between items-center">
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="font-bold text-foreground text-xs truncate">{log.food_item}</p>
                                <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                  {log.calories_kcal != null && <span>{log.calories_kcal} kcal</span>}
                                  {log.protein_g != null && <span>{log.protein_g}g protein</span>}
                                </div>
                                <div className="text-[9px] text-muted-foreground/60 mt-0.5">{safeFormat(log.logged_at, "h:mm a")}</div>
                              </div>
                              <button 
                                onClick={() => handleDelete(log.id)}
                                className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            
            {logs?.length === 0 && (
              <p className="text-center text-muted-foreground mt-4 text-xs py-6 border border-dashed rounded-xl">No meals logged yet today.</p>
            )}
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}

