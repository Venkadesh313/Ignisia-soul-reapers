import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

import database
import mock_gateway
from ml_model import AnomalyDetector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

detector = AnomalyDetector()

EXPECTED_SEQUENCE = ["initiated", "processing", "completed", "failed"]
TERMINAL_STATUSES = {"completed", "failed"}


class WebhookPayload(BaseModel):
    transaction_id: str
    status: str
    timestamp: str
    amount_cents: int | None = None
    metadata: dict | None = None


async def auto_heal_loop(interval_seconds: int = 30) -> None:
    while True:
        try:
            transactions = database.get_all_transactions()
            for tid, events in transactions.items():
                observed = {e["status"] for e in events}
                terminal = observed & TERMINAL_STATUSES
                if terminal:
                    terminal_status = next(iter(terminal))
                    terminal_idx = EXPECTED_SEQUENCE.index(terminal_status)
                    expected = set(EXPECTED_SEQUENCE[: terminal_idx + 1])
                else:
                    expected = set(EXPECTED_SEQUENCE[:2])  # at least initiated+processing

                missing = expected - observed
                for ms in missing:
                    try:
                        result = mock_gateway.fetch_missing_event(tid, ms)
                        healed_at = datetime.now(timezone.utc).isoformat()
                        idempotency_key = f"{tid}:{ms}"
                        database.insert_healed_event({
                            "idempotency_key": idempotency_key,
                            "transaction_id": tid,
                            "status": ms,
                            "timestamp": result["timestamp"],
                            "payload": result["payload"],
                            "received_at": healed_at,
                            "anomaly_score": None,
                            "is_anomaly": 0,
                            "is_healed": 1,
                            "healed_at": healed_at,
                        })
                    except Exception as exc:
                        logger.error("Auto-healer failed for %s/%s: %s", tid, ms, exc)

                # Detect out-of-order events
                sorted_by_ts = sorted(events, key=lambda e: e["timestamp"])
                sorted_by_recv = sorted(events, key=lambda e: e["received_at"])
                if [e["id"] for e in sorted_by_ts] != [e["id"] for e in sorted_by_recv]:
                    logger.info("Out-of-order events detected for transaction %s", tid)

        except Exception as exc:
            logger.error("Auto-heal cycle error: %s", exc)

        await asyncio.sleep(interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    detector.train()
    task = asyncio.create_task(auto_heal_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(lifespan=lifespan)


@app.post("/webhook")
async def ingest_webhook(payload: WebhookPayload):
    idempotency_key = f"{payload.transaction_id}:{payload.status}"

    if database.event_exists(idempotency_key):
        return JSONResponse(status_code=200, content={"status": "duplicate"})

    anomaly_score, is_anomaly = detector.score(payload.model_dump())
    received_at = datetime.now(timezone.utc).isoformat()

    event = {
        "idempotency_key": idempotency_key,
        "transaction_id": payload.transaction_id,
        "status": payload.status,
        "timestamp": payload.timestamp,
        "payload": json.dumps(payload.model_dump()),
        "received_at": received_at,
        "anomaly_score": anomaly_score,
        "is_anomaly": int(is_anomaly),
        "is_healed": 0,
        "healed_at": None,
    }

    try:
        database.insert_event(event)
    except IntegrityError:
        return JSONResponse(status_code=200, content={"status": "duplicate"})

    return JSONResponse(status_code=200, content={"status": "ok"})


@app.get("/metrics")
async def get_metrics():
    return database.get_metrics()


@app.get("/events")
async def get_events(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    return database.get_events(page=page, page_size=page_size)


@app.get("/")
async def serve_dashboard():
    index_path = Path("static/index.html")
    if index_path.exists():
        return FileResponse(str(index_path))
    return JSONResponse({"message": "Dashboard not yet available"})
