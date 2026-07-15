import { useGetMember, getGetMemberQueryKey, useGetDailySummary } from "@workspace/api-client-react";
import { format, isValid } from "date-fns";
import { Link } from "wouter";
import { Plus, LogOut, Utensils, HeartPulse, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-base";
import { RecordHealthDrawer } from "@/components/record-health-drawer";
import { Droplet } from "lucide-react";

function safeFormat(value: string | null | undefined, fmt: string, fallback = "--"): string {
  if (!value) return fallback;
  const d = new Date(value);
  return isValid(d) ? format(d, fmt) : fallback;
}

function todayLocal() { return new Date().toLocaleDateString("en-CA"); }
const TODAY = todayLocal();

// -- Progress Ring ----------------------------------------------------------
function ProgressRing({ value, max, label, color, size = 120, strokeWidth = 8, unit = "" }: any) {
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
          stroke={color}
          strokeLinecap="round"
          className="fill-none drop-shadow-sm"
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

  const { data: member } = useGetMember(memberId!, { query: { enabled: !!memberId } });
  const { data: daily } = useGetDailySummary(memberId!, { date: TODAY }, { query: { enabled: !!memberId } });

  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [waterLogs, setWaterLogs] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addingWater, setAddingWater] = useState(false);

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

  const handleLogout = () => {
    queryClient.clear();
    logout();
  };

  const macros = daily ?? {
    total_kcal: 0, total_protein_g: 0, total_carbs_g: 0, total_fat_g: 0, total_fiber_g: 0
  };

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
              Hi, {member?.name?.split(" ")[0] || "Guest"} ??
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
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold tracking-tight">Today's Nutrition</h2>
          </div>

          <div className="flex items-center justify-center gap-6 mb-6">
            <ProgressRing
              value={macros.total_kcal}
              max={member?.daily_kcal || 2000}
              label="CALORIES"
              color="hsl(var(--primary))"
              size={140}
              strokeWidth={10}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MacroPill label="Protein" value={macros.total_protein_g} max={member?.target_protein_g || 100} colorClass="bg-rose-500" />
            <MacroPill label="Carbs" value={macros.total_carbs_g} max={250} colorClass="bg-amber-500" />
            <MacroPill label="Fat" value={macros.total_fat_g} max={65} colorClass="bg-sky-500" />
            <MacroPill label="Fiber" value={macros.total_fiber_g} max={member?.target_fiber_g || 30} colorClass="bg-emerald-500" />
          </div>
        </section>

        {/* Hydration Tracker */}
        <section className="bg-card border shadow-sm rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Droplet className="w-4 h-4 text-sky-500 fill-sky-500/20" />
              Hydration
            </h2>
            <span className="text-xs font-medium text-muted-foreground">
              {totalWater} / {member?.target_water_ml || 2000} ml
            </span>
          </div>
          
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden mb-5">
            <motion.div
              className="h-full bg-sky-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalWater / (member?.target_water_ml || 2000)) * 100, 100)}%` }}
              transition={{ duration: 1 }}
            />
          </div>

          <div className="flex gap-2">
            {[250, 500].map(amt => (
              <button
                key={amt}
                onClick={() => handleAddWater(amt)}
                disabled={addingWater}
                className="flex-1 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {amt}ml
              </button>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-base font-semibold mb-3 px-1">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/log">
              <div className="flex flex-col items-center justify-center p-4 bg-primary/10 border border-primary/20 rounded-2xl text-primary font-medium active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                  <Utensils className="w-5 h-5" />
                </div>
                <span>Log Meal</span>
              </div>
            </Link>
            
            <Link href="/profile">
              <div className="flex flex-col items-center justify-center p-4 bg-card border shadow-sm rounded-2xl text-foreground font-medium active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <HeartPulse className="w-5 h-5 text-muted-foreground" />
                </div>
                <span>Health Data</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Today's Weight Widget */}
        <section className="bg-card border shadow-sm rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Today's Weight</p>
              {todayRecord ? (
                <p className="text-xs text-muted-foreground">{todayRecord.weight_kg} kg • {todayRecord.body_fat_pct ? `${todayRecord.body_fat_pct}% fat` : 'No fat % logged'}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not logged yet</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setDrawerOpen(true)}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-sm font-medium rounded-lg transition-colors"
          >
            {todayRecord ? "Edit" : "Log Now"}
          </button>
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

