import { useState, useEffect, useCallback, useMemo } from "react";
import { format, isValid } from "date-fns";
import { motion } from "framer-motion";
import { Plus, HeartPulse, Activity, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api-base";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { RecordHealthDrawer } from "@/components/record-health-drawer";

function safeFormat(value: string | null | undefined, fmt: string, fallback = "--"): string {
  if (!value) return fallback;
  const d = new Date(value);
  return isValid(d) ? format(d, fmt) : fallback;
}

export function Health() {
  const { memberId: MEMBER_ID } = useAuth();
  const [healthRecords, setHealthRecords] = useState<any[]>([]);
  const [chartMetric, setChartMetric] = useState<"weight_kg" | "body_fat_pct">("weight_kg");
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        <div className="bg-card border shadow-sm rounded-lg p-2 text-xs">
          <p className="font-semibold">{label}</p>
          <p className="text-primary font-bold">
            {payload[0].value} {chartMetric === "weight_kg" ? "kg" : "%"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[100dvh] bg-background pb-20 pt-10 px-4"
    >
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-foreground">My Health Record</h1>
        <button 
          onClick={() => setDrawerOpen(true)}
          className="p-2 bg-primary text-primary-foreground rounded-full active:scale-95 transition-transform shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium w-fit flex items-center gap-1.5 mb-6 border border-primary/20">
        <MapPin className="w-3.5 h-3.5" />
        My Profile Account
      </div>

      <section className="bg-card border rounded-2xl p-5 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold tracking-wider text-foreground uppercase">
            TRENDS
          </h2>
        </div>
        
        {healthRecords.length > 0 && (
          <div className="mb-2">
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
      </section>

      <section className="bg-card border rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold tracking-wider text-foreground uppercase mb-4">
          PROGRESS HISTORY
        </h2>
        
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
    </motion.div>
  );
}
