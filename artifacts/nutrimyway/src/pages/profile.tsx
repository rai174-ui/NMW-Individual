import { useGetMember, getGetMemberQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { LogOut, Info, Activity, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";
import { useState } from "react";
import { TargetsDrawer } from "@/components/targets-drawer";
import { ProfileDrawer } from "@/components/profile-drawer";
import { useQueryClient } from "@tanstack/react-query";

export function Profile() {
  const { memberId: MEMBER_ID, logout } = useAuth();
  const queryClient = useQueryClient();
  const [targetsDrawerOpen, setTargetsDrawerOpen] = useState(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);

  const { data: member } = useGetMember(MEMBER_ID!, {
    query: { enabled: !!MEMBER_ID, queryKey: getGetMemberQueryKey(MEMBER_ID!) }
  });

  const handleTargetsSuccess = () => {
    queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(MEMBER_ID!) });
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[100dvh] bg-background pb-20 pt-10 px-4"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <div className="flex items-center gap-2">
          <Link href="/about" className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors">
            <Info className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* User Info Header */}
      <section className="bg-card border rounded-2xl p-5 shadow-sm mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border border-primary/20 shrink-0">
          {getInitials(member?.name ?? member?.email ?? undefined)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">
            {member?.name || "User"}
          </h2>
          <p className="text-sm text-muted-foreground truncate">{member?.email || "user@example.com"}</p>
          <div className="flex gap-2 mt-3">
            <button 
              onClick={() => setProfileDrawerOpen(true)}
              className="text-xs font-medium px-3 py-1.5 bg-primary/10 text-primary rounded-lg active:scale-95 transition-transform"
            >
              Edit Profile
            </button>
            <button 
              onClick={() => logout()}
              className="text-xs font-medium px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg active:scale-95 transition-transform flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </section>

      {/* Target Settings */}
      <section className="bg-card border rounded-2xl p-5 shadow-sm mb-6">
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

      <TargetsDrawer
        open={targetsDrawerOpen}
        onOpenChange={setTargetsDrawerOpen}
        member={member}
        onSuccess={handleTargetsSuccess}
      />

      <ProfileDrawer
        open={profileDrawerOpen}
        onOpenChange={setProfileDrawerOpen}
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
