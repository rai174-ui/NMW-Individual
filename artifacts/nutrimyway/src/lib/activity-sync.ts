import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';
import { createActivity, getActivities, deleteActivity } from '@workspace/api-client-react';
import { format } from 'date-fns';

export async function syncActivities(memberId: number) {
  if (!Capacitor.isNativePlatform()) {
    console.log("Health sync is only available on native platforms.");
    return { success: false, dataFound: false };
  }

  try {
    // Check if authorized
    const authStatus = await Health.checkAuthorization({
      read: ['calories', 'steps']
    });

    if (!authStatus.readAuthorized.includes('calories') || !authStatus.readAuthorized.includes('steps')) {
      await Health.requestAuthorization({
        read: ['calories', 'steps']
      });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Query active energy burned
    const calResults = await Health.queryAggregated({
      dataType: 'calories',
      startDate: startOfDay.toISOString(),
      endDate: now.toISOString(),
      bucket: 'day',
      aggregation: 'sum'
    });
    
    // Query steps
    const stepResults = await Health.queryAggregated({
      dataType: 'steps',
      startDate: startOfDay.toISOString(),
      endDate: now.toISOString(),
      bucket: 'day',
      aggregation: 'sum'
    });

    let totalCalories = 0;
    if (calResults && calResults.samples && calResults.samples.length > 0) {
      totalCalories = calResults.samples.reduce((acc: number, sample: any) => acc + (sample.value || 0), 0);
    }
    
    let totalSteps = 0;
    if (stepResults && stepResults.samples && stepResults.samples.length > 0) {
      totalSteps = stepResults.samples.reduce((acc: number, sample: any) => acc + (sample.value || 0), 0);
    }
    
    // Fallback: If no calories recorded but steps exist, estimate 0.04 kcal per step
    if (totalCalories === 0 && totalSteps > 0) {
      totalCalories = totalSteps * 0.04;
    }

    if (totalCalories > 0 || totalSteps > 0) {
      // First, get today's activities to avoid duplicates
      const todayString = startOfDay.toLocaleDateString('en-CA');
      const existing = await getActivities(memberId, { date: todayString });
      
      // Delete any existing health_connect syncs for today
      for (const act of existing) {
        if (act.source === 'health_connect') {
          await deleteActivity(memberId, act.id);
        }
      }

      await createActivity(memberId, {
        activity_type: `Calories Burnt ${format(startOfDay, "MMMM do")}`,
        calories_burned: Math.round(totalCalories),
        source: "health_connect"
      });
      return { success: true, dataFound: true };
    }
    
    return { success: true, dataFound: false };
  } catch (error) {
    console.error("Failed to sync activities:", error);
    return { success: false, dataFound: false };
  }
}
