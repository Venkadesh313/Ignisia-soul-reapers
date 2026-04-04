# Implementation Plan: Webhook Reconciliation Microservice

## Overview

Implement a self-contained Python/FastAPI microservice that ingests payment webhook events, persists them idempotently in SQLite, scores payloads with an Isolation Forest anomaly detector, auto-heals missing/out-of-order transactions via a background loop, serves a glassmorphism dashboard, and includes a traffic simulator and Windows startup script.

All tasks build incrementally: persistence layer first, then ML model, then mock gateway, then the FastAPI app wiring everything together, then the frontend and tooling, and finally tests.

## Tasks

- [x] 1. Project setup
  - Create `requirements.txt` with all dependencies: `fastapi`, `uvicorn`, `sqlalchemy`, `scikit-learn`, `numpy`, `hypothesis`, `pytest`, `pytest-asyncio`, `httpx`, `requests`
  - Create top-level directory structure: `static/`, `tests/`
  - _Requirements: 9.2_

- [x] 2. Implement Event_Store (`database.py`)
  - [x] 2.1 Create `database.py` with SQLAlchemy Core engine, metadata, and `webhook_events` table definition matching the schema (all columns, unique constraint on `idempotency_key`, both indexes)
    - _Requirements: 2.1, 2.3, 2.4, 2.5_
  - [x] 2.2 Implement `init_db()`, `event_exists()`, `insert_event()`, `get_metrics()`, `get_events()`, `get_all_transactions()`, and `insert_healed_event()` functions
    - `insert_event` raises `IntegrityError` on duplicate `idempotency_key`
    - `get_metrics` returns `total_events`, `anomaly_count`, `healed_count`, and the 10 most recent events
    - `get_events` accepts `page` and `page_size`, returns events ordered by `received_at` descending
    - `get_all_transactions` returns a dict mapping `transaction_id` to its list of event dicts (for auto-healer gap analysis)
    - _Requirements: 2.1, 2.2, 2.4, 4.2, 6.2, 6.4_
  - [x] 2.3 Write property test for Event_Store round-trip (Property 4)
    - `# Feature: webhook-reconciliation-microservice, Property 4: Event persistence round-trip`
    - Generate random valid events, persist via `insert_event`, query back by `idempotency_key`, assert all original fields are present and equal
    - **Property 4: Event persistence round-trip**
    - **Validates: Requirements 2.1, 3.5**
  - [x] 2.4 Write property test for idempotent ingestion (Property 5)
    - `# Feature: webhook-reconciliation-microservice, Property 5: Idempotent ingestion`
    - Generate random valid events, call `insert_event` twice (catching `IntegrityError` on second), assert exactly one record exists
    - **Property 5: Idempotent ingestion**
    - **Validates: Requirements 2.2**

- [x] 3. Implement Anomaly_Detector (`ml_model.py`)
  - [x] 3.1 Create `ml_model.py` with `AnomalyDetector` class wrapping `sklearn.ensemble.IsolationForest`
    - Implement `train(contamination=0.1)`: generate synthetic training data covering normal payment timelines with injected outliers; fit the model; raise `RuntimeError` if training fails
    - Implement `score(payload: dict) -> tuple[float, bool]`: extract feature vector `[amount_cents, delay_seconds, status_ordinal]` from payload; return `(anomaly_score, is_anomaly)`
    - _Requirements: 3.1, 3.2, 3.4_
  - [x] 3.2 Write property test for anomaly scoring latency (Property 6)
    - `# Feature: webhook-reconciliation-microservice, Property 6: Anomaly scoring latency`
    - Generate random valid payloads, call `score()`, assert elapsed time < 100ms
    - **Property 6: Anomaly scoring latency**
    - **Validates: Requirements 3.2**
  - [x] 3.3 Write property test for anomaly flag consistency (Property 7)
    - `# Feature: webhook-reconciliation-microservice, Property 7: Anomaly flag consistency`
    - Generate payloads with extreme feature values (very large `amount_cents`, very large `delay_seconds`), assert `is_anomaly=True`
    - **Property 7: Anomaly flag consistency**
    - **Validates: Requirements 3.3**

- [x] 4. Implement Mock_Gateway (`mock_gateway.py`)
  - [x] 4.1 Create `mock_gateway.py` with `fetch_missing_event(transaction_id: str, missing_status: str) -> dict`
    - Sleep `random.uniform(0.05, 0.2)` seconds to simulate latency
    - Return dict with `transaction_id`, `status`, `timestamp`, and `payload` keys for recognised statuses (`initiated`, `processing`, `completed`, `failed`)
    - Raise `ValueError` with descriptive message for unrecognised `missing_status`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 4.2 Write property test for Mock_Gateway output structure (Property 10)
    - `# Feature: webhook-reconciliation-microservice, Property 10: Mock_Gateway output structure`
    - Generate random `transaction_id` strings and valid statuses; assert returned dict contains all required keys
    - **Property 10: Mock_Gateway output structure**
    - **Validates: Requirements 5.2**
  - [x] 4.3 Write property test for Mock_Gateway unknown status rejection (Property 11)
    - `# Feature: webhook-reconciliation-microservice, Property 11: Mock_Gateway rejects unknown statuses`
    - Generate random strings that are not valid statuses; assert `ValueError` is raised
    - **Property 11: Mock_Gateway rejects unknown statuses**
    - **Validates: Requirements 5.3**
  - [x] 4.4 Write property test for Mock_Gateway latency bounds (Property 12)
    - `# Feature: webhook-reconciliation-microservice, Property 12: Mock_Gateway latency bounds`
    - Call `fetch_missing_event` with valid inputs N times; assert each call completes in [50ms, 200ms]
    - **Property 12: Mock_Gateway latency bounds**
    - **Validates: Requirements 5.4**

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Webhook_Server and Auto_Healer (`main.py`)
  - [x] 6.1 Create `main.py` with FastAPI app, `WebhookPayload` Pydantic model, and startup lifecycle
    - `WebhookPayload` fields: `transaction_id: str`, `status: str`, `timestamp: str`, `amount_cents: int | None`, `metadata: dict | None`
    - On startup: call `Event_Store.init_db()`, `AnomalyDetector.train()`, launch `auto_heal_loop` as background asyncio task
    - Serve `static/index.html` at `GET /`
    - _Requirements: 1.1, 2.5, 3.1, 4.1, 7.1_
  - [x] 6.2 Implement `POST /webhook` endpoint
    - Validate payload via Pydantic (FastAPI returns 422 automatically on missing fields)
    - Derive `idempotency_key = f"{transaction_id}:{status}"`
    - Return HTTP 200 early if `event_exists(idempotency_key)` is true
    - Call `AnomalyDetector.score(payload)` to get `(anomaly_score, is_anomaly)`
    - Call `Event_Store.insert_event(...)` with all fields including `received_at`, `anomaly_score`, `is_anomaly`
    - Catch `IntegrityError` and return 200 (treat as duplicate)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.2, 3.3, 3.5_
  - [x] 6.3 Implement `GET /metrics` and `GET /events` endpoints
    - `/metrics` calls `Event_Store.get_metrics()` and returns the result as JSON
    - `/events` accepts `page` and `page_size` query params, calls `Event_Store.get_events()`, returns paginated response with `events`, `page`, `page_size`, `total`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 6.4 Implement `auto_heal_loop(interval_seconds=30)` background coroutine
    - On each cycle: call `Event_Store.get_all_transactions()` to get all transaction sequences
    - For each transaction, compute missing statuses relative to expected sequence `initiated → processing → completed | failed`
    - For each gap, call `Mock_Gateway.fetch_missing_event(transaction_id, missing_status)` and insert result via `Event_Store.insert_healed_event()` with `is_healed=True` and `healed_at` timestamp
    - Detect out-of-order events by comparing `timestamp` vs `received_at` ordering; flag them
    - Wrap entire cycle body in `try/except Exception` — log with `logging.error()` and continue loop on any failure
    - Sleep `interval_seconds` between cycles
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 6.5 Write property test for payload validation (Property 1)
    - `# Feature: webhook-reconciliation-microservice, Property 1: Payload validation rejects any incomplete payload`
    - Generate payloads with random subsets of required fields removed; POST to `/webhook`; assert HTTP 422
    - **Property 1: Payload validation rejects any incomplete payload**
    - **Validates: Requirements 1.2, 1.3**
  - [x] 6.6 Write property test for valid payload latency (Property 2)
    - `# Feature: webhook-reconciliation-microservice, Property 2: Valid payloads are accepted within latency budget`
    - Generate random valid payloads; POST to `/webhook`; assert HTTP 200 and elapsed time < 500ms
    - **Property 2: Valid payloads are accepted within latency budget**
    - **Validates: Requirements 1.4**
  - [x] 6.7 Write property test for concurrent ingestion (Property 3)
    - `# Feature: webhook-reconciliation-microservice, Property 3: Concurrent ingestion produces no duplicate records`
    - Generate N distinct valid payloads; send concurrently via `asyncio.gather`; assert exactly N records in Event_Store with no duplicate `idempotency_key`
    - **Property 3: Concurrent ingestion produces no duplicate records**
    - **Validates: Requirements 1.5**
  - [x] 6.8 Write property test for idempotent HTTP ingestion (Property 5 — HTTP layer)
    - `# Feature: webhook-reconciliation-microservice, Property 5: Idempotent ingestion`
    - Generate random valid events; POST twice; assert both return HTTP 200 and Event_Store contains exactly one record
    - **Property 5: Idempotent ingestion**
    - **Validates: Requirements 2.2**
  - [x] 6.9 Write property test for auto-healer gap filling (Property 8)
    - `# Feature: webhook-reconciliation-microservice, Property 8: Auto-healer fills gaps`
    - Generate transactions with random missing intermediate statuses; run one auto-heal cycle; assert gaps filled with `is_healed=1` and non-null `healed_at`
    - **Property 8: Auto-healer fills gaps**
    - **Validates: Requirements 4.2, 4.3, 4.6**
  - [x] 6.10 Write property test for auto-healer ordering invariant (Property 9)
    - `# Feature: webhook-reconciliation-microservice, Property 9: Auto-healer ordering invariant`
    - Generate out-of-order transactions; run one auto-heal cycle; assert events retrievable in correct `timestamp` order
    - **Property 9: Auto-healer ordering invariant**
    - **Validates: Requirements 4.4**
  - [x] 6.11 Write property test for metrics response completeness (Property 13)
    - `# Feature: webhook-reconciliation-microservice, Property 13: Metrics response completeness`
    - Generate random event sets; insert into Event_Store; call `GET /metrics`; assert `total_events`, `anomaly_count`, `healed_count`, `recent_events` present and counts match actual data; assert `recent_events` length ≤ 10
    - **Property 13: Metrics response completeness**
    - **Validates: Requirements 6.2**
  - [x] 6.12 Write property test for metrics response latency (Property 14)
    - `# Feature: webhook-reconciliation-microservice, Property 14: Metrics response latency`
    - Vary Event_Store size; call `GET /metrics`; assert response time < 200ms
    - **Property 14: Metrics response latency**
    - **Validates: Requirements 6.3**
  - [x] 6.13 Write property test for events endpoint ordering (Property 15)
    - `# Feature: webhook-reconciliation-microservice, Property 15: Events endpoint ordering invariant`
    - Generate random events with varying `received_at` timestamps; call `GET /events`; assert returned list is ordered by `received_at` descending
    - **Property 15: Events endpoint ordering invariant**
    - **Validates: Requirements 6.4**

- [x] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Create Dashboard (`static/index.html`)
  - [x] 8.1 Create `static/index.html` as a single-file HTML/CSS/JS dashboard
    - Apply glassmorphism style: `backdrop-filter: blur(...)`, semi-transparent `background`, `border-radius`, `box-shadow`
    - Graceful degradation: provide solid semi-transparent background fallback for browsers without `backdrop-filter` support using `@supports` CSS rule
    - Display: total event count, anomaly count, healed event count, live feed of recent events
    - Visually distinguish anomalous events (e.g. red tint) and healed events (e.g. green tint) from normal events
    - Poll `GET /metrics` every 3 seconds via `fetch()` and update DOM without full page reload
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 9. Create Traffic Simulator (`simulator.py`)
  - [x] 9.1 Create `simulator.py` as a standalone Python script (no required CLI args)
    - Send four traffic patterns sequentially to `POST /webhook`:
      1. Normal sequential transactions (initiated → processing → completed)
      2. Duplicate events (same `idempotency_key` sent twice)
      3. Transactions with missing intermediate statuses (skip `processing`)
      4. Out-of-order events (send `completed` before `processing`)
    - Catch `requests.ConnectionError` per individual request; log the error and continue with remaining events
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x] 9.2 Write property test for simulator resilience (Property 16)
    - `# Feature: webhook-reconciliation-microservice, Property 16: Simulator resilience`
    - Run simulator against an unreachable server URL; assert no unhandled exception is raised and all events are attempted
    - **Property 16: Simulator resilience**
    - **Validates: Requirements 8.5**

- [x] 10. Create Windows Startup Script (`start_services.bat`)
  - Create `start_services.bat` that:
    - Checks if the Uvicorn port (default 8000) is already in use via `netstat`; if so, prints a descriptive error and exits
    - Starts the Webhook_Server (`uvicorn main:app --reload`) in a new terminal window via `start cmd /k`
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 11. Write unit and integration tests (`tests/`)
  - [x] 11.1 Write unit tests in `tests/test_unit.py`
    - `test_missing_field_returns_422` — test each required field missing individually
    - `test_duplicate_event_returns_200_no_duplicate_record` — idempotency example
    - `test_anomaly_detector_trains_without_error` — smoke test
    - `test_mock_gateway_unknown_status_raises` — error condition
    - `test_auto_healer_gateway_failure_does_not_crash` — error condition (mock gateway raises, loop continues)
    - `test_metrics_endpoint_returns_required_keys` — structure check
    - `test_events_endpoint_pagination` — pagination example
    - _Requirements: 1.2, 1.3, 2.2, 3.1, 5.3, 4.5, 6.2, 6.4_
  - [x] 11.2 Write integration tests in `tests/test_integration.py`
    - Start full FastAPI app with `httpx.AsyncClient` and `ASGITransport`
    - Send simulator-style traffic; verify end-to-end event counts and healing
    - Verify `reconciliation.db` is created on startup
    - Verify dashboard HTML is served at `GET /`
    - _Requirements: 2.3, 2.5, 7.1_
  - [x] 11.3 Add Hypothesis settings profile to `tests/conftest.py`
    - Register and load `"ci"` profile with `max_examples=100`
    - _Requirements: (test infrastructure)_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use Hypothesis and are tagged with `# Feature: webhook-reconciliation-microservice, Property N: ...` comments
- Unit tests and property tests are complementary — both are included
- The `idempotency_key` is always derived as `f"{transaction_id}:{status}"`
- All background task exceptions are caught at the loop level so the auto-healer never crashes the server
