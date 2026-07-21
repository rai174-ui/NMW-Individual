import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Activity, Info, Link as LinkIcon, CheckCircle2 } from "lucide-react";

export function SyncGuide() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="min-h-[100dvh] bg-background pb-20 pt-10 px-4"
    >
      <div className="flex items-center gap-3 mb-6">
        <Link href="/activities" className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Sync Guide</h1>
      </div>

      <section className="bg-card border border-primary/20 rounded-2xl p-5 shadow-sm mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-primary" />
          Missing Activity Data?
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          HealthLogix relies on your device's native health system (Google Health Connect on Android or Apple Health on iOS). 
          If your smartwatch data isn't showing up, it's likely because your wearable's app isn't permitted to share data with the native system.
        </p>
      </section>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider px-1">How to fix your specific wearable</h3>

        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">Z</span>
            Zepp / Amazfit
          </h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
            <li>Open the <strong>Zepp App</strong> on your phone.</li>
            <li>Go to <strong>Profile</strong> &gt; <strong>Add accounts</strong>.</li>
            <li>Select <strong>Google Fit / Health Connect</strong> (Android) or <strong>Apple Health</strong> (iOS).</li>
            <li>Follow the prompts to authorize sharing of Steps and Calories.</li>
          </ol>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">S</span>
            Samsung Health
          </h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
            <li>Open the <strong>Samsung Health</strong> app.</li>
            <li>Tap the <strong>three dots</strong> (top right) &gt; <strong>Settings</strong>.</li>
            <li>Scroll to <strong>Health Connect</strong> and tap it.</li>
            <li>Ensure that Samsung Health is allowed to <strong>write</strong> steps and active energy to Health Connect.</li>
          </ol>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm">G</span>
            Garmin Connect
          </h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
            <li>Open the <strong>Garmin Connect</strong> app.</li>
            <li>Go to <strong>More</strong> &gt; <strong>Settings</strong> &gt; <strong>Connected Apps</strong>.</li>
            <li>Select <strong>Google Health Connect</strong> or <strong>Apple Health</strong> and enable data sharing.</li>
          </ol>
        </div>

        <div className="bg-card border rounded-2xl p-5 shadow-sm">
          <h4 className="font-bold flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-sm">F</span>
            Fitbit
          </h4>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
            <li>Open the <strong>Fitbit App</strong>.</li>
            <li>Tap the <strong>Settings (gear icon)</strong> &gt; <strong>Health Connect</strong> (Android).</li>
            <li>Turn on syncing for Steps and Calories.</li>
          </ol>
        </div>

      </div>

      <div className="mt-8 mb-4">
        <Link href="/activities">
          <button className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            I've fixed it, return to Activities
          </button>
        </Link>
      </div>
    </motion.div>
  );
}
