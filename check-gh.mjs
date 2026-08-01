const url = 'https://api.github.com/repos/rai174-ui/NMW-Individual/actions/workflows/ios-build.yml/runs?per_page=5';

async function run() {
  const r = await fetch(url);
  const data = await r.json();
  const runs = data.workflow_runs;
  
  if (!runs || runs.length === 0) return console.log('No runs found.');
  
  // Find latest failed run
  const failedRun = runs.find(r => r.conclusion === 'failure');
  if (!failedRun) return console.log('No failed runs found.');
  
  console.log('Fetching jobs for run ID:', failedRun.id);
  const jUrl = `https://api.github.com/repos/rai174-ui/NMW-Individual/actions/runs/${failedRun.id}/jobs`;
  const jRes = await fetch(jUrl);
  const jData = await jRes.json();
  
  const failedJob = jData.jobs.find(j => j.conclusion === 'failure');
  if (!failedJob) return console.log('No failed jobs found in run.');
  
  console.log('Failed job ID:', failedJob.id);
  console.log("=== STEPS ===");
  failedJob.steps.forEach(s => {
    console.log(`${s.name} - ${s.conclusion || s.status}`);
  });
}

run().catch(console.error);
