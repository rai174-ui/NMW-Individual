import { useState, useEffect, useCallback, useMemo } from "react";
import { format, isValid } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, HeartPulse, Activity, MapPin, ChevronDown, ChevronUp } from "lucide-react";
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
  const [weightHistoryOpen, setWeightHistoryOpen] = useState(false);
  const [fatHistoryOpen, setFatHistoryOpen] = useState(false);

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

      <div className="space-y-4">
        {/* Weight Progress Section */}
        <section className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <button 
            onClick={() => setWeightHistoryOpen(!weightHistoryOpen)}
            className="w-full p-5 flex justify-between items-center bg-card hover:bg-muted/30 transition-colors"
          >
            <h2 className="text-sm font-semibold tracking-wider text-foreground uppercase">
              WEIGHT PROGRESS
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                {healthRecords.filter(r => r.weight_kg != null).length} items
              </span>
              {weightHistoryOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
          </button>
          
          <AnimatePresence>
            {weightHistoryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 pt-0 border-t bg-muted/10">
                  {healthRecords.filter(r => r.weight_kg != null).length === 0 ? (
                    <div className="py-8 text-center bg-muted/30 rounded-xl border border-dashed">
                      <HeartPulse className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No weight records found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {healthRecords.filter(r => r.weight_kg != null).map((r: any) => (
                        <div key={r.id} className="flex flex-col p-3 rounded-xl bg-card border shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-muted-foreground">{safeFormat(r.recorded_at, "MMM do, yyyy h:mm a")}</span>
                            <span className="text-sm font-bold text-foreground">{r.weight_kg} kg</span>
                          </div>
                          {r.notes && <p className="text-sm text-muted-foreground mt-1">{r.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Fat Progress Section */}
        <section className="bg-card border rounded-2xl shadow-sm overflow-hidden">
          <button 
            onClick={() => setFatHistoryOpen(!fatHistoryOpen)}
            className="w-full p-5 flex justify-between items-center bg-card hover:bg-muted/30 transition-colors"
          >
            <h2 className="text-sm font-semibold tracking-wider text-foreground uppercase">
              FAT PROGRESS
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                {healthRecords.filter(r => r.body_fat_pct != null).length} items
              </span>
              {fatHistoryOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
          </button>
          
          <AnimatePresence>
            {fatHistoryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 pt-0 border-t bg-muted/10">
                  {healthRecords.filter(r => r.body_fat_pct != null).length === 0 ? (
                    <div className="py-8 text-center bg-muted/30 rounded-xl border border-dashed">
                      <HeartPulse className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No fat records found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {healthRecords.filter(r => r.body_fat_pct != null).map((r: any) => (
                        <div key={r.id} className="flex flex-col p-3 rounded-xl bg-card border shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-muted-foreground">{safeFormat(r.recorded_at, "MMM do, yyyy h:mm a")}</span>
                            <span className="text-sm font-bold text-foreground">{r.body_fat_pct}%</span>
                          </div>
                          {r.notes && <p className="text-sm text-muted-foreground mt-1">{r.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <RecordHealthDrawer 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen} 
        onSuccess={fetchRecords} 
      />
    </motion.div>
  );
}
