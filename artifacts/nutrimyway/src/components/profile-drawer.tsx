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
  const [height, setHeight] = useState(member?.height_cm?.toString() || "");
  const [mobile, setMobile] = useState(member?.mobile || "");
  const [dob, setDob] = useState(member?.dob || "");
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(member?.name || "");
      setHeight(member?.height_cm?.toString() || "");
      setMobile(member?.mobile || "");
      setDob(member?.dob || "");
    }
  }, [open, member]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        name,
        height_cm: height ? Number(height) : null,
        mobile: mobile || null,
        dob: dob || null,
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
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Height (cm)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 175"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
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
