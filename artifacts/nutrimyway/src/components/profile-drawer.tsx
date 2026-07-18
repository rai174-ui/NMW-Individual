import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Loader2, User } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";

interface ProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: any;
  onSuccess: () => void;
}

export function ProfileDrawer({ open, onOpenChange, member, onSuccess }: ProfileDrawerProps) {
  const { memberId } = useAuth();
  const { toast } = useToast();
  

  const [name, setName] = useState(member?.name || "");
  const [heightUnit, setHeightUnit] = useState<"cm" | "in">("cm");
  const [heightDisplay, setHeightDisplay] = useState(member?.height_cm?.toString() || "");
  const [mobile, setMobile] = useState(member?.mobile || "");
  const [dob, setDob] = useState(member?.dob || "");
  const [gender, setGender] = useState(member?.gender || "");

  
  const [loading, setLoading] = useState(false);

  useEffect(() => {

    if (open) {
      setName(member?.name || "");
      const baseHeight = member?.height_cm;
      if (baseHeight) {
        setHeightDisplay(heightUnit === "in" ? (baseHeight / 2.54).toFixed(1).replace(/\.0$/, "") : baseHeight.toString());
      } else {
        setHeightDisplay("");
      }
      setMobile(member?.mobile || "");
      setDob(member?.dob || "");
      setGender(member?.gender || "");
    }

  }, [open, member]);


  const handleUnitToggle = (unit: "cm" | "in") => {
    if (unit === heightUnit) return;
    if (heightDisplay) {
      const val = parseFloat(heightDisplay);
      if (!isNaN(val)) {
        if (unit === "in") {
          // cm to in
          setHeightDisplay((val / 2.54).toFixed(1).replace(/\.0$/, ""));
        } else {
          // in to cm
          setHeightDisplay((val * 2.54).toFixed(1).replace(/\.0$/, ""));
        }
      }
    }
    setHeightUnit(unit);
  };

  const handleSave = async () => {
    setLoading(true);
    try {

      let finalHeightCm = null;
      if (heightDisplay) {
        const val = parseFloat(heightDisplay);
        if (!isNaN(val)) {
          finalHeightCm = heightUnit === "in" ? val * 2.54 : val;
        }
      }

      const payload = {
        name,
        height_cm: finalHeightCm,
        mobile: mobile || null,
        dob: dob || null,
        gender: gender || null,
      };


      const res = await apiFetch(`/members/${memberId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to save profile");
      
      toast({ title: "Profile updated!" });
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
              <User className="w-5 h-5 text-primary" />
              Edit Profile
            </DrawerTitle>
            <DrawerDescription>
              Update your personal details.
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Full Name</label>
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-lg"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Height</label>
                  <div className="flex bg-muted rounded-md overflow-hidden border border-border/50 text-[10px] font-bold">
                    <button 
                      onClick={() => handleUnitToggle("cm")}
                      className={`px-2 py-0.5 transition-colors ${heightUnit === "cm" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/80'}`}
                    >
                      CM
                    </button>
                    <button 
                      onClick={() => handleUnitToggle("in")}
                      className={`px-2 py-0.5 transition-colors ${heightUnit === "in" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/80'}`}
                    >
                      IN
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder={heightUnit === "cm" ? "e.g. 175" : "e.g. 68.5"}
                  value={heightDisplay}
                  onChange={e => setHeightDisplay(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={e => setDob(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Gender</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/40 border rounded-xl focus:border-primary outline-none font-medium text-lg text-foreground appearance-none"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>

          <DrawerFooter className="px-0 pt-6">
            <Button onClick={handleSave} disabled={loading || !name} className="h-12 text-base font-semibold rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Profile"}
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
