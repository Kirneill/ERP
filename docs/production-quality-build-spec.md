# Production-Quality AEC ERP Project Health and Integration Platform

## 1. Title and purpose

This document is a future-build specification for turning the current interview demo into a production-quality AEC ERP Project Health and Integration Platform. It is written for a future LLM or coding agent that will implement the platform in a clean worktree with tests, review gates, and small commits.

The target product helps architecture, engineering, and construction teams consolidate project health, time-entry ingestion, integration exceptions, audit history, and reporting into a secure operational platform. The current repo is a local demo. A production build must add real authentication, tenant isolation, durable storage, integration workers, observability, deployment automation, security controls, and support workflows.

## 2. Assumptions and non-goals

### Assumptions

- The platform serves multiple tenant organizations, each with isolated users, projects, integrations, audit logs, and reporting data.
- The initial production scope is project health and integration visibility, not a full ERP replacement.
- AEC source systems may include Deltek, Sage, Procore, Autodesk, payroll systems, timekeeping systems, and internal project controls databases.
- Some integrations will be API based, some will be file based, and some legacy systems may require SOAP adapters.
- The platform needs near-real-time exception visibility, but core financial records remain in the system of record.
- The product must support enterprise identity through Entra ID or another OIDC provider.
- Deployment targets may be Azure, AWS, or another container-capable platform. Azure is the default reference architecture because of Entra ID and Azure Service Bus fit.
- The production system must be auditable, observable, and supportable by engineers who were not involved in the first build.

### Non-goals

- Do not rebuild payroll, accounting, billing, or contract management systems.
- Do not create a general-purpose ERP.
- Do not store secrets in source code, committed configuration, logs, test fixtures, screenshots, or documentation examples.
- Do not add production features directly to the current demo without a tracked migration plan.
- Do not assume every tenant has the same ERP or field-system data model.
- Do not make the dashboard the source of truth for financial posting or payroll approval.
- Do not skip tenant isolation, audit integrity, or error handling for speed.

## 3. Target users and use cases

### Project manager

- Views project health, budget utilization, schedule variance, staffing gaps, and open integration exceptions.
- Filters by client, project manager, risk status, market sector, region, date range, and health band.
- Opens an exception queue item to understand why a time entry or project update failed.
- Reviews the audit timeline for data changes that affected a project's health.
- Receives notifications when projects move into AtRisk or Critical status.

### Finance user

- Reviews accepted and rejected time entries before downstream reconciliation.
- Compares imported totals against ERP totals by project, employee, labor code, and period.
- Exports validated exception reports for month-end close.
- Confirms that integration corrections have audit evidence.
- Uses reporting views for revenue leakage, overruns, and late data submissions.

### Integration admin

- Configures connectors, credentials references, schedules, field mappings, validation rules, and retry policy.
- Monitors import batches, failed messages, dead-letter queues, and reconciliation status.
- Replays safe failures with idempotency guarantees.
- Routes unresolved exceptions to support or tenant business owners.
- Tests connector changes in lower environments before production deployment.

### Executive

- Views a portfolio dashboard with project count, contract value, forecast overrun, health distribution, trend lines, and top risks.
- Drills from portfolio metrics to project details without reviewing raw integration logs.
- Exports board-ready summaries or connects BI tools to governed reporting views.
- Tracks platform reliability through data freshness and integration success metrics.

### Support engineer

- Uses trace IDs, correlation IDs, import batch IDs, and tenant IDs to investigate issues.
- Searches structured logs and traces without seeing redacted secrets or unnecessary PII.
- Inspects failed jobs, validation failures, connector health, and recent deployment history.
- Follows runbooks for replay, rollback, incident response, and tenant-specific support.

## 4. Production architecture

### Frontend

- React with TypeScript, Vite or a production web framework selected by ADR.
- Component structure split by feature: dashboard, projects, imports, exceptions, audit, reports, admin, shared UI.
- API client generated or validated from OpenAPI contracts.
- OIDC authentication flow with access-token attachment through a secure client library.
- Runtime configuration loaded from environment-specific config, not build-time secrets.
- Accessible UI with keyboard navigation, ARIA labels, focus management, and responsive layouts.

### Backend

- ASP.NET Core service exposing versioned REST APIs and OpenAPI documents.
- Application layer contains use cases, validation, authorization checks, and transaction boundaries.
- Domain layer owns entity invariants, health scoring policy, integration state transitions, and audit event creation.
- Infrastructure layer owns EF Core, connector clients, queue publishers, object storage clients, and telemetry setup.
- Background workers run separately from request-serving APIs where possible.
- Health probes distinguish liveness, readiness, dependency health, and degraded integration status.

### Database

- SQL Server or PostgreSQL as the primary relational database.
- EF Core migrations as the source-controlled schema migration path.
- Row-level tenant filters enforced in application code and, where supported, database policy.
- Transactional writes for import batches, accepted records, integration errors, and audit events.
- Optimized reporting views or materialized snapshots for dashboard and BI workloads.
- Migration tests verify that current production schemas can move forward and backward when rollback is supported.

### Background workers

- Worker service processes import jobs, connector sync jobs, reconciliation jobs, notification jobs, and cleanup jobs.
- Jobs are idempotent by design and record durable status transitions.
- Workers publish structured telemetry with tenant ID, job ID, batch ID, connector name, and correlation ID.
- Long-running integrations use checkpointing so restarts do not duplicate committed records.

### Message queue

- Azure Service Bus, RabbitMQ, or another durable queue with dead-letter support.
- Separate queues for imports, connector sync, reconciliation, notifications, and audit export if throughput requires it.
- Messages contain only references and non-sensitive metadata. Large files live in object storage.
- Every message includes correlation ID, tenant ID, operation name, schema version, and idempotency key.
- Dead-letter messages are visible in an admin queue with safe replay and escalation workflow.

### Object storage

- Store uploaded import files, normalized import artifacts, generated reports, and export packages.
- Use tenant-scoped prefixes or containers plus server-side encryption.
- Store content hashes for tamper evidence and duplicate detection.
- Apply retention policies aligned with tenant contracts and compliance requirements.
- Never use object storage as the only system of record for transactional data.

### Observability

- OpenTelemetry for traces, metrics, and logs correlation.
- Serilog for structured application logging.
- Centralized log storage with retention, redaction, alerting, and query dashboards.
- Trace propagation across frontend, API, workers, queue messages, connector calls, and database operations.
- SLO dashboards for API latency, integration success, data freshness, error rate, and queue lag.

### CI/CD

- GitHub Actions for restore, build, lint, test, security scanning, container build, migration validation, and deployment.
- Pull requests require tests, markdown checks, secret scanning, code review, and migration review when schema changes exist.
- Main branch builds immutable artifacts and versioned containers.
- Deployments use environment gates for dev, test, staging, and production.
- Production deployment requires rollback notes, migration status, and observability checks.

### Environments

- Local: developer stack with seeded data, local database, local queue emulator where available, and safe fake connectors.
- Dev: shared integration environment with non-production identity and test tenants.
- Test: automated integration, contract, migration, and performance baseline environment.
- Staging: production-like configuration with masked data or synthetic data, full deployment pipeline, and monitoring.
- Production: locked-down network, managed identity, real connectors, backups, alerts, incident runbooks, and support access controls.

## 5. Recommended stack

- Backend: .NET 9 or current Microsoft LTS, ASP.NET Core, Minimal APIs or controllers selected by ADR, FluentValidation or native validation patterns, EF Core.
- Frontend: React, TypeScript, Vite or selected production framework, TanStack Query for server state, Testing Library, Playwright.
- Database: SQL Server or PostgreSQL. Choose based on tenant hosting, reporting, team expertise, and source-system integration needs.
- Migrations: EF Core migrations with reviewed migration scripts and automated migration tests.
- Telemetry: OpenTelemetry for traces and metrics, Serilog for structured logs, exporter to Azure Monitor, Grafana, Datadog, or another selected backend.
- Queue: Azure Service Bus for Azure-first deployments, RabbitMQ for portable deployments, with dead-letter queues and replay tooling.
- Authentication: Entra ID or generic OIDC with authorization code flow, PKCE, API audience validation, and tenant-aware claims.
- Authorization: RBAC backed by application roles, tenant membership, and resource-level checks.
- Containerization: Dockerfiles for API, workers, and frontend host. Use non-root containers and pinned base images.
- CI/CD: GitHub Actions with reusable workflows, environment protections, container scanning, dependency scanning, and deployment gates.
- Secrets: managed identity plus Key Vault, AWS Secrets Manager, or an equivalent secret manager. Local development uses user secrets or uncommitted env files.

## 6. Domain model

Use explicit IDs, timestamps, tenant IDs, concurrency tokens, and audit fields. Prefer immutable audit entries and status-history tables over destructive updates where business traceability matters.

### Core entities

#### Tenant

- `Id`, `Slug`, `Name`, `Status`, `CreatedAt`, `UpdatedAt`.
- Owns users, roles, clients, projects, integrations, rules, imports, audit logs, notifications, and reporting snapshots.
- Tenant deletion requires retention and legal-hold policy.

#### User

- `Id`, `TenantId`, `ExternalIdentityId`, `DisplayName`, `Email`, `Status`, `LastLoginAt`.
- User belongs to one or more roles. Cross-tenant support access requires explicit privileged workflow.
- Email is PII and must be normalized, encrypted at rest if required, and redacted from general logs.

#### Role

- `Id`, `TenantId`, `Name`, `Description`, `Permissions`.
- Default roles: ProjectManager, FinanceUser, IntegrationAdmin, Executive, SupportEngineer, TenantAdmin.
- Permissions should be named by action and resource, for example `project.read`, `import.replay`, `audit.read`.

#### Client

- `Id`, `TenantId`, `ClientNumber`, `Name`, `Status`, `MarketSector`, `Region`.
- Client number is unique per tenant.
- Client records support filtering and reporting dimensions.

#### Project

- `Id`, `TenantId`, `ClientId`, `ProjectNumber`, `Name`, `ProjectManagerUserId`, `Status`, `StartDate`, `EndDate`, `ContractValue`, `BudgetHours`, `ForecastCost`, `ActualCost`, `ScheduleVarianceDays`, `RiskStatus`.
- Project number is unique per tenant.
- Project health is derived from source data plus rules, not manually edited except through controlled overrides if approved by product.

#### Employee or resource

- `Id`, `TenantId`, `EmployeeNumber`, `DisplayName`, `Email`, `ResourceType`, `Department`, `Status`, `DefaultLaborCategory`.
- Represents employees, contractors, or named resources depending on source system.
- Employee number is unique per tenant and can map to multiple external IDs.

#### Assignment

- `Id`, `TenantId`, `ProjectId`, `EmployeeId`, `RoleName`, `StartDate`, `EndDate`, `PlannedHours`, `AllocationPercent`, `Status`.
- Used for staffing visibility and schedule risk.
- Validations prevent assignments outside project date ranges unless tenant policy allows exceptions.

#### Time entry

- `Id`, `TenantId`, `ProjectId`, `EmployeeId`, `WorkDate`, `Hours`, `LaborCode`, `ExternalReference`, `SourceSystem`, `ImportBatchId`, `Status`.
- Unique constraint on `TenantId`, `SourceSystem`, `ExternalReference` for idempotency.
- Validation checks project status, employee status, date range, hours bounds, duplicate references, and tenant policy.

#### Import batch

- `Id`, `TenantId`, `SourceSystem`, `ImportType`, `Status`, `SubmittedByUserId`, `SubmittedAt`, `StartedAt`, `CompletedAt`, `AcceptedCount`, `RejectedCount`, `FileObjectKey`, `InputHash`, `IdempotencyKey`, `CorrelationId`.
- Status values: Pending, Processing, Completed, CompletedWithErrors, Failed, Cancelled.
- Batch summary is updated transactionally as rows are processed or through safe aggregation after processing.

#### Integration error

- `Id`, `TenantId`, `ImportBatchId`, `ConnectorId`, `SourceSystem`, `Operation`, `Severity`, `Status`, `ErrorCode`, `Message`, `ExternalReference`, `ProjectNumber`, `EmployeeNumber`, `OccurredAt`, `ResolvedAt`, `AssignedToUserId`, `DetailsJson`.
- Status values: Open, InReview, WaitingOnSource, Resolved, Ignored, Replayed, DeadLettered.
- Error detail must redact secrets and unnecessary PII.

#### Audit log

- `Id`, `TenantId`, `ActorType`, `ActorUserId`, `Action`, `EntityType`, `EntityId`, `Message`, `OccurredAt`, `CorrelationId`, `PreviousHash`, `EntryHash`, `DetailsJson`.
- Append-only. Do not update or delete except under formal retention and legal policy.
- Hash chaining or write-once storage should be considered for stronger immutability.

#### Project health snapshot

- `Id`, `TenantId`, `ProjectId`, `SnapshotDate`, `HealthScore`, `HealthStatus`, `BudgetUtilization`, `ScheduleVarianceDays`, `ForecastOverrun`, `OpenExceptionCount`, `DataFreshnessStatus`, `FactorsJson`, `CreatedAt`.
- Generated by scheduled worker, event-driven recalculation, or on-demand backfill.
- Snapshots support trend charts and executive reporting without recalculating every request.

#### Notification

- `Id`, `TenantId`, `RecipientUserId`, `Channel`, `Type`, `Subject`, `Body`, `Status`, `CreatedAt`, `SentAt`, `ReadAt`, `EntityType`, `EntityId`.
- Channels may include in-app, email, Teams, Slack, or webhook.
- Notification rules must honor tenant settings and user preferences.

#### Data quality rule

- `Id`, `TenantId`, `Name`, `Description`, `EntityType`, `Severity`, `Status`, `RuleType`, `ConfigurationJson`, `CreatedByUserId`, `CreatedAt`, `UpdatedAt`.
- Rule types include required field, range, duplicate, reference existence, date window, status compatibility, and custom expression if safely sandboxed.
- Rule changes create audit entries and should be versioned so historical errors can be explained.

## 7. API design

### Principles

- All production APIs are versioned under `/api/v1`.
- Use OpenAPI as the contract source and generate clients or validation tests from it.
- Require authentication for all tenant APIs. Public endpoints are limited to health checks and OIDC metadata where applicable.
- Enforce tenant context from token claims or support-access context, not from untrusted request bodies.
- Use consistent pagination, filters, sorting, idempotency, and error envelopes.
- Avoid returning unbounded lists.

### Endpoint groups

#### Health and metadata

- `GET /health/live`
- `GET /health/ready`
- `GET /api/v1/metadata/version`
- `GET /api/v1/metadata/features`

#### Projects and health

- `GET /api/v1/projects`
- `GET /api/v1/projects/{projectId}`
- `GET /api/v1/projects/{projectId}/health`
- `GET /api/v1/project-health/snapshots`
- `POST /api/v1/project-health/recalculate`

#### Dashboard and reporting

- `GET /api/v1/dashboard/portfolio-summary`
- `GET /api/v1/dashboard/health-distribution`
- `GET /api/v1/dashboard/top-risks`
- `GET /api/v1/reports/project-health/export`

#### Imports and integrations

- `POST /api/v1/import-batches`
- `GET /api/v1/import-batches`
- `GET /api/v1/import-batches/{batchId}`
- `GET /api/v1/import-batches/{batchId}/rows`
- `POST /api/v1/import-batches/{batchId}/replay`
- `GET /api/v1/integration-errors`
- `GET /api/v1/integration-errors/{errorId}`
- `PATCH /api/v1/integration-errors/{errorId}`
- `POST /api/v1/integration-errors/{errorId}/resolve`

#### Connectors and admin

- `GET /api/v1/connectors`
- `POST /api/v1/connectors`
- `GET /api/v1/connectors/{connectorId}`
- `PATCH /api/v1/connectors/{connectorId}`
- `POST /api/v1/connectors/{connectorId}/test`
- `POST /api/v1/connectors/{connectorId}/sync`
- `GET /api/v1/data-quality-rules`
- `POST /api/v1/data-quality-rules`
- `PATCH /api/v1/data-quality-rules/{ruleId}`

#### Audit and notifications

- `GET /api/v1/audit-logs`
- `GET /api/v1/audit-logs/{auditLogId}`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{notificationId}`

#### Users and roles

- `GET /api/v1/users`
- `GET /api/v1/users/{userId}`
- `GET /api/v1/roles`
- `POST /api/v1/roles`
- `PATCH /api/v1/roles/{roleId}`

### Pagination, filtering, and sorting

Use cursor pagination for large or changing lists. Offset pagination is acceptable for stable administrative lists when documented.

Example request:

```http
GET /api/v1/integration-errors?status=Open&severity=Error&sourceSystem=Deltek&limit=50&cursor=eyJvY2N1cnJlZEF0IjoiMjAyNi0wNS0xNFQxMjozMDowMFoifQ&sort=-occurredAt
```

Example response:

```json
{
  "items": [
    {
      "id": "err_01HX...",
      "sourceSystem": "Deltek",
      "operation": "TimeEntryImport",
      "severity": "Error",
      "status": "Open",
      "message": "Employee E-1042 was not found for this tenant.",
      "externalReference": "TE-90010",
      "occurredAt": "2026-05-14T12:30:00Z"
    }
  ],
  "page": {
    "limit": 50,
    "nextCursor": "eyJvY2N1cnJlZEF0IjoiMjAyNi0wNS0xNFQxMjoyOTowMFoifQ"
  }
}
```

### Idempotency keys

- Required for import creation, replay, connector sync, and any command that can be retried by clients.
- Header: `Idempotency-Key: tenant-scoped-stable-key`.
- Store request hash, response summary, actor, tenant, endpoint, and expiration.
- If the same key is reused with a different request hash, return `409 Conflict`.

### Error shape

All APIs return a consistent error envelope.

```json
{
  "error": {
    "code": "ValidationFailed",
    "message": "One or more fields failed validation.",
    "details": [
      {
        "field": "workDate",
        "code": "OutOfRange",
        "message": "Work date must be within the active project date range."
      }
    ],
    "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00",
    "correlationId": "corr_01HX..."
  }
}
```

### OpenAPI requirements

- Every endpoint has request schema, response schema, auth requirement, status codes, examples, and error responses.
- OpenAPI generation runs in CI and fails on contract drift.
- Contract tests verify generated frontend client compatibility.
- Breaking changes require a versioned endpoint or explicit deprecation plan.

## 8. Integration design

### Connector types

- ERP connectors: Deltek, Sage, Microsoft Dynamics, Oracle, SAP, or tenant-specific systems.
- Timekeeping connectors: time-entry platforms, payroll exports, CSV drops, and field time apps.
- Project systems: Procore, Autodesk Construction Cloud, Primavera P6, Microsoft Project, or internal project controls databases.
- File import: CSV, Excel, fixed-width, JSON, and XML where needed.
- REST adapters: OAuth2, API key reference, mTLS where required, pagination, rate-limit handling.
- SOAP adapters: WSDL-backed clients, envelope logging with redaction, timeout control, and schema validation.

### Import lifecycle

1. Receive file upload, API trigger, schedule trigger, or webhook.
2. Create import batch with Pending status and idempotency key.
3. Store raw file in object storage with hash and metadata.
4. Enqueue import job with batch ID and correlation ID.
5. Worker loads file or external pages, validates schema, normalizes rows, and applies mapping rules.
6. Worker validates business rules and reference integrity.
7. Accepted rows are written transactionally with audit events.
8. Rejected rows create integration errors with exception workflow metadata.
9. Batch status, counts, and reconciliation summary are updated.
10. Notifications and dashboards are updated through events or fresh queries.

### Retry and dead-letter policy

- Transient connector failures use exponential backoff with jitter and max attempts.
- Validation failures are not retried automatically because source data must change.
- Poison messages move to dead-letter queues with reason, attempt count, and last exception class.
- Dead-letter replay requires IntegrationAdmin permission and creates an audit entry.
- Replays must reuse or derive idempotency keys so committed records are not duplicated.

### Idempotency and deduplication

- Use source-system external IDs plus tenant and operation as natural idempotency keys when available.
- For files, hash raw content and normalized row identity.
- For API imports, require client-supplied idempotency key.
- Store processed message IDs and batch item IDs long enough to cover retry windows and source-system replay behavior.
- Unique constraints protect critical records from duplicate writes.

### Validation and reconciliation

- Validate schema first, then field-level rules, then cross-reference rules, then business policy.
- Reconciliation compares imported totals against source counts, source totals, ERP totals, and accepted/rejected counts.
- Reconciliation results are stored with the batch and exposed in UI and API.
- Finance users can export reconciliation reports by period.

### Exception workflow

- Integration errors enter Open status with severity and owner routing.
- Users can assign, comment, mark waiting on source, resolve, ignore with reason, or replay.
- Every workflow action creates an audit entry.
- Resolution should link to corrected source data, replayed batch, or business-approved exception.
- Bulk actions require confirmation and clear result summaries.

## 9. Security and compliance

### Authentication

- Use Entra ID or OIDC with authorization code flow and PKCE.
- APIs validate issuer, audience, expiration, signature, tenant claim, and scopes.
- Service-to-service calls use managed identity, mTLS, or signed tokens depending on platform.
- Disable insecure local auth shortcuts outside local development.

### Authorization and RBAC

- Enforce RBAC in backend policy handlers, not only in frontend routing.
- Check tenant membership on every tenant-scoped resource.
- Separate support engineer access from tenant user access. Require reason codes and audit entries for support impersonation or elevated access.
- Dangerous actions such as replay, connector secret rotation, and data export require explicit permissions.

### Tenant isolation

- Include `TenantId` on every tenant-owned table.
- Apply global query filters where using EF Core, but do not rely on filters alone for sensitive operations.
- Use composite unique constraints that include tenant ID.
- Consider database row-level security for defense in depth.
- Automated tests must prove cross-tenant reads and writes are blocked.

### Secret management

- Store connector credentials only in a secret manager.
- Store references to secrets in the application database, never secret values.
- Rotate secrets through managed workflows with audit entries.
- Redact secrets from logs, traces, exceptions, object storage metadata, and test snapshots.

### Audit immutability

- Audit logs are append-only.
- Use hash chaining or write-once storage for high-assurance tenants.
- Restrict audit export and audit read access.
- Retention and deletion must follow legal and contractual policy.

### PII handling

- Minimize stored PII. Store only what supports workflows.
- Classify fields such as email, employee name, identifiers, comments, and uploaded files.
- Redact PII from general logs unless explicitly required for a secured support workflow.
- Support data-subject requests where contractually required.

### Encryption and network security

- TLS everywhere.
- Encrypt database, object storage, queue, and backups at rest.
- Use private networking for managed services where possible.
- Restrict production admin access through least-privilege roles and just-in-time approval.

### Rate limiting and abuse prevention

- Apply per-user, per-tenant, and per-client rate limits.
- Add stricter limits for import submission, export, connector test, and replay endpoints.
- Return clear `429` responses with retry guidance.
- Monitor unusual export volume, replay attempts, failed auth, and connector failures.

### OWASP and logging redaction

- Validate all input at API boundaries.
- Parameterize all SQL through EF Core or reviewed query APIs.
- Encode all user-visible output in the frontend.
- Protect file upload paths through content-type checks, size limits, malware scanning if required, and safe parsing.
- Run dependency scanning and container scanning in CI.
- Maintain a redaction policy for tokens, connection strings, API keys, passwords, authorization headers, cookies, and PII fields.

## 10. Data and reporting

### Production SQL views

Create reviewed SQL views for common reporting paths:

- `vw_project_health_current`
- `vw_project_health_trends`
- `vw_integration_error_summary`
- `vw_import_batch_reconciliation`
- `vw_resource_assignment_utilization`
- `vw_audit_activity_by_entity`

Views must include tenant filters, documented columns, and performance indexes on underlying tables.

### Materialized snapshots

- Use `ProjectHealthSnapshot` for trend history and executive dashboard performance.
- Refresh snapshots on schedule and after relevant events.
- Store freshness metadata so dashboards can show stale data warnings.
- For PostgreSQL, consider materialized views for heavy aggregations. For SQL Server, consider indexed views or snapshot tables depending on workload.

### BI and export strategy

- Provide governed exports through API, object storage, and optional data warehouse sync.
- Use tenant-scoped export permissions and audit every export.
- Export formats: CSV for operational users, Parquet for warehouse pipelines, JSON for API consumers.
- Expose data dictionary documentation for BI teams.
- Avoid direct production database access for external BI unless controlled through read replicas, views, and network restrictions.

### Data retention

- Define retention per entity type and tenant contract.
- Suggested defaults: raw import files 90 to 365 days, audit logs 7 years, integration errors 2 years, health snapshots 3 years, operational notifications 1 year.
- Support legal hold that prevents deletion.
- Retention jobs must be observable and auditable.

### Migration strategy

- Every schema change has an EF Core migration, migration review, rollback note, and test.
- Backfills are separate jobs when they may exceed deployment time budgets.
- Use expand-contract migrations for breaking schema changes.
- Keep old columns during compatibility windows, write both when needed, backfill, then remove in a later release.
- Validate migrations against a production-like database snapshot in CI or staging.

## 11. Frontend UX

### Dashboards

- Executive dashboard: portfolio KPIs, health distribution, forecast overrun, data freshness, trend lines, and top risks.
- Project dashboard: health score, score factors, budget and schedule indicators, exceptions, audit timeline, and related imports.
- Integration dashboard: connector status, recent batches, success rate, queue lag, dead-letter count, and reconciliation results.

### Filters and search

- Global filters: tenant context, date range, client, project manager, project status, health band, source system, region, and market sector.
- Search supports project number, project name, client, employee number, import batch ID, external reference, and error code.
- Filters are shareable through URL state where safe.

### Exception queues

- Queue list with severity, age, source system, operation, owner, status, and impact.
- Details view with validation result, source reference, related batch, suggested resolution, comments, audit history, and replay action if permitted.
- Bulk assignment and bulk status updates with confirmation and partial-failure reporting.

### Audit timeline

- Entity-specific timelines for project, import batch, integration error, connector, and user administration.
- Shows actor, action, timestamp, trace link, before/after summary when safe, and related records.
- Support engineers can copy trace IDs and correlation IDs.

### Admin settings

- Connector configuration with safe secret references.
- Data quality rule builder with preview against sample data.
- Role and permission management.
- Notification preferences and routing rules.
- Environment and feature-flag visibility for admins.

### Accessibility

- Meet WCAG 2.2 AA for core workflows.
- Keyboard-accessible tables, dialogs, filters, menus, and replay actions.
- Visible focus states.
- Color is not the only status signal.
- Use semantic headings, table captions, form labels, and live regions for async feedback.

### Loading, error, and empty states

- Loading states distinguish first load, refresh, and background update.
- Empty states explain what data is missing and how to create or import it.
- Error states show user-safe messages, trace ID, retry option, and support path.
- Stale data warnings show last successful refresh time and impacted connector.
- Partial failures render unaffected panels instead of blanking the whole dashboard.

## 12. Testing strategy

### Test categories

- Unit tests: domain rules, health scoring, validation rules, idempotency helpers, authorization policy logic.
- Integration tests: API endpoints, EF Core queries, migrations, queue publishers, object storage adapters with local or test containers.
- Contract tests: OpenAPI schema compatibility, generated frontend client behavior, connector adapter request and response shapes.
- End-to-end tests: user workflows for dashboard, import, exception resolution, replay, audit review, admin connector test.
- Performance tests: dashboard query latency, import throughput, queue lag recovery, large export generation, frontend render performance.
- Security tests: authorization matrix, tenant isolation, injection attempts, file upload validation, rate limiting, logging redaction.
- Migration tests: apply migrations to previous schema, verify data preservation, run rollback where supported.
- Test data management: synthetic tenants, projects, employees, imports, and exceptions. Do not use real PII in committed fixtures.

### Acceptance test matrix

| Area | Scenario | Acceptance criteria | Test type |
|---|---|---|---|
| Authentication | Unauthenticated user calls tenant API | Returns `401` with no data leak | Integration |
| Authorization | Finance user attempts connector secret rotation | Returns `403`, creates security audit event if policy requires | Integration |
| Tenant isolation | User from Tenant A requests Tenant B project ID | Returns `404` or `403` by policy, no Tenant B fields in logs or response | Security |
| Project health | Project crosses Critical threshold after new costs | New snapshot has Critical status and factor summary | Unit, integration |
| Import validation | File contains unknown employee and duplicate external reference | Valid rows accepted, invalid rows create integration errors | Integration |
| Idempotency | Same import request retried with same key | Original result returned, no duplicate time entries | Integration |
| Idempotency conflict | Same idempotency key reused with different body | Returns `409 Conflict` | Integration |
| Dead-letter | Worker receives poison message | Message moves to dead-letter with reason and alert metric increments | Integration |
| Replay | Admin replays a resolved transient failure | Replay creates audit entry and does not duplicate existing rows | E2E |
| Reconciliation | Source total differs from accepted total | Batch shows reconciliation mismatch and finance notification is created | Integration |
| Audit | Project health override is approved | Append-only audit entry records actor, reason, entity, and correlation ID | Integration |
| Reporting | Executive opens dashboard for 10,000 projects | P95 portfolio summary latency meets SLO | Performance |
| Frontend accessibility | User navigates exception workflow by keyboard | No keyboard trap, focus order is logical, critical actions have labels | E2E |
| Logging redaction | Connector test fails with auth error | Logs contain trace data but no token, password, or connection string | Security |
| Migration | Upgrade from previous schema with active batches | Migration succeeds and active batches remain processable | Migration |

## 13. Observability

### Metrics

- API request count, latency, error rate, and status code by endpoint and tenant tier.
- Queue depth, queue age, dead-letter count, retry count, and worker processing duration.
- Import batch count, accepted rows, rejected rows, validation failure rate, and reconciliation mismatch count.
- Connector success rate, connector latency, rate-limit responses, and data freshness age.
- Database query duration, connection pool usage, migration status, and lock waits.
- Frontend web vitals and client-side API error rate.

### Logs

- Structured JSON logs through Serilog.
- Include trace ID, correlation ID, tenant ID, actor ID where safe, endpoint, operation, entity type, entity ID, and status.
- Redact secrets and PII according to policy.
- Log important business events as audit records, not only application logs.

### Traces

- OpenTelemetry traces flow from frontend request to API, database, queue publish, worker process, connector call, and object storage access.
- Use span attributes for connector name, batch ID, source system, operation, and retry attempt.
- Never attach raw file content, tokens, passwords, or PII-heavy payloads to spans.

### Alerts

- API 5xx rate exceeds threshold.
- P95 or P99 latency breaches SLO.
- Queue age exceeds processing SLO.
- Dead-letter count increases above baseline.
- Connector freshness exceeds tenant-specific threshold.
- Reconciliation mismatch rate spikes.
- Failed login or forbidden action volume spikes.
- Backup or retention job fails.

### Dashboards

- Executive operational dashboard: platform uptime, integration freshness, import success, and open critical exceptions.
- Engineering dashboard: API health, worker health, queues, database, dependencies, deploy markers.
- Support dashboard: tenant-specific incidents, failed batches, connector status, and recent high-severity errors.
- Security dashboard: auth failures, elevated support access, export volume, and rate-limit events.

### SLOs

Initial SLO targets, refine after baseline measurements:

- API availability: 99.9 percent monthly for core read APIs.
- Dashboard portfolio summary: P95 under 1.5 seconds for standard tenants.
- Import acknowledgement: P95 under 5 seconds after upload or trigger.
- Import processing: 95 percent of standard batches under 10 minutes, tenant-specific for large batches.
- Data freshness: scheduled connector data no older than 60 minutes unless source system is unavailable.
- Critical alert response: page within 5 minutes for production outage conditions.

## 14. Delivery plan

### Phase 0: Product and architecture baseline

Acceptance criteria:

- ADRs exist for database, queue, identity, deployment target, API style, and observability backend.
- Initial OpenAPI skeleton covers core endpoint groups.
- Threat model and data classification draft exist.
- CI runs markdown checks and basic solution build.

Verification commands:

```bash
rg "TODO|TBD" docs
python - <<'PY'
from pathlib import Path
for path in [Path('docs'), Path('README.md'), Path('AGENTS.md')]:
    files = path.rglob('*') if path.is_dir() else [path]
    for file in files:
        if file.is_file() and file.suffix in {'.md', '.html'}:
            text = file.read_text(encoding='utf-8')
            if chr(8212) in text:
                print(file)
PY
```

### Phase 1: Platform foundation

Acceptance criteria:

- Backend solution has layered projects and production configuration model.
- Frontend has authenticated shell and route protection.
- Database schema includes tenants, users, roles, clients, projects, employees, audit logs.
- EF Core migrations run locally and in CI.
- OpenTelemetry and Serilog are wired for API requests.

Verification commands:

```bash
dotnet restore backend/Erp.Backend.sln
dotnet build backend/Erp.Backend.sln
dotnet test backend/Erp.Backend.sln
cd frontend && npm ci && npm run build && npm test
```

### Phase 2: Project health and dashboard

Acceptance criteria:

- Health scoring policy is tested and configurable by tenant rule version.
- Current health API supports filters, pagination, and OpenAPI examples.
- Dashboard renders KPIs, project list, health factors, empty states, and error states.
- Health snapshots are created and queried efficiently.

Verification commands:

```bash
dotnet test backend/Erp.Backend.sln --filter Health
cd frontend && npm test -- --run
```

### Phase 3: Import pipeline and exception workflow

Acceptance criteria:

- Import batch creation stores raw file metadata and enqueues work.
- Worker validates rows, writes accepted records, creates integration errors, and updates batch counts.
- Idempotency prevents duplicate records under retry.
- Exception queue supports assignment, status changes, comments, resolution, and audit trail.
- Dead-letter and replay workflows are tested.

Verification commands:

```bash
dotnet test backend/Erp.Backend.sln --filter Import
dotnet test backend/Erp.Backend.sln --filter Idempotency
dotnet test backend/Erp.Backend.sln --filter IntegrationError
```

### Phase 4: Connectors and reconciliation

Acceptance criteria:

- At least one file connector and one API connector are production-shaped behind interfaces.
- Connector configuration uses secret references and test connection workflow.
- Reconciliation reports compare source and accepted totals.
- Connector failures produce actionable errors, metrics, and traces.

Verification commands:

```bash
dotnet test backend/Erp.Backend.sln --filter Connector
dotnet test backend/Erp.Backend.sln --filter Reconciliation
```

### Phase 5: Security hardening and compliance

Acceptance criteria:

- RBAC matrix is enforced in backend tests.
- Tenant isolation tests cover every endpoint group.
- Logs and traces pass redaction tests.
- File upload validation and rate limiting are implemented.
- Audit log immutability strategy is implemented and documented.

Verification commands:

```bash
dotnet test backend/Erp.Backend.sln --filter Security
dotnet test backend/Erp.Backend.sln --filter TenantIsolation
rg "password|secret|api_key|token" . --glob '!**/bin/**' --glob '!**/obj/**' --glob '!**/node_modules/**'
```

### Phase 6: Production delivery

Acceptance criteria:

- Containers build and scan successfully.
- GitHub Actions deploy to dev, staging, and production with environment gates.
- Database migrations are validated in staging.
- Dashboards, alerts, runbooks, rollback plan, and disaster recovery plan are in place.
- Load, E2E, migration, and security test suites pass.

Verification commands:

```bash
git diff --check
dotnet test backend/Erp.Backend.sln
cd frontend && npm run build && npm test
```

## 15. LLM execution instructions

- Work in the requested worktree only. Confirm `pwd` and `git status --short --branch` before editing.
- Read `AGENTS.md`, `README.md`, relevant docs, project files, tests, and runtime paths before changing code.
- Define acceptance criteria before implementation.
- Use TDD for domain logic, validation, authorization, idempotency, migrations, and integration workflows.
- Make small commits. Each commit should represent one logical change and pass relevant tests.
- Do not change app code when the task is docs-only.
- Do not use real secrets, production tenant data, real PII, or copied connector credentials in code, tests, docs, logs, or screenshots.
- Do not use `as any`, `@ts-ignore`, lint disables, broad catch blocks, or hidden fallback behavior unless a human explicitly approves and the rationale is documented.
- Prefer typed models, explicit guards, and root-cause fixes.
- Add or update OpenAPI, README, operational docs, runbooks, and ADRs when public behavior, deployment, or architecture changes.
- Keep migrations reviewable. Separate schema expansion, backfill, and cleanup when needed.
- Run targeted tests first, then broader verification before commit.
- Run `git diff --check` before every commit.
- Run a review gate after implementation. Review correctness, security, tenant isolation, performance, observability, and documentation.
- Include changed files, commands run, results, commit hash, and known risks in the final response.
- Never push unless the task explicitly asks for push or the repo workflow requires it.

## 16. Production readiness checklist

### Architecture and code

- [ ] ADRs accepted for database, identity, queue, deployment, observability, and API style.
- [ ] Domain model implemented with tenant IDs, constraints, indexes, timestamps, and concurrency where needed.
- [ ] API endpoints versioned and documented through OpenAPI.
- [ ] Idempotency implemented for all retryable commands.
- [ ] Background workers are separate, observable, and safe to restart.
- [ ] EF Core migrations are reviewed and tested.

### Security

- [ ] OIDC authentication configured for every environment.
- [ ] RBAC enforced server-side.
- [ ] Tenant isolation tests pass.
- [ ] Secrets stored in secret manager only.
- [ ] Logs, traces, and errors redact secrets and PII.
- [ ] File uploads have size, type, parsing, and malware controls as required.
- [ ] Rate limiting and abuse monitoring are enabled.
- [ ] Dependency and container scans pass or have approved exceptions.

### Operations

- [ ] OpenTelemetry, structured logs, dashboards, and alerts are live.
- [ ] Liveness and readiness probes are configured.
- [ ] Queue and dead-letter monitoring are configured.
- [ ] Backup and restore are tested.
- [ ] Runbooks exist for outage, connector failure, dead-letter replay, failed deployment, and data correction.
- [ ] On-call ownership and escalation paths are documented.

### Product and UX

- [ ] Core workflows support loading, empty, error, stale-data, and partial-failure states.
- [ ] Accessibility audit passes for core workflows.
- [ ] Executive, PM, finance, integration admin, and support personas have validated workflows.
- [ ] Export and reporting permissions are reviewed.
- [ ] Data retention policy is configured.

### Delivery

- [ ] GitHub Actions builds immutable artifacts.
- [ ] CI runs unit, integration, contract, E2E, migration, security, lint, and markdown checks as appropriate.
- [ ] Staging deployment matches production topology.
- [ ] Release notes, migration notes, rollback plan, and verification evidence are attached to release.
- [ ] Production smoke tests pass after deployment.

## 17. Rollback and disaster recovery plan

### Application rollback

- Deploy immutable versioned containers.
- Keep at least the previous production version available for fast rollback.
- Feature flags must allow disabling new connectors, imports, exports, notifications, and risky UI flows without redeploying.
- Rollback procedure:
  1. Confirm incident scope, impacted tenants, and active migrations.
  2. Disable risky feature flags if sufficient.
  3. Pause relevant workers or connector schedules if writes may be unsafe.
  4. Redeploy previous known-good container version.
  5. Run smoke tests and check dashboards.
  6. Resume paused workers only after idempotency and queue state are verified.
  7. Create incident record and post-incident review.

### Database rollback

- Prefer backward-compatible expand-contract migrations so application rollback does not require database rollback.
- For destructive changes, require backup, restore test, human approval, and maintenance window.
- Keep migration scripts, checksums, and deployment timestamps.
- If rollback scripts are supported, test them against staging snapshots before production.
- For failed backfills, pause worker, fix code or data, rerun idempotent backfill from checkpoint.

### Queue and worker recovery

- Workers must be restart-safe and idempotent.
- Dead-letter queues retain failed messages for investigation.
- Replay requires permission, reason code, and audit entry.
- Queue drain and replay runbooks must include commands, expected metrics, and stop conditions.

### Object storage recovery

- Enable versioning where available for critical import and export artifacts.
- Retain raw imports long enough to replay after data loss or transformation bugs.
- Store content hashes so restored artifacts can be verified.
- Access logs must support investigation of unauthorized or accidental access.

### Backup and restore

- Automated database backups with point-in-time restore.
- Regular restore drills in non-production.
- Document RPO and RTO by tenant tier.
- Suggested initial targets: RPO under 15 minutes, RTO under 4 hours for core platform, refine by contract.
- Disaster recovery plan covers region outage, identity outage, database corruption, queue outage, and object storage outage.

## 18. Open questions

- Which deployment cloud is the production default: Azure, AWS, or platform-neutral Kubernetes?
- Which primary database should be selected: SQL Server or PostgreSQL?
- Are tenants legally isolated by database, schema, row-level policy, or application-enforced tenant column?
- What are the first real source systems and connector priorities?
- What tenant data retention requirements apply to audit logs, import files, integration errors, and reporting snapshots?
- Is hash-chained audit logging sufficient, or is write-once storage required?
- Which BI tools must be supported first?
- What are the exact SLOs by tenant tier?
- Should health scoring be fully configurable by tenant, partially configurable, or centrally governed?
- Are user comments in exception workflows considered regulated records?
- What export formats are required for finance and executives?
- What support access model is acceptable for tenant data investigation?
- Which compliance frameworks apply: SOC 2, ISO 27001, HIPAA, GDPR, CCPA, FedRAMP, or tenant-specific controls?
- What is the expected peak import volume, file size, and connector frequency per tenant?
- How should production licensing and feature flags map to tenant contracts?
