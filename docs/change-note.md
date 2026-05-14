# Change Note

## Business requirement

Deliver an interview-ready AEC ERP demo that proves project health can be derived from budget, schedule, risk, and integration signals with a local backend, dashboard, and repeatable tests.

## Integrated changes

- Backend API and tests from `feature/backend-api` are merged into `main`.
- Frontend dashboard and tests from `feature/frontend-dashboard` are merged into `main`.
- README now includes executable backend/frontend run, build, test, and demo commands.
- Demo documentation captures the required business narrative, validation behavior, and rollback notes.

## Validation rules to highlight

- Required request bodies return validation errors instead of unhandled exceptions.
- Time-entry import rejects invalid records such as missing dates, negative hours, and daily hours above the allowed range.
- Health scoring normalizes budget, schedule, risk, and integration inputs into Healthy, Watch, AtRisk, and Critical bands.

## Test and rollback notes

- Required verification: `dotnet build backend/Erp.Backend.sln`, `dotnet test backend/Erp.Backend.sln`, `cd frontend && npm run build && npm test`.
- No secrets, local databases, `node_modules`, `dist`, `bin`, or `obj` files should be committed.
- To reset local demo data, stop the API, delete the generated SQLite database file, and restart the API to reseed.
- To roll back the integration, revert the merge commits on `main` in reverse order.
