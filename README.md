# ERP

AEC ERP Project Health + Integration Demo.

See [`goal.md`](./goal.md) for the full build plan, API contracts, data model, testing strategy, acceptance criteria, and demo script.

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

## 3-minute demo flow

1. Start the backend, then start the frontend and open `http://localhost:5173`.
2. Explain this is a focused AEC ERP health slice for budget, schedule, risk, and integration visibility.
3. Review health distribution, contract value, forecast overrun, and recent integration failures.
4. Select healthy and at-risk/critical projects to explain health drivers.
5. Run the sample time-entry import to show validation failures, audit logging, and integration error visibility.
