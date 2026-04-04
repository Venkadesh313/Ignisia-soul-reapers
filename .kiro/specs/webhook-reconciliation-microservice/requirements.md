# Requirements Document

## Introduction

A Python/FastAPI microservice that ingests payment webhook events, persists them idempotently in SQLite, detects anomalous payloads in real-time using an Isolation Forest ML model, and auto-heals out-of-order or missing transactions via a background loop. A glassmorphism dashboard provides live monitoring, and a simulator script generates synthetic traffic for testing.

## Glossary

- **Webhook_Server**: The FastAPI application that receives, validates, and processes incoming webhook events.
- **Event_Store**: The SQLAlchemy/SQLite persistence layer that records webhook transaction sequences.
- **Anomaly_Detector**: The Scikit-Learn Isolation Forest model that classifies webhook payloads as normal or anomalous.
- **Auto_Healer**: The background loop that detects and repairs out-of-order or missing transactions.
- **Mock_Gateway**: The external payment gateway stub used by the Auto_Healer to fetch missing webhook events.
- **Dashboard**: The glassmorphism frontend UI that displays real-time transaction and anomaly metrics.
- **Simulator**: The script that generates synthetic webhook traffic including duplicates, missing states, and delayed events.
- **Transaction**: A single payment lifecycle event identified by a unique transaction ID and status (e.g., initiated, processing, completed, failed).
- **Idempotency_Key**: A unique identifier per webhook event used to prevent duplicate processing.
- **Anomaly_Score**: A numeric score produced by the Anomaly_Detector indicating how anomalous a payload is.

---

## Requirements

### Requirement 1: Webhook Ingestion Endpoint

**User Story:** As a payment platform operator, I want a webhook ingestion endpoint, so that external systems can deliver transaction lifecycle events to the microservice.

#### Acceptance Criteria

1. THE Webhook_Server SHALL expose a `POST /webhook` HTTP endpoint that accepts JSON payloads.
2. WHEN a webhook payload is received, THE Webhook_Server SHALL validate that the payload contains `transaction_id`, `status`, and `timestamp` fields.
3. IF a required field is missing from the payload, THEN THE Webhook_Server SHALL return an HTTP 422 response with a descriptive error message.
4. WHEN a valid payload is received, THE Webhook_Server SHALL return an HTTP 200 response within 500ms.
5. THE Webhook_Server SHALL accept concurrent webhook requests without data corruption.

---

### Requirement 2: Idempotent Event Logging

**User Story:** As a payment platform operator, I want duplicate webhook events to be safely ignored, so that retried deliveries do not corrupt transaction state.

#### Acceptance Criteria

1. THE Event_Store SHALL persist each accepted webhook event with its `transaction_id`, `status`, `timestamp`, `payload`, and `received_at` fields.
2. WHEN a webhook event is received with an Idempotency_Key that already exists in the Event_Store, THE Webhook_Server SHALL return an HTTP 200 response without creating a duplicate record.
3. THE Event_Store SHALL use a SQLite database file named `reconciliation.db`.
4. THE Event_Store SHALL enforce a unique constraint on the Idempotency_Key column at the database level.
5. WHEN the Webhook_Server starts, THE Event_Store SHALL create all required tables if they do not already exist.

---

### Requirement 3: Real-Time Anomaly Detection

**User Story:** As a fraud analyst, I want incoming webhook payloads scored for anomalies in real-time, so that suspicious transaction patterns are flagged immediately upon arrival.

#### Acceptance Criteria

1. THE Anomaly_Detector SHALL be trained on synthetic data representing optimal payment timelines before the Webhook_Server accepts its first request.
2. WHEN a valid webhook payload is received, THE Anomaly_Detector SHALL produce an Anomaly_Score for the payload within 100ms.
3. WHEN the Anomaly_Score indicates an anomaly, THE Webhook_Server SHALL mark the persisted event record with an `is_anomaly` flag set to true.
4. THE Anomaly_Detector SHALL use an Isolation Forest algorithm with a configurable contamination parameter.
5. THE Event_Store SHALL persist the Anomaly_Score alongside each event record.

---

### Requirement 4: Background Auto-Healing Loop

**User Story:** As a payment platform operator, I want the system to automatically detect and repair missing or out-of-order transactions, so that the transaction log remains consistent without manual intervention.

#### Acceptance Criteria

1. THE Auto_Healer SHALL run as a background task that executes on a configurable interval (default: 30 seconds).
2. WHEN the Auto_Healer detects a transaction sequence with a missing intermediate status, THE Auto_Healer SHALL query the Mock_Gateway to fetch the missing event.
3. WHEN the Mock_Gateway returns a missing event, THE Auto_Healer SHALL insert the event into the Event_Store with an `is_healed` flag set to true.
4. WHEN the Auto_Healer detects events received out of chronological order for a given `transaction_id`, THE Auto_Healer SHALL reorder the sequence in the Event_Store.
5. IF the Mock_Gateway is unavailable, THEN THE Auto_Healer SHALL log the failure and retry on the next scheduled interval without crashing.
6. THE Auto_Healer SHALL record a `healed_at` timestamp for every event it inserts or corrects.

---

### Requirement 5: Mock Gateway Fetcher

**User Story:** As a developer, I want a mock payment gateway, so that the Auto_Healer can reconstruct missing webhook events during testing without requiring a live external service.

#### Acceptance Criteria

1. THE Mock_Gateway SHALL expose a function `fetch_missing_event(transaction_id, missing_status)` that returns a synthetic webhook payload.
2. WHEN `fetch_missing_event` is called with a valid `transaction_id` and `missing_status`, THE Mock_Gateway SHALL return a payload containing `transaction_id`, `status`, `timestamp`, and `payload` fields.
3. IF `fetch_missing_event` is called with an unrecognised `missing_status`, THEN THE Mock_Gateway SHALL raise a descriptive exception.
4. THE Mock_Gateway SHALL simulate network latency of between 50ms and 200ms per call.

---

### Requirement 6: Real-Time Metrics API

**User Story:** As a dashboard consumer, I want a metrics endpoint, so that the frontend can poll for up-to-date transaction and anomaly statistics.

#### Acceptance Criteria

1. THE Webhook_Server SHALL expose a `GET /metrics` endpoint that returns JSON.
2. WHEN `GET /metrics` is called, THE Webhook_Server SHALL return the total event count, anomaly count, healed event count, and the 10 most recent events.
3. WHEN `GET /metrics` is called, THE Webhook_Server SHALL respond within 200ms.
4. THE Webhook_Server SHALL expose a `GET /events` endpoint that returns a paginated list of all persisted events ordered by `received_at` descending.

---

### Requirement 7: Glassmorphism Dashboard UI

**User Story:** As a payment platform operator, I want a real-time web dashboard, so that I can visually monitor transaction health, anomalies, and auto-healing activity.

#### Acceptance Criteria

1. THE Dashboard SHALL be served as a static HTML file at the `/` route of the Webhook_Server.
2. THE Dashboard SHALL poll the `GET /metrics` endpoint at a configurable interval (default: 3 seconds) and update displayed data without a full page reload.
3. THE Dashboard SHALL display total event count, anomaly count, healed event count, and a live feed of recent events.
4. THE Dashboard SHALL visually distinguish anomalous events from normal events and healed events from original events.
5. THE Dashboard SHALL apply a glassmorphism visual style using CSS backdrop-filter, semi-transparent backgrounds, and blur effects.
6. WHERE the browser does not support `backdrop-filter`, THE Dashboard SHALL degrade gracefully by rendering a solid semi-transparent background.

---

### Requirement 8: Traffic Simulator

**User Story:** As a developer, I want a simulator script, so that I can generate realistic and adversarial webhook traffic to validate the full system end-to-end.

#### Acceptance Criteria

1. THE Simulator SHALL send normal sequential webhook events to the `POST /webhook` endpoint.
2. THE Simulator SHALL send duplicate webhook events to verify idempotency handling.
3. THE Simulator SHALL send webhook events with missing intermediate statuses to trigger Auto_Healer activity.
4. THE Simulator SHALL send webhook events with deliberate delays to simulate out-of-order delivery.
5. WHEN the Webhook_Server is unreachable, THE Simulator SHALL log the connection error and continue sending remaining events.
6. THE Simulator SHALL be executable as a standalone Python script with no required command-line arguments.

---

### Requirement 9: Service Startup Script

**User Story:** As a developer, I want a convenience startup script, so that I can launch all required services with a single command on Windows.

#### Acceptance Criteria

1. THE Startup_Script SHALL start the Webhook_Server in a new terminal window.
2. THE Startup_Script SHALL be a `.bat` file executable on Windows without additional dependencies beyond Python.
3. WHERE the Webhook_Server port is already in use, THE Startup_Script SHALL display a descriptive error message.
