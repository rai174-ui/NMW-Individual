import { useGetMember } from "@workspace/api-client-react";
import { format, isValid } from "date-fns";
import { motion } from "framer-motion";
import { LogOut, Info, HeartPulse, Activity } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-base";

function safeFormat(value: string | null | undefined, fmt: string, fallback = "--"): string {
  if (!value) return fallback;
  const d = new Date(value);
  return isValid(d) ? format(d, fmt) : fallback;
}

export function Profile() {
  const { memberId: MEMBER_ID, logout } = useAuth();
  const [healthRecords, setHealthRecords] = useState<any[]>([]);

  const { data: member } = useGetMember(MEMBER_ID!, {
    query: { enabled: !!MEMBER_ID }
  });

  useEffect(() => {
    if (MEMBER_ID) {
      apiFetch(`/members/${MEMBER_ID}/health-records`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setHealthRecords(data);
        })
        .catch(console.error);
    }
  }, [MEMBER_ID]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
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

      {/* Health Records */}
      <section className="bg-card border rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Health History
          </h2>
          <Link href="/log" className="text-xs text-primary font-medium">Add Log</Link>
        </div>
        
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
