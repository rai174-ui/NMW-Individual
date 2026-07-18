import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2, Target, Sparkles, Crown } from "lucide-react";
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
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiForm, setShowAiForm] = useState(false);

  // AI Form state
  const [gender, setGender] = useState("male");
  const [ethnicity, setEthnicity] = useState("Indian");
  const [activityLevel, setActivityLevel] = useState("moderate");

  const isPremium = member?.valid_until && new Date(member.valid_until) >= new Date(new Date().toISOString().split('T')[0]);

  const handleAiGenerate = async () => {
    if (!isPremium) {
      toast({ title: "Premium Required", description: "Your trial has expired. Renew membership to use AI features.", variant: "destructive" });
      return;
    }
    
    if (!member?.height_cm || !member?.age_at_joining) {
      toast({ title: "Missing Info", description: "Please complete your profile (height & DOB) first.", variant: "destructive" });
      return;
    }
    
    setAiLoading(true);
    try {
      const payload = {
        gender,
        ethnicity,
        activityLevel,
        weight: 70, // Needs weight from last record ideally, using 70 as fallback if no records
        height: member.height_cm,
        age: member.age_at_joining
      };
      
      const res = await apiFetch(`/members/${memberId}/generate-targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate");
      }
      
      const data = await res.json();
      if (data.daily_kcal) setKcal(data.daily_kcal.toString());
      if (data.target_protein_g) setProtein(data.target_protein_g.toString());
      if (data.target_fiber_g) setFiber(data.target_fiber_g.toString());
      if (data.target_water_ml) setWater(data.target_water_ml.toString());
      
      toast({ title: "Targets Generated!", description: "AI has calculated your optimal targets." });
      setShowAiForm(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };


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
            <div className="flex justify-between items-center">
              <DrawerTitle className="text-xl flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                My Daily Targets
              </DrawerTitle>
              <button 
                onClick={() => setShowAiForm(!showAiForm)}
                className="text-xs font-semibold px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg flex items-center gap-1 active:scale-95 transition-transform"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Generate
              </button>
            </div>
            <DrawerDescription>
              Set your personal nutrition and hydration goals.
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="space-y-4 pt-2">
            {showAiForm && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" /> AI Target Calculator
                  {!isPremium && <Crown className="w-4 h-4 text-destructive ml-auto" />}
                </h3>
                
                {!isPremium ? (
                  <div className="text-sm text-destructive font-medium mb-2">
                    Premium trial expired. Renew in profile to unlock AI features.
                  </div>
                ) : (
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Gender</label>
                        <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-3 py-2 bg-background border rounded-lg text-sm outline-none">
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Ethnicity</label>
                        <select value={ethnicity} onChange={e => setEthnicity(e.target.value)} className="w-full px-3 py-2 bg-background border rounded-lg text-sm outline-none">
                          <option value="Indian">Indian</option>
                          <option value="Caucasian">Caucasian</option>
                          <option value="Asian">Asian</option>
                          <option value="African">African</option>
                          <option value="Hispanic">Hispanic</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Activity Level</label>
                      <select value={activityLevel} onChange={e => setActivityLevel(e.target.value)} className="w-full px-3 py-2 bg-background border rounded-lg text-sm outline-none">
                        <option value="sedentary">Sedentary (little to no exercise)</option>
                        <option value="light">Lightly active (1-3 days/week)</option>
                        <option value="moderate">Moderately active (3-5 days/week)</option>
                        <option value="very">Very active (6-7 days/week)</option>
                        <option value="extra">Extra active (very hard exercise/job)</option>
                      </select>
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={handleAiGenerate} 
                  disabled={aiLoading || !isPremium} 
                  className="w-full h-10 text-sm font-semibold rounded-lg"
                >
                  {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Calculate Targets"}
                </Button>
              </div>
            )}

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
