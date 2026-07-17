import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';
import { createActivity } from '@workspace/api-client-react';

export async function syncActivities(memberId: number) {
  if (!Capacitor.isNativePlatform()) {
    console.log("Health sync is only available on native platforms.");
    return false;
  }

  try {
    // Check if authorized
    const authStatus = await Health.checkAuthorization({
      read: ['calories']
    });

    if (!authStatus.readAuthorized.includes('calories')) {
      // Request authorization
      await Health.requestAuthorization({
        read: ['calories']
      });
    }

    // Get today's start and end date
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Query active energy burned
    const results = await Health.queryAggregated({
      dataType: 'calories',
      startDate: startOfDay.toISOString(),
      endDate: now.toISOString(),
      bucket: 'day',
      aggregation: 'sum'
    });

    if (results && results.samples && results.samples.length > 0) {
      const totalCalories = results.samples.reduce((acc: number, sample: any) => acc + (sample.value || 0), 0);
      
      if (totalCalories > 0) {
        await createActivity(memberId, {
          activity_type: "Native Health Sync",
          calories_burned: Math.round(totalCalories),
          source: "health_connect"
        });
        return true;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Failed to sync activities:", error);
    return false;
  }
}
