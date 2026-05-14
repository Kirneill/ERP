# AEC ERP Project Health + Integration Demo — Build Plan

## Objective

Build a demo ERP slice for architecture, engineering, and construction (AEC) project teams that shows project health across budget, schedule, risk, and integration activity. The demo must prove that a modern web dashboard can combine project controls data with external integration events and present actionable health signals without requiring a full ERP implementation.

The demo should answer these questions for a project manager or operations leader:

- Which projects are healthy, at risk, or critical?
- What budget and schedule variance is driving the health score?
- Which risks or integration failures need attention?
- What recent sync activity came from external systems?
- Can project data be created, updated, queried, and tested through clear API contracts?

## Scope Boundaries

### In Scope

- Backend API for project health data, risks, integration events, and dashboard summary metrics.
- Frontend dashboard with project list, project detail, health indicators, risk and integration panels.
- SQLite-backed local persistence for demo data.
- Seed data for realistic AEC projects.
- Automated tests for core health scoring and API behavior.
- Structured logging for backend requests, health calculations, and integration ingestion.
- Demo script that can be run locally from a clean checkout.

### Out of Scope

- Authentication and authorization beyond optional local-only placeholder fields.
- Real integrations with Procore, Autodesk, Deltek, Sage, or accounting systems.
- Production deployment, cloud infrastructure, SSO, multi-tenant isolation, or background workers.
- Full ERP modules such as payroll, procurement, accounting close, or document management.
- Application code during this setup task.

## Stack

### Backend

- .NET 9 or current installed .NET SDK compatible with ASP.NET Core Minimal APIs.
- C#.
- Entity Framework Core.
- SQLite for local persistence.
- Serilog or built-in structured logging with JSON-friendly fields.
- xUnit or NUnit for tests.

### Frontend

- Node.js LTS.
- React with TypeScript.
- Vite.
- TanStack Query or simple fetch layer for API state.
- CSS modules, Tailwind CSS, or plain CSS with a small design system; choose one and keep styling minimal.
- Vitest and React Testing Library for frontend tests.

### Repo Layout Target

```text
ERP/
  goal.md
  README.md
  .gitignore
  backend/        # created by backend implementation branch later
  frontend/       # created by frontend implementation branch later
```

Worktrees:

```text
F:/PI/ERP           # main baseline and integration branch
F:/PI/ERP-backend   # feature/backend-api
F:/PI/ERP-frontend  # feature/frontend-dashboard
```

## Commands

### Repository Setup

```bash
cd F:/PI/ERP
git status
git worktree list
```

### Backend Commands

Expected commands after backend implementation exists:

```bash
cd F:/PI/ERP-backend
dotnet restore
dotnet build
dotnet test
dotnet run --project backend/src/Erp.Api
```

Expected API base URL:

```text
http://localhost:5000
```

### Frontend Commands

Expected commands after frontend implementation exists:

```bash
cd F:/PI/ERP-frontend/frontend
npm install
npm run dev
npm run build
npm test
```

Expected frontend URL:

```text
http://localhost:5173
```

### Full Demo Commands

Expected final local demo flow:

```bash
# Terminal 1
cd F:/PI/ERP-backend
dotnet run --project backend/src/Erp.Api

# Terminal 2
cd F:/PI/ERP-frontend/frontend
npm run dev
```

Then open `http://localhost:5173`.

## Data Model

### Project

Represents an AEC project tracked by the ERP demo.

Fields:

- `id` — GUID or integer primary key.
- `projectNumber` — unique project code, e.g. `AEC-2026-014`.
- `name` — project name.
- `clientName` — client or owner.
- `marketSector` — healthcare, commercial, infrastructure, education, industrial, etc.
- `projectManager` — responsible PM.
- `status` — `Planning`, `Active`, `OnHold`, `Closing`, `Closed`.
- `contractValue` — total contract amount.
- `costToDate` — actual cost incurred.
- `estimatedCostAtCompletion` — forecast total cost.
- `plannedStartDate` — baseline start date.
- `plannedEndDate` — baseline finish date.
- `actualStartDate` — optional actual start.
- `forecastEndDate` — current forecast finish date.
- `percentComplete` — 0 to 100.
- `lastUpdatedUtc` — last project update timestamp.

### ProjectHealthSnapshot

Computed or persisted snapshot of project health.

Fields:

- `projectId` — owning project.
- `healthScore` — 0 to 100.
- `healthStatus` — `Healthy`, `Watch`, `AtRisk`, `Critical`.
- `budgetVariancePercent` — positive or negative variance against budget.
- `scheduleVarianceDays` — forecast finish minus planned finish.
- `riskCount` — total open risks.
- `criticalRiskCount` — open critical risks.
- `integrationFailureCount` — recent failed integration events.
- `calculatedAtUtc` — calculation timestamp.

Suggested scoring logic:

- Start at 100.
- Subtract budget penalty based on forecast overrun percentage.
- Subtract schedule penalty based on forecast delay days.
- Subtract risk penalty for high and critical risks.
- Subtract integration penalty for recent failed sync events.
- Clamp score between 0 and 100.

Suggested health bands:

- `Healthy`: 85–100.
- `Watch`: 70–84.
- `AtRisk`: 50–69.
- `Critical`: 0–49.

### Risk

Fields:

- `id` — primary key.
- `projectId` — owning project.
- `title` — short risk title.
- `description` — risk details.
- `severity` — `Low`, `Medium`, `High`, `Critical`.
- `probability` — `Low`, `Medium`, `High`.
- `impactArea` — `Budget`, `Schedule`, `Safety`, `Quality`, `Scope`, `Integration`.
- `status` — `Open`, `Mitigating`, `Closed`.
- `owner` — accountable owner.
- `createdAtUtc` — creation timestamp.
- `updatedAtUtc` — update timestamp.

### IntegrationEvent

Represents a sync event from an external system.

Fields:

- `id` — primary key.
- `projectId` — optional project association.
- `sourceSystem` — `Procore`, `Autodesk`, `Deltek`, `Sage`, `ManualImport`, etc.
- `eventType` — `BudgetSync`, `ScheduleSync`, `RfiSync`, `SubmittalSync`, `CostImport`, etc.
- `status` — `Succeeded`, `Failed`, `Partial`.
- `message` — human-readable result.
- `externalReference` — external ID or correlation key.
- `occurredAtUtc` — event timestamp.
- `durationMs` — sync duration.

### DashboardSummary

Read model returned by the API for dashboard cards.

Fields:

- `totalProjects`.
- `healthyProjects`.
- `watchProjects`.
- `atRiskProjects`.
- `criticalProjects`.
- `totalContractValue`.
- `totalForecastOverrun`.
- `averageHealthScore`.
- `recentIntegrationFailures`.

## API Contracts

All API responses should use JSON. Dates should be ISO 8601 UTC strings. Errors should use a consistent problem-details style payload.

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "service": "erp-api",
  "timestampUtc": "2026-05-13T00:00:00Z"
}
```

### List Projects

```http
GET /api/projects?status=Active&healthStatus=AtRisk&search=hospital
```

Response:

```json
{
  "items": [
    {
      "id": "project-id",
      "projectNumber": "AEC-2026-014",
      "name": "North Tower Hospital Expansion",
      "clientName": "Metro Health Authority",
      "status": "Active",
      "contractValue": 42500000,
      "percentComplete": 63,
      "healthScore": 72,
      "healthStatus": "Watch",
      "budgetVariancePercent": 4.8,
      "scheduleVarianceDays": 12
    }
  ],
  "total": 1
}
```

### Get Project Detail

```http
GET /api/projects/{id}
```

Response includes project fields, latest health snapshot, open risks, and recent integration events.

### Create Project

```http
POST /api/projects
Content-Type: application/json
```

Request:

```json
{
  "projectNumber": "AEC-2026-015",
  "name": "Civic Center Retrofit",
  "clientName": "City Capital Projects",
  "marketSector": "Civic",
  "projectManager": "Dana Lee",
  "contractValue": 18500000,
  "plannedStartDate": "2026-06-01T00:00:00Z",
  "plannedEndDate": "2027-04-30T00:00:00Z"
}
```

Expected responses:

- `201 Created` with created project.
- `400 Bad Request` for validation failures.
- `409 Conflict` when `projectNumber` already exists.

### Update Project Forecast

```http
PATCH /api/projects/{id}/forecast
Content-Type: application/json
```

Request:

```json
{
  "costToDate": 8200000,
  "estimatedCostAtCompletion": 19600000,
  "forecastEndDate": "2027-05-21T00:00:00Z",
  "percentComplete": 44
}
```

Response:

- `200 OK` with updated project and recalculated health snapshot.
- `404 Not Found` when project does not exist.

### List Risks for Project

```http
GET /api/projects/{id}/risks
```

### Create Risk

```http
POST /api/projects/{id}/risks
Content-Type: application/json
```

Request:

```json
{
  "title": "Long-lead switchgear delivery delay",
  "description": "Vendor lead time threatens commissioning milestone.",
  "severity": "High",
  "probability": "Medium",
  "impactArea": "Schedule",
  "owner": "M. Patel"
}
```

Expected responses:

- `201 Created` with created risk and recalculated health snapshot.
- `400 Bad Request` for validation failures.
- `404 Not Found` when project does not exist.

### Record Integration Event

```http
POST /api/integration-events
Content-Type: application/json
```

Request:

```json
{
  "projectId": "project-id",
  "sourceSystem": "Procore",
  "eventType": "RfiSync",
  "status": "Failed",
  "message": "External API timeout while syncing RFIs.",
  "externalReference": "procore-sync-8941",
  "durationMs": 30000
}
```

Response:

- `201 Created` with event and recalculated project health when projectId is supplied.
- `400 Bad Request` for validation failures.

### Dashboard Summary

```http
GET /api/dashboard/summary
```

Response:

```json
{
  "totalProjects": 8,
  "healthyProjects": 3,
  "watchProjects": 2,
  "atRiskProjects": 2,
  "criticalProjects": 1,
  "totalContractValue": 248500000,
  "totalForecastOverrun": 7400000,
  "averageHealthScore": 76.4,
  "recentIntegrationFailures": 4
}
```

## Testing Strategy

### Backend Tests

- Unit tests for health scoring bands, budget variance, schedule variance, risk penalties, and integration failure penalties.
- Validation tests for project creation, forecast updates, risk creation, and integration event ingestion.
- API integration tests using an in-memory or temporary SQLite database.
- Repository or data access tests only where behavior is not already covered by API tests.
- Smoke test for `/health`.

Required backend verification commands:

```bash
dotnet build
dotnet test
```

### Frontend Tests

- Component tests for summary cards, project health badge, project list, and project detail panels.
- API client tests or mocked query tests for loading, empty, and error states.
- Accessibility checks for visible labels, color contrast, keyboard navigation, and semantic headings.
- Build verification with production bundle command.

Required frontend verification commands:

```bash
npm test
npm run build
```

### End-to-End Demo Verification

At minimum, manually verify:

- Dashboard loads seeded projects.
- Health counts match project list statuses.
- Selecting a project shows risks and integration events.
- Creating a failed integration event changes the related project's health inputs.
- Backend logs include request path, method, status code, elapsed time, and correlation/request ID.

## Logging Requirements

Backend logs must be structured and include:

- Timestamp.
- Log level.
- Request ID or correlation ID.
- HTTP method, path, status code, and elapsed milliseconds for requests.
- Project ID for project-specific operations.
- Source system, event type, status, and duration for integration events.
- Health score inputs and output when a health snapshot is recalculated.
- Error logs with exception type, message, and operation context.

Frontend logging should be minimal:

- Surface API failures to the user through visible error states.
- Use console logging only for local development diagnostics.
- Do not log secrets, tokens, or sensitive client data.

## Phased Tasks

### Phase 0 — Repository Baseline

- Create `F:/PI/ERP` git repo on `main`.
- Add `goal.md`, `.gitignore`, and `README.md`.
- Commit baseline documentation.
- Create or connect private GitHub repo `Kirneill/ERP`.
- Push `main`.
- Create backend and frontend worktrees from `main`.

Acceptance criteria:

- Repo exists locally and remotely.
- `main` is clean after commit and push.
- Worktrees exist at expected paths on expected branches.

### Phase 1 — Backend API Foundation

- Create .NET solution under `backend/`.
- Add API project and test project.
- Define entities, DTOs, validation, health scoring service, and SQLite persistence.
- Add seed data.
- Implement health, project, risk, integration event, and dashboard endpoints.
- Add structured request logging.
- Add backend tests.

Acceptance criteria:

- `dotnet build` passes.
- `dotnet test` passes.
- API can run locally and serve seeded project data.
- API contracts in this document are implemented or documented with intentional differences.

### Phase 2 — Frontend Dashboard

- Create React/Vite TypeScript app under `frontend/`.
- Build dashboard shell, summary cards, project list, project detail, risks, and integration event panels.
- Add API client and environment-based API base URL.
- Add loading, empty, and error states.
- Add component tests and build verification.

Acceptance criteria:

- `npm test` passes.
- `npm run build` passes.
- Dashboard renders seeded backend data.
- UI clearly distinguishes Healthy, Watch, AtRisk, and Critical states.

### Phase 3 — Integration and Demo Polish

- Merge backend and frontend work back to `main` through reviewed commits.
- Verify backend and frontend run together from clean checkout.
- Add final README run instructions.
- Add demo seed reset command if needed.
- Execute demo script and record any limitations.

Acceptance criteria:

- Clean local demo starts with documented commands.
- Dashboard and API behavior match demo script.
- Git status is clean in all worktrees.

## Overall Acceptance Criteria

- Local repo and worktrees match the requested paths and branches.
- Private GitHub repo exists at `Kirneill/ERP` and contains `main`.
- Documentation baseline is committed with message `docs: add project goal and repo baseline`.
- No secrets or generated build outputs are committed.
- Application code is not implemented during setup.
- Later implementation must satisfy API contracts, tests, logging, and demo script in this plan.

## Demo Script

### Opening

1. Start backend API.
2. Start frontend dashboard.
3. Open the dashboard in a browser.
4. Explain that this is a focused AEC ERP project health slice, not a full ERP replacement.

### Dashboard Overview

1. Show total projects and health distribution.
2. Point out aggregate contract value and forecast overrun.
3. Highlight recent integration failures as operational signals.

### Project Health Walkthrough

1. Select a healthy project and show low variance, low risk, and successful sync activity.
2. Select an at-risk or critical project.
3. Explain the score drivers: budget variance, schedule delay, open risks, and failed integrations.

### Integration Scenario

1. Record or show a failed integration event from an external source such as Procore.
2. Refresh or revisit the project detail.
3. Show the event in the integration timeline and explain how integration failures affect health visibility.

### Risk Scenario

1. Add or show a high-severity risk.
2. Show the risk in the project detail.
3. Explain how operational risks affect project health and management attention.

### Close

1. Summarize that the demo connects ERP-style project controls with integration observability.
2. State next production steps: authentication, real connectors, audit trails, deployment, and role-based workflows.
