import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sunrise, Sun, Apple, Moon, Camera, Sparkles, Loader2, X, ChevronLeft } from "lucide-react";
import { useCreateConsumptionLog, getGetDailySummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { native, snapPhoto } from "@/lib/capacitor";
import { apiFetch } from "@/lib/api-base";
import { format, parseISO, isValid } from "date-fns";
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

  const createLog = useCreateConsumptionLog();

  const handleSave = async () => {
    if (!foodItem.trim()) return;
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
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDailySummaryQueryKey(MEMBER_ID!, { date: todayLocal() }) });
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
        }
      }
    );
  };

  function handleCameraClick() {
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
    const formData = new FormData();
    formData.append("image", file);

    const res = await apiFetch(`/members/${MEMBER_ID}/vision`, {
      method: "POST",
      body: formData,
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
      <header className="bg-card border-b px-4 py-4 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-xl font-bold">Log Meal</h1>
        </div>
        <button 
          onClick={handleCameraClick}
          disabled={aiLoading}
          className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-95 transition-transform"
        >
          {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
        </button>
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelected} 
        />
      </header>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Meal Slot Picker */}
        <section>
          <h2 className="text-sm font-semibold mb-3">When did you eat?</h2>
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSlot(s.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-colors ${
                  activeSlot === s.id 
                    ? "bg-primary/10 border-primary text-primary" 
                    : "bg-card border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <s.icon className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{s.id}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Photo Preview */}
        <AnimatePresence>
          {photoPreviewUrl && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative rounded-xl overflow-hidden shadow-sm border"
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
                  <span className="text-xs font-medium text-white">AI Estimated</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Manual Entry */}
        <section className="bg-card rounded-2xl border p-4 shadow-sm space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What did you eat?</label>
            <input
              type="text"
              placeholder="e.g. Grilled Chicken Salad"
              value={foodItem}
              onChange={(e) => setFoodItem(e.target.value)}
              className="w-full px-0 py-2 bg-transparent text-lg font-medium border-b border-border focus:border-primary outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-card text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Calories</label>
              <input
                type="number"
                placeholder="0"
                value={customKcal}
                onChange={(e) => setCustomKcal(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border rounded-xl focus:border-primary outline-none font-medium text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">kcal</span>
            </div>
            
            <div className="relative">
              <label className="absolute -top-2 left-3 px-1 bg-card text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Protein</label>
              <input
                type="number"
                placeholder="0"
                value={customProtein}
                onChange={(e) => setCustomProtein(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border rounded-xl focus:border-primary outline-none font-medium text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">g</span>
            </div>
          </div>
          
          <div className="relative pt-2">
            <label className="absolute top-0 left-3 px-1 bg-card text-[10px] font-semibold text-muted-foreground uppercase tracking-wider z-10">Fiber</label>
            <input
              type="number"
              placeholder="0"
              value={customFiber}
              onChange={(e) => setCustomFiber(e.target.value)}
              className="w-full px-4 py-3 mt-2 bg-transparent border rounded-xl focus:border-primary outline-none font-medium text-lg"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pt-2">g</span>
          </div>

          <button
            disabled={createLog.isPending || !foodItem.trim()}
            onClick={handleSave}
            className="w-full mt-6 py-3.5 bg-primary text-primary-foreground font-semibold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createLog.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Meal"}
          </button>
        </section>
      </div>
    </div>
  );
}

