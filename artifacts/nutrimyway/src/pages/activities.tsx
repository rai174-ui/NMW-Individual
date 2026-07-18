import { useAuth } from "@/contexts/auth-context";
import { useGetActivities, getGetActivitiesQueryKey } from "@workspace/api-client-react";
import { Activity, Plus, RefreshCw, Trash2, Loader2, Flame } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { syncActivities } from "@/lib/activity-sync";
import { useToast } from "@/hooks/use-toast";
import { LogActivityDrawer } from "@/components/log-activity-drawer";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api-base";
import { cn } from "@/lib/utils";

export function Activities() {
  const { memberId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const today = format(new Date(), "yyyy-MM-dd");
  
  const { data: activities, isLoading, refetch: refetchActivities } = useGetActivities(
    memberId || 0,
    { date: today },
    { query: { enabled: !!memberId, queryKey: getGetActivitiesQueryKey(memberId || 0, { date: today }) } }
  );

  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [syncingActivities, setSyncingActivities] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSyncActivities = async (silent = false) => {
    if (!memberId) return;
    setSyncingActivities(true);
    try {
      const success = await syncActivities(memberId);
      if (success) {
        if (!silent) {
          toast({
            title: "Activities Synced",
            description: "Successfully fetched data from Health Connect / HealthKit.",
          });
        }
        queryClient.invalidateQueries({ queryKey: getGetActivitiesQueryKey(memberId, { date: today }) });
      } else if (!silent) {
        toast({
          variant: "destructive",
          title: "Sync Failed",
          description: "Could not sync health data. Please check permissions.",
        });
      }
    } catch (error) {
      if (!silent) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred during sync.",
        });
      }
    } finally {
      setSyncingActivities(false);
    }
  };

  useEffect(() => {
    if (memberId) {
      handleSyncActivities(true);
    }
  }, [memberId]);

  const handleDeleteActivity = async (activityId: number) => {
    if (!memberId) return;
    setDeletingId(activityId);
    try {
      await apiFetch(`/api/members/${memberId}/activities/${activityId}`, {
        method: "DELETE",
      });
      toast({
        title: "Activity removed",
        description: "The activity has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: getGetActivitiesQueryKey(memberId, { date: today }) });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete activity",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const totalCaloriesBurnt = activities?.reduce((acc, curr) => acc + (curr.calories_burned || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activities</h1>
          <p className="text-muted-foreground text-sm">
            {format(new Date(), "EEEE, MMMM do")}
          </p>
        </div>
      </header>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-3">
          <Flame className="w-8 h-8 text-primary" />
        </div>
        <div className="text-3xl font-black text-primary">{totalCaloriesBurnt}</div>
        <div className="text-sm font-medium text-primary/80 uppercase tracking-wider">Kcal Burnt Today</div>
      </div>

      <section className="bg-card border shadow-sm rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            TODAY'S ACTIVITIES
          </h3>
          <div className="flex gap-2">
            {Capacitor.isNativePlatform() && (
              <button 
                onClick={() => handleSyncActivities(false)} 
                disabled={syncingActivities}
                className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-50"
                title="Sync Health Data"
              >
                <RefreshCw className={cn("w-5 h-5", syncingActivities && "animate-spin")} />
              </button>
            )}
            <button onClick={() => setActivityDrawerOpen(true)} className="p-1 text-primary hover:bg-primary/10 rounded-full transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {activities && activities.length > 0 ? (
            activities.map((act) => (
              <div key={act.id} className="flex justify-between items-center py-2 border-b border-border last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-sm capitalize">{act.activity_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {act.duration_minutes ? `${act.duration_minutes} min` : (act.source === 'health_connect' ? 'Synced from Health' : 'Manual entry')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">{act.calories_burned} kcal</span>
                  <button 
                    onClick={() => handleDeleteActivity(act.id)}
                    disabled={deletingId === act.id}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    {deletingId === act.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No activities logged today.
            </p>
          )}
        </div>
      </section>

      <LogActivityDrawer 
        open={activityDrawerOpen} 
        onOpenChange={setActivityDrawerOpen} 
        onSuccess={() => refetchActivities()}
      />
    </div>
  );
}
