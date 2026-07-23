import { useGetMember, getGetMemberQueryKey, useGetDailySummary, getGetDailySummaryQueryKey, useGetConsumptionLogs, getGetConsumptionLogsQueryKey, useGetActivities, getGetActivitiesQueryKey } from "@workspace/api-client-react";
import { format, isValid } from "date-fns";
import { Link } from "wouter";
import { Plus, Minus, LogOut, Utensils, HeartPulse, User, Loader2, Footprints, Droplet, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { getProgressColorClass, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { RecordHealthDrawer } from "@/components/record-health-drawer";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-base";

function safeFormat(value: string | null | undefined, fmt: string, fallback = "--"): string {
  if (!value) return fallback;
  const d = new Date(value);
  return isValid(d) ? format(d, fmt) : fallback;
}

function todayLocal() { return new Date().toLocaleDateString("en-CA"); }
const TODAY = todayLocal();

// -- Progress Ring ----------------------------------------------------------
function ProgressRing({ 
  value, max, baseMax, secondaryMax, label, color, colorClass, 
  size = 120, strokeWidth = 8, unit = "" 
}: any) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - pct * circumference;

  let stop1 = "#8ce4f5"; // cyan-light
  let stop2 = "#27c5e9"; // cyan-base
  if (pct >= 1.0) {
    stop1 = "#ea580c"; // orange-600
    stop2 = "#991b1b"; // red-800
  } else if (pct >= 0.85) {
    stop1 = "#27c5e9"; // cyan-base
    stop2 = "#ea580c"; // orange-600
  } else if (pct >= 0.5) {
    stop1 = "#cbf6e3"; // mint-light
    stop2 = "#9ef0c8"; // mint-base
  }

  const basePct = (baseMax && max > 0) ? baseMax / max : 1;
  const baseOffset = circumference - basePct * circumference;
  
  const secPct = (secondaryMax && max > 0) ? secondaryMax / max : 0;
  const secOffset = circumference - secPct * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stop1} />
            <stop offset="100%" stopColor={stop2} />
          </linearGradient>
        </defs>
        {baseMax !== undefined && secondaryMax !== undefined ? (
          <>
            <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} 
                    className="stroke-cyan-pale dark:stroke-cyan-dark/40 fill-none" 
                    strokeDasharray={circumference} strokeDashoffset={baseOffset} />
            <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} 
                    className="stroke-orange-100 dark:stroke-orange-900/40 fill-none" 
                    strokeDasharray={circumference} strokeDashoffset={secOffset} 
                    style={{ transformOrigin: 'center', transform: `rotate(${basePct * 360}deg)` }} />
          </>
        ) : (
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="stroke-muted/40 fill-none" />
        )}
        
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
          stroke="url(#progress-gradient)"
          strokeLinecap="round"
          className="fill-none drop-shadow-sm"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tracking-tight text-foreground">
          {Math.round(value)}
          {unit && <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span>}
        </span>
        {label && <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">{label}</span>}
        {baseMax !== undefined && secondaryMax !== undefined && (
          <span className="text-[9px] font-semibold text-muted-foreground mt-1 whitespace-nowrap">
            Target: {baseMax} + {secondaryMax}
          </span>
        )}
      </div>
    </div>
  );
}

// -- Mini Macro Pill --------------------------------------------------------
function MacroPill({ label, value, max, colorClass, unit = "g" }: any) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-card border shadow-sm flex-1">
      <div className="flex justify-between items-end">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-sm font-semibold">{Math.round(value)}{unit}</span>
      </div>
      <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { memberId, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: member } = useGetMember(memberId!, { query: { enabled: !!memberId, queryKey: getGetMemberQueryKey(memberId!) } });
  const { data: daily } = useGetDailySummary(memberId!, { date: TODAY }, { query: { enabled: !!memberId, queryKey: getGetDailySummaryQueryKey(memberId!, { date: TODAY }) } });
  const { data: logs } = useGetConsumptionLogs(memberId!, { date: TODAY }, { query: { enabled: !!memberId, queryKey: getGetConsumptionLogsQueryKey(memberId!, { date: TODAY }) } });
  const { data: activities, refetch: refetchActivities } = useGetActivities(memberId!, { date: TODAY }, { query: { enabled: !!memberId, queryKey: getGetActivitiesQueryKey(memberId!, { date: TODAY }) } });

  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addingWater, setAddingWater] = useState(false);
  const [mealsExpanded, setMealsExpanded] = useState(true);
  const { toast } = useToast();

  const fetchRecords = useCallback(() => {
    if (memberId) {
      apiFetch(`/members/${memberId}/health-records`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setHealthRecords(data);
        })
        .catch(console.error);
        
      apiFetch(`/members/${memberId}/water?date=${TODAY}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setWaterLogs(data);
        })
        .catch(console.error);
    }
  }, [memberId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Check if there is a record for today (in local timezone)
  const todayRecord = healthRecords.find(r => {
    if (!r.recorded_at) return false;
    const d = new Date(r.recorded_at);
    return d.toLocaleDateString("en-CA") === TODAY;
  });
  
  const totalWater = waterLogs.reduce((acc, log) => acc + log.amount_ml, 0);

  const handleAddWater = async (amount: number) => {
    if (!memberId) return;
    setAddingWater(true);
    try {
      await apiFetch(`/members/${memberId}/water`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_ml: amount })
      });
      fetchRecords(); // re-fetch water logs
    } catch (error) {
      console.error(error);
    } finally {
      setAddingWater(false);
    }
  };

  const handleSubtractWater = async () => {
    if (!memberId || totalWater === 0) return;
    setAddingWater(true);
    try {
      await apiFetch(`/members/${memberId}/water/latest?date=${TODAY}`, {
        method: "DELETE",
      });
      fetchRecords();
    } catch (error) {
      console.error(error);
    } finally {
      setAddingWater(false);
    }
  };

  const handleLogout = () => {
    queryClient.clear();
    logout();
  };

  const macros = daily ?? {
    total_kcal: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0, total_fiber_g: 0, total_calories_burned_kcal: 0
  };
  
  const baseTarget = member?.daily_kcal || 2000;
  const burned = macros.total_calories_burned_kcal || 0;
  const adjustedTarget = baseTarget + burned;

  return (
    <div className="min-h-[100dvh] bg-background pb-16">
      {/* Header Profile Section */}
      <header className="bg-card px-4 pt-8 pb-4 rounded-b-3xl shadow-sm border-b relative z-10">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
              {format(new Date(), "EEEE, MMMM do")}
            </p>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Hi, {member?.name?.split(" ")[0] || "Guest"}
            </h1>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-full bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4 flex flex-col gap-3">
        
        {/* Main Nutrition Card */}
        <section className="bg-card border shadow-sm rounded-2xl p-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10" />
          
          <div className="flex gap-4 items-center">
            <div className="w-1/2 flex flex-col items-center justify-center">
              <ProgressRing
                value={macros.total_kcal}
                max={adjustedTarget}
                baseMax={baseTarget}
                secondaryMax={burned}
                label="KCAL"
                size={110}
                strokeWidth={8}
              />
            </div>
            <div className="w-1/2 flex flex-col justify-center gap-2 pr-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold tracking-wider text-[10px]">PROTEIN</span>
                <span className="font-bold">{Math.round(macros.total_protein_g ?? 0)}g</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold tracking-wider text-[10px]">FIBER</span>
                <span className="font-bold">{Math.round(macros.total_fiber_g ?? 0)}g</span>
              </div>
            </div>
          </div>
        </section>

        {/* Calories Burnt Today Card */}
        <section className="bg-card border shadow-sm rounded-xl p-3 flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Footprints className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Calories Burnt Today</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">From physical activities</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-orange-500">{burned} <span className="text-[10px] font-bold opacity-80 uppercase">kcal</span></span>
          </div>
        </section>

        {/* Target Pills */}
        <div className="flex gap-2">
          <div className="flex-1 bg-primary/10 rounded-xl p-2 flex flex-col items-center justify-center">
            <span className="text-[9px] font-bold text-primary tracking-wider">PROTEIN</span>
            <span className={cn("text-xs font-bold mt-0.5", getProgressColorClass(macros.total_protein_g ?? 0, member?.target_protein_g || 100, "text-primary"))}>
              {Math.round(macros.total_protein_g ?? 0)}<span className="text-[10px] opacity-70">/{member?.target_protein_g || 100}g</span>
            </span>
          </div>
          <div className="flex-1 bg-mint-base/20 rounded-xl p-2 flex flex-col items-center justify-center">
            <span className="text-[9px] font-bold text-mint-dark tracking-wider">FIBER</span>
            <span className={cn("text-xs font-bold mt-0.5", getProgressColorClass(macros.total_fiber_g ?? 0, member?.target_fiber_g || 30, "text-mint-dark"))}>
              {Math.round(macros.total_fiber_g ?? 0)}<span className="text-[10px] opacity-70">/{member?.target_fiber_g || 30}g</span>
            </span>
          </div>
          <div className="flex-1 bg-cyan-base/10 rounded-xl p-2 flex flex-col items-center justify-center">
            <span className="text-[9px] font-bold text-cyan-dark tracking-wider">WATER</span>
            <span className={cn("text-xs font-bold mt-0.5", getProgressColorClass(totalWater, member?.target_water_ml || 2000, "text-cyan-dark"))}>
              {totalWater}<span className="text-[10px] opacity-70">/{member?.target_water_ml || 2000}ml</span>
            </span>
          </div>
        </div>

        {/* Log Water */}
        <section className="bg-card border shadow-sm rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-pale flex items-center justify-center">
              <Droplet className="w-4 h-4 text-cyan-dark fill-cyan-base/50" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-xs">Log Water</h3>
              <p className="text-[10px] text-muted-foreground">+250ml per glass</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSubtractWater} 
              disabled={addingWater || totalWater === 0}
              className="w-8 h-8 rounded-full border border-cyan-light text-cyan-dark flex items-center justify-center active:scale-95 disabled:opacity-50 bg-cyan-pale/50 hover:bg-cyan-pale"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleAddWater(250)}
              disabled={addingWater}
              className="px-3 py-1.5 bg-cyan-base text-white rounded-full text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50 min-w-[70px] justify-center"
            >
              {addingWater ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              {addingWater ? "Adding" : "Glass"}
            </button>
          </div>
        </section>

        {/* Today's Weight Widget */}
        <section className="bg-card border shadow-sm rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <HeartPulse className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-xs">Today's Weight</h3>
              {todayRecord ? (
                <p className="text-[10px] text-muted-foreground">{todayRecord.weight_kg} kg • {todayRecord.body_fat_pct ? `${todayRecord.body_fat_pct}% fat` : 'No fat %'}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">Not logged yet</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setDrawerOpen(true)}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-[10px] uppercase tracking-wider font-bold rounded-full transition-colors"
          >
            {todayRecord ? "Edit" : "Log Now"}
          </button>
        </section>

        {/* Today's Meals */}
        <section className="bg-card border shadow-sm rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <button 
              onClick={() => setMealsExpanded(!mealsExpanded)}
              className="flex items-center gap-2 flex-1 outline-none"
            >
              <h3 className="font-bold text-foreground flex items-center gap-1 text-xs">
                <Utensils className="w-3.5 h-3.5 text-primary" />
                TODAY'S MEALS
              </h3>
              {mealsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
              )}
            </button>
            <Link href="/log" className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors ml-2">
              <Plus className="w-4 h-4" />
            </Link>
          </div>
          
          <motion.div 
            initial={false}
            animate={{ height: mealsExpanded ? "auto" : 0, opacity: mealsExpanded ? 1 : 0 }}
            className="overflow-hidden"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="space-y-3 pt-2">
              {["breakfast", "lunch", "snack", "dinner"].map((slot) => {
                const items = Array.isArray(logs) ? logs.filter(l => l.meal_slot.toLowerCase() === slot) : [];
                return (
                  <div key={slot} className="border-t pt-2 first:border-0 first:pt-0">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{slot}</h4>
                    {items.length > 0 ? (
                      <div className="space-y-1">
                        {items.map(item => (
                          <div key={item.id} className="flex justify-between items-center text-xs">
                            <span className="text-foreground font-medium">{item.food_item}</span>
                            <span className="text-muted-foreground">{item.calories_kcal} kcal</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[9px] font-bold text-muted-foreground/60 uppercase text-right tracking-widest -mt-4">Nothing Logged</div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>

      </main>

      <RecordHealthDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
        existingRecord={todayRecord}
        onSuccess={fetchRecords} 
      />
    </div>
  );
}
