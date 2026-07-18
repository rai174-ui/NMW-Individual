import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminDashboard, getAdminUsers, extendAdminUser, toggleAdminUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, Crown, CalendarPlus, ShieldAlert, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    queryFn: () => getAdminDashboard(),
  });

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => getAdminUsers(),
  });

  const extendMutation = useMutation({
    mutationFn: (memberId: number) => extendAdminUser(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "Extended validity by 30 days." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to extend validity.", variant: "destructive" });
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: ({ memberId, isAdmin }: { memberId: number, isAdmin: boolean }) => toggleAdminUser(memberId, isAdmin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "Admin status updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update admin status.", variant: "destructive" });
    },
  });

  if (loadingDash || loadingUsers) {
    return <div className="p-6">Loading admin data...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 pb-20">
      <div className="bg-primary/5 px-6 py-8 relative">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Manage users and validities.</p>
      </div>

      <div className="p-6 space-y-6 -mt-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex flex-col items-center">
              <Users className="h-6 w-6 text-primary mb-2" />
              <div className="text-2xl font-bold">{dashboard?.total_users || 0}</div>
              <div className="text-xs text-muted-foreground text-center">Total Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center">
              <Activity className="h-6 w-6 text-emerald-500 mb-2" />
              <div className="text-2xl font-bold">{dashboard?.active_today || 0}</div>
              <div className="text-xs text-muted-foreground text-center">Active Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center">
              <Crown className="h-6 w-6 text-amber-500 mb-2" />
              <div className="text-2xl font-bold">{dashboard?.premium_users || 0}</div>
              <div className="text-xs text-muted-foreground text-center">Valid Prem.</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Directory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {users?.map(user => {
                const isValid = new Date(user.valid_until) >= new Date();
                return (
                  <div key={user.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm flex items-center gap-1">
                          {user.name} 
                          {user.is_admin && <ShieldAlert className="h-3 w-3 text-red-500" />}
                        </div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-semibold ${isValid ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isValid ? 'Valid' : 'Expired'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Until {new Date(user.valid_until).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => extendMutation.mutate(user.id)}
                        disabled={extendMutation.isPending}
                        className="flex-1 bg-primary/10 text-primary text-xs py-1.5 rounded-lg flex justify-center items-center gap-1"
                      >
                        <CalendarPlus className="h-3 w-3" /> Extend 30d
                      </button>
                      <button 
                        onClick={() => toggleAdminMutation.mutate({ memberId: user.id, isAdmin: !user.is_admin })}
                        disabled={toggleAdminMutation.isPending}
                        className={`flex-1 text-xs py-1.5 rounded-lg flex justify-center items-center gap-1 ${user.is_admin ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {user.is_admin ? <ShieldAlert className="h-3 w-3" /> : <Check className="h-3 w-3" />} 
                        {user.is_admin ? 'Revoke Admin' : 'Make Admin'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
