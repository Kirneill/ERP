# AEC ERP Project Health + Integration Demo

A focused ERP-adjacent customization and integration demo for architecture, engineering, and construction (AEC) project teams. It is **not a real ERP** and does not replace systems such as Deltek, Sage, Procore, Autodesk, or accounting/payroll platforms. It is a deliberately small slice that shows how an ERP-style dashboard can combine project controls data, validation rules, integration errors, and audit history into an interviewer-friendly operational view.

See [`goal.md`](./goal.md) for the original build plan, [`docs/demo-script.md`](./docs/demo-script.md) for the live demo flow, and [`docs/change-note.md`](./docs/change-note.md) for validation and rollback notes.

## Plain-English overview

The demo answers a common ERP operations question: **which projects need attention, and why?**

It seeds local AEC project data, calculates health from budget and schedule signals, displays portfolio KPIs in a React dashboard, and lets the user run a sample time-entry import. The import intentionally includes valid and invalid rows so an interviewer can see accepted records, rejected validation cases, recent integration errors, and audit logs in one flow.

## Interview positioning

Use this as a Solutions Engineer demo, not as a full product claim:

- **Business problem:** project leaders often rely on disconnected project controls, time entry, and integration logs.
- **Solution slice:** a lightweight API and dashboard that turn those signals into project health, exceptions, and traceability.
- **SE value:** shows discovery-to-demo thinking: map business pain to a working integration scenario, explain trade-offs, and make data quality visible.
- **Scope honesty:** local SQLite persistence, seeded data, and mock-friendly UI are intentional for a portable interview demo; production would require authentication, real connectors, RBAC, deployment, monitoring, and stronger audit/compliance controls.

## What the demo does

- Shows total projects, health distribution, contract value, forecast overrun, and recent integration failures.
- Lists project health by score with budget utilization, schedule variance, risk status, and status bands: Healthy, Watch, AtRisk, Critical.
- Highlights at-risk projects for management attention.
- Runs a sample time-entry import with mixed valid and invalid rows.
- Persists rejected import rows as integration errors.
- Persists accepted rows and batch completion as audit log entries.
- Displays visible frontend error/offline states instead of hiding API failures.

## Why this maps to Solutions Engineer II ERP customization/integration

This repo demonstrates the type of ERP-adjacent work an SE often explains during discovery, solutioning, and demo cycles:

- **Customization:** health scoring, KPI cards, and management panels are tailored to AEC project controls workflows.
- **Integration:** the time-entry import simulates external-system ingestion from a source such as a timekeeping, field, or project management system.
- **Data validation:** invalid project numbers, employees, hours, work dates, duplicate references, and missing external references are rejected with explainable errors.
- **Observability:** failed rows become integration error records; successful imports and batch completion become audit records.
- **Executive narrative:** the UI connects operational details to business outcomes: overruns, delays, risk posture, and integration quality.

## Architecture

```text
React/Vite dashboard
  -> fetch API client
  -> ASP.NET Core Minimal API
  -> EF Core DbContext
  -> local SQLite database seeded at startup
```

- **Backend:** .NET 9, ASP.NET Core Minimal APIs, EF Core, SQLite, xUnit integration/unit tests.
- **Frontend:** React, TypeScript, Vite, Vitest, Testing Library, plain CSS components.
- **Persistence:** local SQLite database generated under the API project and reseeded when reset.
- **Docs:** demo script and change note support interviewer explanation and rollback/reset talking points.

## Backend responsibilities

- Seed demo clients, projects, employees, and project-control records.
- Expose JSON endpoints for health, dashboard summary, integration errors, audit logs, and time-entry import.
- Calculate health score/status from financial and schedule signals.
- Validate import payloads before writing time entries.
- Record rejected import rows as integration errors.
- Record accepted imports and batch completion as audit logs.
- Return consistent API error envelopes with trace IDs for invalid or unexpected requests.
- Log HTTP method/path/status/latency plus import and health-calculation context.

## Frontend responsibilities

- Load project health, integration errors, and audit logs from the API.
- Render KPI cards, project health table, at-risk project panel, integration error panel, and audit log panel.
- Run the sample import payload against the backend.
- Normalize backend-shaped API responses for the dashboard.
- Show loading, offline fallback, panel-level API issues, import success, and import failure states.

## Data flow

1. API startup initializes SQLite and seed data.
2. Dashboard calls `/api/projects/health`, `/api/integration-errors/recent`, and `/api/audit-logs/recent`.
3. Backend queries EF Core/SQLite and returns JSON DTOs.
4. Frontend normalizes the responses and renders project health, exceptions, and traceability.
5. User clicks **Run sample import**.
6. Frontend posts mixed valid/invalid time entries to `/api/time-entries/import`.
7. Backend validates each row, writes accepted time entries, writes rejected rows as integration errors, writes audit records, and returns accepted/rejected counts.
8. Frontend reloads dashboard panels so the new errors and audit entries are visible.

## Validation, error logging, and audit logging

- **Validation:** `TimeEntryImportService` rejects null rows, unknown projects, unknown employees, invalid hours (`<= 0` or `> 24`), invalid/missing work dates, missing external references, and duplicate external references.
- **API errors:** null or malformed request bodies return a consistent `{ error: { code, message, details, traceId } }` shape instead of an unhandled exception response.
- **Request logging:** middleware logs method, path, status code, elapsed milliseconds, and trace ID.
- **Integration error logging:** rejected import rows are stored with source system, operation, severity, message, external reference, project number, employee number, timestamp, and details.
- **Audit logging:** accepted time entries and completed import batches are stored with actor, action, entity type/id, message, timestamp, and details.

## OpenAPI and API docs

When the backend is running, use `http://localhost:5000/openapi/v1.json` as the source-of-truth OpenAPI document. In an interview, show it briefly to prove the demo is contract-driven, then focus the conversation on the operational flow instead of reading every schema.

Endpoint summary:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Basic service health check. |
| `GET` | `/openapi/v1.json` | OpenAPI document for endpoint discovery and client/testing discussion. |
| `GET` | `/api/projects/health` | Returns seeded project health rows with calculated score/status. |
| `GET` | `/api/dashboard/summary` | Returns project counts, health distribution, contract value, overrun, average health, and recent failure count. |
| `POST` | `/api/time-entries/import` | Imports sample time entries; returns accepted/rejected counts and row errors. |
| `POST` | `/api/demo/reset` | Resets the local demo database to seeded data for a clean interview run. |
| `GET` | `/api/integration-errors/recent?limit=20` | Returns recent validation/integration errors. |
| `GET` | `/api/audit-logs/recent?limit=20` | Returns recent audit log entries for traceability. |

Use **Run sample import** to demonstrate validation: the frontend posts mixed valid/invalid time-entry rows to `/api/time-entries/import`, then reloads health, exceptions, and audit panels. Use **Reset demo data** before a second run or after experimenting so the story returns to a known seed state.

For the SQL/database talking point: the persistence layer is intentionally local SQLite through EF Core. Project health is exposed through the `vw_project_health` SQL view, which is the right artifact to discuss when an interviewer asks how the dashboard could map to reporting, BI, or ERP database views in production.

## Run locally

Prerequisites: .NET SDK 9+ and Node.js LTS.

```bash
# Backend API: http://localhost:5000
cd F:/PI/ERP
dotnet restore backend/Erp.Backend.sln
dotnet run --project backend/src/Erp.Api/Erp.Api.csproj --launch-profile http
```

```bash
# Frontend dashboard: http://localhost:5173
cd F:/PI/ERP/frontend
npm ci
npm run dev
```

## Test and build

```bash
cd F:/PI/ERP
dotnet build backend/Erp.Backend.sln
dotnet test backend/Erp.Backend.sln
cd frontend
npm run build
npm test
```

## Testing evidence

The repo includes automated coverage for the demo-critical paths:

- Backend health scoring/risk bands and API behavior in `backend/tests/Erp.Api.Tests/`.
- Time-entry import validation, integration error persistence, audit log persistence, CORS, health check, dashboard summary, and consistent API error responses.
- Frontend dashboard rendering, offline fallback, sample import interaction, API response normalization, and health badge behavior in `frontend/src/**/*.test.tsx` and `frontend/src/**/*.test.ts`.

For this documentation-only update, no code build is required. Use the commands above before a live interview if you want fresh end-to-end evidence on the machine.

## 2-3 minute talk track

> “This is a focused ERP-adjacent integration slice for AEC project operations, not a full ERP. I built it to show how a Solutions Engineer can translate a business pain point — disconnected project controls and integration errors — into a working demo.
>
> The dashboard starts with executive KPIs: project count, health distribution, contract value, forecast overrun, and recent integration failures. Then I can drill into the project health table and explain how budget utilization, schedule variance, and risk status drive the Healthy, Watch, AtRisk, or Critical bands.
>
> The integration story is the sample time-entry import. It sends a mixed payload to the API: two valid rows and several invalid rows. The backend validates project numbers, employees, work dates, daily hours, and external references. Accepted records become time entries and audit logs; rejected records become integration errors that the dashboard surfaces immediately.
>
> For an ERP customization/integration role, the important part is the pattern: define the operational signal, enforce data quality at the API boundary, make failures visible, and give business users a concise view of what needs attention. In production I would add real ERP/connectors, auth and roles, stronger audit/compliance controls, deployment, and monitoring.”

## 3-minute demo flow

1. Start the backend, then start the frontend and open `http://localhost:5173`.
2. Explain this is a focused AEC ERP health slice for budget, schedule, risk, and integration visibility.
3. Review health distribution, contract value, forecast overrun, and recent integration failures.
4. Select healthy and at-risk/critical projects to explain health drivers.
5. Run the sample time-entry import to show validation failures, audit logging, and integration error visibility.
