import { useGetMember, getGetMemberQueryKey, useGetDailySummary, getGetDailySummaryQueryKey, useGetConsumptionLogs, getGetConsumptionLogsQueryKey, useGetActivities, getGetActivitiesQueryKey } from "@workspace/api-client-react";
import { format, isValid } from "date-fns";
import { Link } from "wouter";
import { Plus, Minus, LogOut, Utensils, HeartPulse, User, Loader2, Activity, Droplet, RefreshCw } from "lucide-react";
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
function ProgressRing({ value, max, label, color, colorClass, size = 120, strokeWidth = 8, unit = "" }: any) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference - pct * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted/40 fill-none"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
          stroke={colorClass ? undefined : color}
          strokeLinecap="round"
          className={cn("fill-none drop-shadow-sm", colorClass)}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tracking-tight text-foreground">
          {Math.round(value)}
          {unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>}
        </span>
        {label && <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">{label}</span>}
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
    <div className="min-h-[100dvh] bg-background pb-20">
      {/* Header Profile Section */}
      <header className="bg-card px-4 pt-12 pb-6 rounded-b-3xl shadow-sm border-b relative z-10">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {format(new Date(), "EEEE, MMMM do")}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
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

      <main className="px-4 -mt-2 pt-6 flex flex-col gap-6">
        
        {/* Main Nutrition Card */}
        <section className="bg-card border shadow-sm rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10" />
          
          <div className="flex gap-4 items-center">
            <div className="w-1/2 flex flex-col items-center justify-center">
              <ProgressRing
                value={macros.total_kcal}
                max={adjustedTarget}
                label="KCAL"
                colorClass={getProgressColorClass(macros.total_kcal ?? 0, adjustedTarget, "stroke-primary")}
                size={140}
                strokeWidth={10}
              />
              {burned > 0 && (
                <div className="mt-2 text-[10px] font-medium text-muted-foreground flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-full">
                  <Activity className="w-3 h-3 text-primary/70" />
                  <span>{baseTarget} + {burned}</span>
                </div>
              )}
            </div>
            <div className="w-1/2 flex flex-col justify-center gap-3 pr-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-semibold tracking-wider text-xs">PROTEIN</span>
                <span className="font-bold">{Math.round(macros.total_protein_g ?? 0)}g</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-semibold tracking-wider text-xs">FIBER</span>
                <span className="font-bold">{Math.round(macros.total_fiber_g ?? 0)}g</span>
              </div>
            </div>
          </div>
        </section>

        {/* Target Pills */}
        <div className="flex gap-2">
          <div className="flex-1 bg-primary/10 rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-primary tracking-wider">PROTEIN</span>
            <span className={cn("text-sm font-bold mt-0.5", getProgressColorClass(macros.total_protein_g ?? 0, member?.target_protein_g || 100, "text-primary"))}>
              {Math.round(macros.total_protein_g ?? 0)}<span className="text-xs opacity-70">/{member?.target_protein_g || 100}g</span>
            </span>
          </div>
          <div className="flex-1 bg-indigo-500/10 rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-indigo-600 tracking-wider">FIBER</span>
            <span className={cn("text-sm font-bold mt-0.5", getProgressColorClass(macros.total_fiber_g ?? 0, member?.target_fiber_g || 30, "text-indigo-600"))}>
              {Math.round(macros.total_fiber_g ?? 0)}<span className="text-xs opacity-70">/{member?.target_fiber_g || 30}g</span>
            </span>
          </div>
          <div className="flex-1 bg-indigo-500/10 rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-indigo-600 tracking-wider">WATER</span>
            <span className={cn("text-sm font-bold mt-0.5", getProgressColorClass(totalWater, member?.target_water_ml || 2000, "text-indigo-600"))}>
              {totalWater}<span className="text-xs opacity-70">/{member?.target_water_ml || 2000}ml</span>
            </span>
          </div>
        </div>

        {/* Log Water */}
        <section className="bg-card border shadow-sm rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Droplet className="w-5 h-5 text-indigo-500 fill-indigo-500/50" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Log Water</h3>
              <p className="text-xs text-muted-foreground">+250ml per glass</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSubtractWater} 
              disabled={addingWater || totalWater === 0}
              className="w-10 h-10 rounded-full border border-indigo-200 text-indigo-500 flex items-center justify-center active:scale-95 disabled:opacity-50 bg-indigo-50/50 hover:bg-indigo-50"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleAddWater(250)}
              disabled={addingWater}
              className="px-4 py-2 bg-indigo-500 text-white rounded-full text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50 min-w-[100px] justify-center"
            >
              {addingWater ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {addingWater ? "Adding..." : "Glass"}
            </button>
          </div>
        </section>

        {/* Today's Weight Widget */}
        <section className="bg-card border shadow-sm rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Today's Weight</h3>
              {todayRecord ? (
                <p className="text-xs text-muted-foreground">{todayRecord.weight_kg} kg • {todayRecord.body_fat_pct ? `${todayRecord.body_fat_pct}% fat` : 'No fat % logged'}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not logged yet</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setDrawerOpen(true)}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-sm font-semibold rounded-full transition-colors"
          >
            {todayRecord ? "Edit" : "Log Now"}
          </button>
        </section>

        {/* Today's Meals */}
        <section className="bg-card border shadow-sm rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Utensils className="w-4 h-4 text-primary" />
              TODAY'S MEALS
            </h3>
            <Link href="/log" className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors">
              <Plus className="w-5 h-5" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {["breakfast", "lunch", "snack", "dinner"].map((slot) => {
              const items = logs?.filter(l => l.meal_slot.toLowerCase() === slot) || [];
              return (
                <div key={slot} className="border-t pt-3 first:border-0 first:pt-0">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{slot}</h4>
                  {items.length > 0 ? (
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <span className="text-foreground">{item.food_item}</span>
                          <span className="text-muted-foreground">{item.calories_kcal} kcal</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-muted-foreground/60 uppercase text-right tracking-widest -mt-6">Nothing Logged</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Calories Burnt Today */}
        <section className="bg-card border shadow-sm rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Calories Burnt Today</h3>
              <p className="text-xs text-muted-foreground">From physical activities</p>
            </div>
          </div>
          <div className="text-lg font-black text-orange-500">{burned} <span className="text-sm font-bold opacity-70">kcal</span></div>
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
