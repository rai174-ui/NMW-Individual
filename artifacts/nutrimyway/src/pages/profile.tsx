import { useGetMember, getGetMemberQueryKey } from "@workspace/api-client-react";
import { format, isValid } from "date-fns";
import { motion } from "framer-motion";
import { LogOut, Info, HeartPulse, Activity } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";
import { useEffect, useState, useMemo, useCallback } from "react";
import { apiFetch } from "@/lib/api-base";
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import { RecordHealthDrawer } from "@/components/record-health-drawer";
import { TargetsDrawer } from "@/components/targets-drawer";
import { useQueryClient } from "@tanstack/react-query";

function safeFormat(value: string | null | undefined, fmt: string, fallback = "--"): string {
  if (!value) return fallback;
  const d = new Date(value);
  return isValid(d) ? format(d, fmt) : fallback;
}

export function Profile() {
  const { memberId: MEMBER_ID, logout } = useAuth();
  const queryClient = useQueryClient();
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [chartMetric, setChartMetric] = useState<"weight_kg" | "body_fat_pct">("weight_kg");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [targetsDrawerOpen, setTargetsDrawerOpen] = useState(false);

  const fetchRecords = useCallback(() => {
    if (MEMBER_ID) {
      apiFetch(`/members/${MEMBER_ID}/health-records`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setHealthRecords(data);
        })
        .catch(console.error);
    }
  }, [MEMBER_ID]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const { data: member } = useGetMember(MEMBER_ID!, {
    query: { enabled: !!MEMBER_ID }
  });

  const handleTargetsSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(MEMBER_ID!) });
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const chartData = useMemo(() => {
    return [...healthRecords]
      .filter(r => r[chartMetric] != null)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map(r => ({
        ...r,
        formattedDate: safeFormat(r.recorded_at, "MMM d"),
      }));
  }, [healthRecords, chartMetric]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border shadow-sm rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">{label}</p>
          <p className="text-primary font-bold">
            {payload[0].value} {chartMetric === "weight_kg" ? "kg" : "%"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-4 space-y-6 pb-24">
      <header className="pt-8 pb-4 flex flex-col items-center text-center space-y-3 relative">
        <Link
          href="/about"
          className="absolute top-4 left-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="About"
        >
          <Info className="w-3.5 h-3.5" />
          About
        </Link>
        <button
          onClick={logout}
          className="absolute top-4 right-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Log out"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log out
        </button>
        <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-3xl font-bold">
          {getInitials(member?.name)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{member?.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
            {member?.email}
            {member?.height_cm && (
              <>
                <span className="text-border">•</span>
                <span>{member.height_cm} cm</span>
              </>
            )}
          </p>
        </div>
      </header>

      {/* Account Info Card */}
      <section className="bg-card border rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <UserIcon className="w-4 h-4 text-primary" />
          Account Details
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground">Joined</span>
            <span className="font-medium">{safeFormat(member?.date_of_joining, "MMMM do, yyyy")}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
        </div>
      </section>

      {/* Targets Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            My Daily Targets
          </h2>
          <button 
            onClick={() => setTargetsDrawerOpen(true)}
            className="text-xs text-primary font-medium px-2 py-1 bg-primary/10 rounded-lg active:scale-95 transition-transform"
          >
            Edit Targets
          </button>
        </div>
        <div className="bg-card border rounded-2xl p-4 shadow-sm grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Calories</span>
            <span className="text-base font-bold">{member?.daily_kcal || "--"} <span className="text-xs font-normal text-muted-foreground">kcal</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Protein</span>
            <span className="text-base font-bold">{member?.target_protein_g || "--"} <span className="text-xs font-normal text-muted-foreground">g</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Fiber</span>
            <span className="text-base font-bold">{member?.target_fiber_g || "--"} <span className="text-xs font-normal text-muted-foreground">g</span></span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Water</span>
            <span className="text-base font-bold">{member?.target_water_ml || "--"} <span className="text-xs font-normal text-muted-foreground">ml</span></span>
          </div>
        </div>
      </section>

      {/* Health Records */}
      <section className="bg-card border rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Health History
          </h2>
          <button 
            onClick={() => setDrawerOpen(true)}
            className="text-xs text-primary font-medium px-2 py-1 bg-primary/10 rounded-lg active:scale-95 transition-transform"
          >
            Record My Health
          </button>
        </div>
        
        {healthRecords.length > 0 && (
          <div className="mb-6">
            <div className="flex bg-muted/40 p-1 rounded-xl mb-4 w-fit">
              <button
                onClick={() => setChartMetric("weight_kg")}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${chartMetric === "weight_kg" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Weight
              </button>
              <button
                onClick={() => setChartMetric("body_fat_pct")}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${chartMetric === "body_fat_pct" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Body Fat
              </button>
            </div>
            
            {chartData.length > 1 ? (
              <div className="h-48 w-full -ml-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="formattedDate" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                      dy={10}
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey={chartMetric} 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorMetric)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-xl">
                Need at least 2 logs to show a chart.
              </div>
            )}
          </div>
        )}

        {!healthRecords || healthRecords.length === 0 ? (
          <div className="py-8 text-center bg-muted/30 rounded-xl border border-dashed">
            <HeartPulse className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No health records found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {healthRecords.map((r: any) => (
              <div key={r.id} className="flex flex-col p-3 rounded-xl bg-muted/30 border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">{safeFormat(r.recorded_at, "MMM do, yyyy h:mm a")}</span>
                  {r.weight_kg && <span className="text-sm font-bold">{r.weight_kg} kg</span>}
                </div>
                {r.notes && <p className="text-sm text-foreground mt-1">{r.notes}</p>}
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {r.body_fat_pct != null && <div className="text-xs"><span className="text-muted-foreground">Fat:</span> {r.body_fat_pct}%</div>}
                  {r.bmi != null && <div className="text-xs"><span className="text-muted-foreground">BMI:</span> {r.bmi}</div>}
                  {r.metabolic_age != null && <div className="text-xs"><span className="text-muted-foreground">Met Age:</span> {r.metabolic_age}y</div>}
                  {r.resting_hr != null && <div className="text-xs"><span className="text-muted-foreground">RHR:</span> {r.resting_hr} bpm</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <RecordHealthDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
        onSuccess={fetchRecords} 
      />

      <TargetsDrawer
        open={targetsDrawerOpen}
        onOpenChange={setTargetsDrawerOpen}
        member={member}
        onSuccess={handleTargetsSuccess}
      />
    </motion.div>
  );
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
