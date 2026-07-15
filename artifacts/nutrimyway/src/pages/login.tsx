import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-base";

async function apiRequest(method: string, path: string, body?: any) {
  const cleanPath = path.startsWith('/api') ? path.slice(4) : path;
  return await apiFetch(cleanPath, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function Login() {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [otp, setOtp] = useState("");

  const { login } = useAuth();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "register") {
        const res = await apiRequest("POST", "/api/auth/register", { name, email, password });
        const data = await res.json();
        login(data.token, data.member.id);
        toast({ title: "Account created", description: "Welcome to NutriMyWay!" });
      } else if (mode === "login") {
        const res = await apiRequest("POST", "/api/auth/login", { email, password });
        const data = await res.json();
        login(data.token, data.member.id);
        toast({ title: "Logged in", description: "Welcome back!" });
      } else if (mode === "reset") {
        if (!otpSent) {
          const res = await apiRequest("POST", "/api/auth/request-password-reset", { email });
          const data = await res.json();
          setOtpSent(true);
          setOtpToken(data.otp_token ?? data.dev_otp_token);
          toast({ title: "Reset Code Sent", description: "Check your email for the reset code." });
        } else {
          await apiRequest("POST", "/api/auth/reset-password", { otp_token: otpToken, otp, new_password: password });
          toast({ title: "Password Reset", description: "Your password has been successfully reset. Please log in." });
          setMode("login");
          setOtpSent(false);
          setPassword("");
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40">
      <Card className="w-full max-w-md card-shadow-none sm:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {mode === "login" ? "Log in" : mode === "register" ? "Create Account" : "Reset Password"}
          </CardTitle>
          <CardDescription>
            {mode === "login" && "Enter your email and password to access your account."}
            {mode === "register" && "Sign up to start tracking your health journey."}
            {mode === "reset" && !otpSent && "Enter your email to receive a reset code."}
            {mode === "reset" && otpSent && "Enter the reset code sent to your email and your new password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            
            {(!otpSent || mode !== "reset") && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            )}

            {mode === "reset" && otpSent && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Reset Code</label>
                <Input type="text" placeholder="6-digit code" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} required />
              </div>
            )}

            {(mode === "login" || mode === "register" || (mode === "reset" && otpSent)) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{mode === "reset" ? "New Password" : "Password"}</label>
                <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Loading..." : mode === "login" ? "Log in" : mode === "register" ? "Create Account" : (!otpSent ? "Send Reset Code" : "Reset Password")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-sm text-center text-muted-foreground">
          {mode === "login" && (
            <>
              <button type="button" onClick={() => setMode("register")} className="hover:text-primary transition-colors">
                Don't have an account? Sign up
              </button>
              <button type="button" onClick={() => setMode("reset")} className="hover:text-primary transition-colors">
                Forgot password?
              </button>
            </>
          )}
          {mode === "register" && (
            <button type="button" onClick={() => setMode("login")} className="hover:text-primary transition-colors">
              Already have an account? Log in
            </button>
          )}
          {mode === "reset" && (
            <button type="button" onClick={() => { setMode("login"); setOtpSent(false); }} className="hover:text-primary transition-colors">
              Back to log in
            </button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

