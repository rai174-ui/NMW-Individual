# Plan: Resolve Logging Duplication and Add Progress Warnings

Based on your feedback, here is the updated implementation plan. We will handle the meal logging fixes, add deletion to the history tab (with confirmation), fix the water log button, and add dynamic color warnings to your daily targets.

## Proposed Changes

### 1. Meal Logging: Disable Button Immediately
**Goal:** Prevent double-submissions when clicking "Save Meal".

#### [MODIFY] log.tsx
- Add a local state `const [isSaving, setIsSaving] = useState(false);`
- In `handleSave()`, set `setIsSaving(true)` immediately when the function starts. Use a `try/finally` block to ensure it resets when done.
- Update the Save button to be disabled when `isSaving` is true: `disabled={!foodItem.trim() || createLog.isPending || isSaving || aiLoading}`.
- Change the button text to `"Saving..."` when `isSaving` is true for immediate visual feedback.

---

### 2. Meal Logging: Add Delete Endpoint & History UI
**Goal:** Allow users to remove duplicate or incorrect meal logs with a confirmation step, restricted to the History tab.

#### [MODIFY] api-server/src/routes/members.ts
- Create a new endpoint: `DELETE /members/:memberId/consumption/:logId`
- It will execute `DELETE FROM member_consumption WHERE id = $1 AND member_id = $2`.

#### [MODIFY] log.tsx (Meal History Tab)
- Add a `Trash2` icon button next to each item in the meal history list.
- When clicked, show a native browser confirmation dialog: `if (window.confirm('Are you sure you want to delete this meal?')) { ... }`.
- If confirmed, call the new DELETE API, then refetch the logs and invalidate the daily summary query to update the totals.

---

### 3. Water Tracker: Immediate Button Disabling
**Goal:** Prevent double-submissions when adding water.

#### [MODIFY] dashboard.tsx (WaterTracker component)
- Change the "+ Glass" button text to show `"Adding..."` while the request is processing.
- The `disabled={loading}` logic is already there, but React state updates can sometimes leave a tiny window for double-taps. We will add a small debounce or ensure the disabled state locks the UI instantly during the `onClick` handler before the async fetch begins.

---

### 4. Dynamic Target Colors (Orange to Red)
**Goal:** Visually warn the user when they are getting close to (orange) or exceeding (red) their daily targets for calories and macros.

#### [MODIFY] dashboard.tsx & profile.tsx
- Implement a helper function `getProgressColorClass(current, target, defaultClass)`:
  - If current >= target (100%+): Return `"bg-red-500 text-red-500"` (or just the relevant property like bg/text).
  - If current >= target * 0.85 (85%-99%): Return `"bg-orange-500 text-orange-500"`.
  - Otherwise: Return the `defaultClass` (e.g. `bg-primary` or `text-primary`).
- **dashboard.tsx:** 
  - **Calorie Progress Ring:** Apply this helper to the `className` of the SVG circle so the ring turns orange, then red.
  - **Macro Stats (Protein, Fiber, Water):** Apply this helper to the text displaying the current amount.
- **profile.tsx:**
  - **Active Plan Progress Bars:** Apply the helper to the `bg-*` class of the horizontal progress bars for Calories, Protein, Fiber, and Water.
  - **Active Plan Text:** Apply the helper to the text colors of the `current / target` values.

## Verification Plan

### Manual Verification
1. **Meal Logging:** Spam click the "Save Meal" button. Verify it disables instantly and only creates one record.
2. **Meal Deletion:** Go to the History tab, click the trash icon, cancel the confirmation (verify nothing happens), then click it again and confirm (verify the meal is deleted).
3. **Water Logging:** Click "+ Glass" and verify it disables instantly without allowing rapid double taps.
4. **Target Colors (Dashboard & Profile):** Add enough meals/water to push the daily totals past 85% of the target. Verify the ring, text, and profile progress bars turn orange. Push it past 100% and verify they turn red.
