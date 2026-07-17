import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2, Activity } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useCreateActivity } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface LogActivityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const COMMON_ACTIVITIES = ["Walking", "Running", "Cycling", "Swimming", "Weightlifting", "Yoga"];

export function LogActivityDrawer({ open, onOpenChange, onSuccess }: LogActivityDrawerProps) {
  const { memberId } = useAuth();
  const { toast } = useToast();
  const { mutateAsync: createActivity } = useCreateActivity();
  
  const [activityType, setActivityType] = useState("");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!activityType) {
      toast({ title: "Error", description: "Please enter an activity type.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      await createActivity({
        memberId: memberId!,
        data: {
          activity_type: activityType,
          duration_minutes: duration ? parseInt(duration) : null,
          calories_burned: calories ? parseFloat(calories) : null,
          source: "manual"
        }
      });
      toast({ title: "Success", description: "Activity logged successfully." });
      setActivityType("");
      setDuration("");
      setCalories("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to log activity", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4">
        <DrawerHeader className="px-0 pt-6">
          <DrawerTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Log Activity
          </DrawerTitle>
          <DrawerDescription>Add a physical activity manually.</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Activity Type</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {COMMON_ACTIVITIES.map(act => (
                <button
                  key={act}
                  onClick={() => setActivityType(act)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    activityType === act ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              placeholder="e.g. Hiking, Tennis" 
              className="w-full h-11 px-4 bg-muted/50 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              value={activityType}
              onChange={e => setActivityType(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Duration (mins)</label>
              <input 
                type="number" 
                placeholder="0" 
                className="w-full h-11 px-4 bg-muted/50 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                value={duration}
                onChange={e => setDuration(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Calories Burned</label>
              <input 
                type="number" 
                placeholder="0 kcal" 
                className="w-full h-11 px-4 bg-muted/50 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                value={calories}
                onChange={e => setCalories(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DrawerFooter className="px-0 pb-8">
          <Button onClick={handleSave} disabled={loading} className="w-full h-12 rounded-xl text-base font-medium">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Activity"}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full h-12 rounded-xl text-base font-medium">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
