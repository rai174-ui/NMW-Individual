import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2, Target } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";

interface TargetsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: any;
  onSuccess: () => void;
}

export function TargetsDrawer({ open, onOpenChange, member, onSuccess }: TargetsDrawerProps) {
  const { memberId } = useAuth();
  const { toast } = useToast();
  
  const [kcal, setKcal] = useState(member?.daily_kcal?.toString() || "");
  const [protein, setProtein] = useState(member?.target_protein_g?.toString() || "");
  const [fiber, setFiber] = useState(member?.target_fiber_g?.toString() || "");
  const [water, setWater] = useState(member?.target_water_ml?.toString() || "");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setKcal(member?.daily_kcal?.toString() || "");
      setProtein(member?.target_protein_g?.toString() || "");
      setFiber(member?.target_fiber_g?.toString() || "");
      setWater(member?.target_water_ml?.toString() || "");
    }
  }, [open, member]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        daily_kcal: kcal ? Number(kcal) : null,
        target_protein_g: protein ? Number(protein) : null,
        target_fiber_g: fiber ? Number(fiber) : null,
        target_water_ml: water ? Number(water) : null,
      };

      const res = await apiFetch(`/members/${memberId}/targets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to save targets");
      
      toast({ title: "Targets updated!" });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-md pb-6 px-4">
          <DrawerHeader className="px-0 pt-4 text-left">
            <DrawerTitle className="text-xl flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              My Daily Targets
            </DrawerTitle>
            <DrawerDescription>
              Set your personal nutrition and hydration goals.
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Calories (kcal)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 2000"
                value={kcal}
                onChange={e => setKcal(e.target.value)}
                className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-lg"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Protein (g)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 150"
                  value={protein}
                  onChange={e => setProtein(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-lg"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Fiber (g)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 30"
                  value={fiber}
                  onChange={e => setFiber(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Water (ml)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 3000"
                value={water}
                onChange={e => setWater(e.target.value)}
                className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-lg"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pt-6">
            <Button onClick={handleSave} disabled={loading} className="h-12 text-base font-semibold rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Targets"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="h-12 rounded-xl border-border">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
