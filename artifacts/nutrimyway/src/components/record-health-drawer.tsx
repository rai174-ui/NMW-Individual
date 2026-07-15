import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2, Scale } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";

interface RecordHealthDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRecord?: any;
  onSuccess: () => void;
}

export function RecordHealthDrawer({ open, onOpenChange, existingRecord, onSuccess }: RecordHealthDrawerProps) {
  const { memberId } = useAuth();
  const { toast } = useToast();
  
  const [weight, setWeight] = useState(existingRecord?.weight_kg?.toString() || "");
  const [bodyFat, setBodyFat] = useState(existingRecord?.body_fat_pct?.toString() || "");
  const [notes, setNotes] = useState(existingRecord?.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!weight) {
      toast({ title: "Weight is required", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        weight_kg: Number(weight),
        body_fat_pct: bodyFat ? Number(bodyFat) : null,
        notes: notes || null
      };

      const url = existingRecord 
        ? `/members/${memberId}/health-records/${existingRecord.id}`
        : `/members/${memberId}/health-records`;
        
      const res = await apiFetch(url, {
        method: existingRecord ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to save record");
      
      toast({ title: "Health data saved!" });
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
              <Scale className="w-5 h-5 text-primary" />
              {existingRecord ? "Edit Today's Health" : "Record My Health"}
            </DrawerTitle>
            <DrawerDescription>
              Track your body weight and body fat percentage.
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 70.5"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-lg"
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Body Fat (%)</label>
              <input
                type="number"
                step="0.1"
                placeholder="Optional"
                value={bodyFat}
                onChange={e => setBodyFat(e.target.value)}
                className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-lg"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Notes</label>
              <input
                type="text"
                placeholder="e.g. Feeling great, post-workout"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none text-base"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pt-6">
            <Button onClick={handleSave} disabled={loading || !weight} className="h-12 text-base font-semibold rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save"}
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
