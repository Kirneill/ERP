# Demo Script

## Business requirement

AEC project leaders need one dashboard that combines project controls, risk, and integration activity so they can identify healthy, watch, at-risk, and critical projects without a full ERP rollout.

## 3-minute flow

1. Start the backend API and frontend dashboard from `README.md`, then open `http://localhost:5173`.
2. Position the app as an ERP project-health slice for AEC operations: budget, schedule, risk, and integration observability.
3. Walk the KPI cards: total projects, health distribution, contract value, forecast overrun, and recent integration failures.
4. Compare a healthy project with an at-risk or critical project and call out score drivers: overrun, delay, risk severity, and sync failures.
5. Run the sample time-entry import from the dashboard. Show accepted records, rejected validation cases, audit logs, and recent integration errors.
6. Close with rollback/next steps: stop the local processes, delete the local SQLite database if a clean seed reset is needed, then rerun the API.

## Validation talking points

- Percent complete is clamped to the supported range.
- Time-entry import rejects missing work dates, negative hours, and excessive daily hours.
- Project health scores are recalculated from project financials, schedule variance, risk posture, and integration failures.
- API failures are visible in the frontend instead of being hidden.
