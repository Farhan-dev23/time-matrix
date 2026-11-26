import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from flask import Flask, abort, g, jsonify, request, send_from_directory, session
from flask import current_app
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash


BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "www"
DATABASE_PATH = Path(os.environ.get("TIME_MATRIX_DATABASE", BASE_DIR / "time_matrix.sqlite3"))
QUADRANTS = {"reactive", "proactive", "deceptive", "escapist"}
LEGACY_QUADRANT_MAP = {
    "reduceTime": "deceptive",
    "avoidAction": "escapist",
}
STATUSES = {"active", "completed"}
DEFAULT_PRIORITY = "Priority 3"
PRIORITIES = {f"Priority {index}" for index in range(1, 6)}


def create_app():
    app = Flask(__name__, static_folder=None)
    app.config["SECRET_KEY"] = os.environ.get("TIME_MATRIX_SECRET_KEY", "time-matrix-dev-secret")
    app.config["SECRET_KEY"] = os.environ.get("TIME_MATRIX_SECRET_KEY", "time-matrix-dev-secret")
    init_db()

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Auth-Token"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        
        # Strictly prevent caching of API responses (especially auth endpoints)
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            
        return response

    @app.route("/api/<path:dummy>", methods=["OPTIONS"])
    def handle_options(dummy=""):
        return "", 204

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify({"error": error.description or error.name}), error.code

    @app.errorhandler(sqlite3.IntegrityError)
    def handle_integrity_error(error):
        app.logger.warning("Database integrity error: %s", error)
        return jsonify({"error": "That record already exists."}), 409

    @app.teardown_appcontext
    def close_db(error=None):
        db = g.pop("db", None)
        if db is not None:
            db.close()

    @app.get("/")
    def index():
        if (WEB_DIR / "index.html").is_file():
            return send_from_directory(WEB_DIR, "index.html")
        return send_from_directory(BASE_DIR, "index.html")

    @app.get("/api/download-apk")
    @app.get("/download-apk")
    def download_apk():
        for candidate in [
            BASE_DIR / "time-matrix.apk",
            WEB_DIR / "time-matrix.apk",
            BASE_DIR / "android" / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk",
        ]:
            if candidate.is_file():
                return send_from_directory(
                    candidate.parent,
                    candidate.name,
                    as_attachment=True,
                    download_name="TimeMatrix.apk",
                )
        abort(404, "APK file not found.")


    @app.get("/api/session")
    def get_session():
        user = current_user()
        if not user:
            return jsonify({"user": None, "state": None, "token": None})
        return jsonify({"user": public_user(user), "token": create_jwt_token(user["id"]), "state": load_user_state(user["id"])})

    @app.post("/api/register")
    def register():
        data = request.get_json(force=True, silent=True) or {}
        name = clean_text(data.get("name"), 60)
        email = normalize_email(data.get("email"))
        password = str(data.get("password") or "")

        if not name:
            abort(400, "Name is required.")
        if not email:
            abort(400, "Valid email is required.")
        if len(password) < 6:
            abort(400, "Password should be at least 6 characters.")
        if get_user_by_email(email):
            abort(409, "A user already exists with that email.")

        now = utc_now()
        user_id = f"user-{uuid.uuid4()}"
        db = get_db()
        with db:
            db.execute(
                """
                INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (user_id, name, email, generate_password_hash(password), now, now),
            )
            db.execute(
                """
                INSERT INTO user_states (user_id, last_updated, updated_at)
                VALUES (?, ?, ?)
                """,
                (user_id, now, now),
            )

        user = get_user_by_id(user_id)
        return jsonify({"user": public_user(user), "token": create_jwt_token(user_id), "state": load_user_state(user_id)}), 201

    @app.post("/api/login")
    def login():
        data = request.get_json(force=True, silent=True) or {}
        email = normalize_email(data.get("email"))
        password = str(data.get("password") or "")
        if not email or not password:
            abort(400, "Email and password are required.")

        user = get_user_by_email(email)

        if not user:
            # Auto-create account if user is logging in for the first time
            now = utc_now()
            user_id = f"user-{uuid.uuid4()}"
            name = email.split("@")[0].title()
            db = get_db()
            with db:
                db.execute(
                    """
                    INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (user_id, name, email, generate_password_hash(password), now, now),
                )
                db.execute(
                    """
                    INSERT INTO user_states (user_id, last_updated, updated_at)
                    VALUES (?, ?, ?)
                    """,
                    (user_id, now, now),
                )
            user = get_user_by_id(user_id)
        elif not check_password_hash(user["password_hash"], password):
            abort(401, "Incorrect password for this email account.")

        return jsonify({"user": public_user(user), "token": create_jwt_token(user["id"]), "state": load_user_state(user["id"])})

    @app.post("/api/logout")
    def logout():
        return jsonify({"ok": True})

    @app.put("/api/profile")
    def update_profile():
        user = require_user()
        data = request.get_json(force=True, silent=True) or {}
        name = clean_text(data.get("name"), 60)
        email = normalize_email(data.get("email"))

        if not name or not email:
            abort(400, "Name and email are required.")

        duplicate = get_user_by_email(email)
        if duplicate and duplicate["id"] != user["id"]:
            abort(409, "That email is already used.")

        now = utc_now()
        with get_db():
            get_db().execute(
                "UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?",
                (name, email, now, user["id"]),
            )

        return jsonify({"user": public_user(get_user_by_id(user["id"]))})

    @app.get("/api/state")
    def get_state():
        user = require_user()
        return jsonify({"state": load_user_state(user["id"])})

    @app.put("/api/state")
    def save_state():
        user = require_user()
        data = request.get_json(force=True, silent=True) or {}
        state = save_user_state(user["id"], data)
        return jsonify({"state": state})

    @app.get("/api/conference-notes")
    def get_conference_notes():
        user = require_user()
        return jsonify({"people": load_conference_notes(user["id"])})

    @app.put("/api/conference-notes")
    def save_conference_notes_endpoint():
        user = require_user()
        data = request.get_json(force=True, silent=True) or {}
        people = save_user_conference_notes(user["id"], data)
        return jsonify({"people": people})

    @app.get("/api/bucket-list")
    def get_bucket_list():
        user = require_user()
        return jsonify({"quadrants": load_bucket_list(user["id"])})

    @app.put("/api/bucket-list")
    def save_bucket_list_endpoint():
        user = require_user()
        data = request.get_json(force=True, silent=True) or {}
        quadrants = save_user_bucket_list(user["id"], data)
        return jsonify({"quadrants": quadrants})

    @app.get("/api/goal-tracker")
    def get_goal_tracker():
        user = require_user()
        return jsonify({"goalTracker": load_goal_tracker(user["id"])})

    @app.put("/api/goal-tracker")
    def save_goal_tracker_endpoint():
        user = require_user()
        data = request.get_json(force=True, silent=True) or {}
        goal_tracker = save_user_goal_tracker(user["id"], data)
        return jsonify({"goalTracker": goal_tracker})

    @app.get("/<path:path>")
    def static_file(path):
        if path.startswith("api/"):
            abort(404, "API endpoint not found.")
        requested_web = WEB_DIR / path
        if requested_web.is_file():
            return send_from_directory(WEB_DIR, path)
        requested_base = BASE_DIR / path
        if requested_base.is_file():
            return send_from_directory(BASE_DIR, path)
        if (WEB_DIR / "index.html").is_file():
            return send_from_directory(WEB_DIR, "index.html")
        return send_from_directory(BASE_DIR, "index.html")

    return app


def get_db():
    if "db" not in g:
        DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(DATABASE_PATH)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
        db.execute("PRAGMA journal_mode = WAL")
        db.execute("PRAGMA synchronous = NORMAL")
        g.db = db
    return g.db


def init_db():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DATABASE_PATH)
    try:
        db.execute("PRAGMA foreign_keys = ON")
        db.execute("PRAGMA journal_mode = WAL")
        db.execute("PRAGMA synchronous = NORMAL")
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE COLLATE NOCASE,
              password_hash TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_states (
              user_id TEXT PRIMARY KEY,
              last_updated TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tasks (
              user_id TEXT NOT NULL,
              id TEXT NOT NULL,
              position INTEGER NOT NULL DEFAULT 0,
              title TEXT NOT NULL,
              notes TEXT NOT NULL DEFAULT '',
              quadrant TEXT NOT NULL,
              original_quadrant TEXT NOT NULL,
              minutes INTEGER NOT NULL DEFAULT 0,
              priority TEXT NOT NULL DEFAULT 'Priority 3',
              is_starred INTEGER NOT NULL DEFAULT 0,
              productivity TEXT NOT NULL,
              feeling TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              completed_at TEXT,
              completed_quadrant TEXT,
              history_json TEXT NOT NULL DEFAULT '[]',
              PRIMARY KEY (user_id, id),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed_at);

            CREATE TABLE IF NOT EXISTS conference_people (
              user_id TEXT NOT NULL,
              id TEXT NOT NULL,
              position INTEGER NOT NULL DEFAULT 0,
              name TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              PRIMARY KEY (user_id, id),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS conference_notes (
              user_id TEXT NOT NULL,
              person_id TEXT NOT NULL,
              id TEXT NOT NULL,
              position INTEGER NOT NULL DEFAULT 0,
              text TEXT NOT NULL,
              completed INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              completed_at TEXT,
              PRIMARY KEY (user_id, person_id, id),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id, person_id) REFERENCES conference_people(user_id, id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_conference_people_user_position
              ON conference_people(user_id, position);
            CREATE INDEX IF NOT EXISTS idx_conference_notes_user_person_position
              ON conference_notes(user_id, person_id, position);
            CREATE INDEX IF NOT EXISTS idx_conference_notes_user_completed
              ON conference_notes(user_id, completed_at);

            CREATE TABLE IF NOT EXISTS bucket_quadrants (
              user_id TEXT NOT NULL,
              id TEXT NOT NULL,
              position INTEGER NOT NULL DEFAULT 0,
              title TEXT NOT NULL,
              color TEXT NOT NULL DEFAULT '#3b82f6',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              PRIMARY KEY (user_id, id),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS bucket_items (
              user_id TEXT NOT NULL,
              quadrant_id TEXT NOT NULL,
              id TEXT NOT NULL,
              position INTEGER NOT NULL DEFAULT 0,
              title TEXT NOT NULL,
              remarks TEXT NOT NULL DEFAULT '',
              goal_date TEXT NOT NULL,
              is_achieved INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              achieved_at TEXT,
              PRIMARY KEY (user_id, quadrant_id, id),
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (user_id, quadrant_id) REFERENCES bucket_quadrants(user_id, id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_bucket_quadrants_user_position
              ON bucket_quadrants(user_id, position);
            CREATE INDEX IF NOT EXISTS idx_bucket_items_user_quadrant_position
              ON bucket_items(user_id, quadrant_id, position);

            CREATE TABLE IF NOT EXISTS user_goal_trackers (
              user_id TEXT PRIMARY KEY,
              goal_title TEXT NOT NULL DEFAULT '',
              month_year TEXT NOT NULL DEFAULT '',
              reward TEXT NOT NULL DEFAULT '',
              notes TEXT NOT NULL DEFAULT '',
              theme TEXT NOT NULL DEFAULT 'pastel',
              tasks_json TEXT NOT NULL DEFAULT '[]',
              months_json TEXT NOT NULL DEFAULT '{}',
              updated_at TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        ensure_task_columns(db)
        ensure_goal_tracker_columns(db)
        db.commit()
    finally:
        db.close()


def ensure_task_columns(db):
    columns = {row[1] for row in db.execute("PRAGMA table_info(tasks)").fetchall()}
    if "priority" not in columns:
        db.execute("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'Priority 3'")
    if "is_starred" not in columns:
        db.execute("ALTER TABLE tasks ADD COLUMN is_starred INTEGER NOT NULL DEFAULT 0")


def ensure_goal_tracker_columns(db):
    columns = {row[1] for row in db.execute("PRAGMA table_info(user_goal_trackers)").fetchall()}
    if "months_json" not in columns:
        db.execute("ALTER TABLE user_goal_trackers ADD COLUMN months_json TEXT NOT NULL DEFAULT '{}'")


def create_jwt_token(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=365)
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")

def current_user():
    auth_header = request.headers.get("X-Auth-Token") or request.headers.get("Authorization")
    if not auth_header:
        return None

    if auth_header.startswith("Bearer "):
        auth_header = auth_header[7:]
    token = auth_header.strip()
    
    if not token:
        return None

    user_id = None
    try:
        payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        user_id = payload.get("user_id")
    except jwt.ExpiredSignatureError:
        user_id = None
    except jwt.InvalidTokenError:
        # Fallback for old tokens (which were just the user_id string)
        if token.startswith("user-"):
            user_id = token

    if not user_id:
        return None

    return get_user_by_id(user_id)


def require_user():
    user = current_user()
    if not user:
        abort(401, "Login is required.")
    return user


def get_user_by_id(user_id):
    return get_db().execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()


def get_user_by_email(email):
    if not email:
        return None
    return get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()


def public_user(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "createdAt": user["created_at"],
        "updatedAt": user["updated_at"],
    }


def load_user_state(user_id):
    state_row = get_db().execute(
        "SELECT last_updated FROM user_states WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    rows = get_db().execute(
        """
        SELECT * FROM tasks
        WHERE user_id = ?
        ORDER BY position ASC, created_at DESC
        """,
        (user_id,),
    ).fetchall()

    return {
        "tasks": [task_from_row(row) for row in rows],
        "lastUpdated": state_row["last_updated"] if state_row else utc_now(),
    }


def save_user_state(user_id, data):
    tasks = data.get("tasks")
    if not isinstance(tasks, list):
        abort(400, "State must include a tasks array.")

    last_updated = clean_date(data.get("lastUpdated")) or utc_now()
    normalized_tasks = [normalize_task(task, index) for index, task in enumerate(tasks)]
    now = utc_now()
    db = get_db()
    with db:
        db.execute("DELETE FROM tasks WHERE user_id = ?", (user_id,))
        db.execute(
            """
            INSERT INTO user_states (user_id, last_updated, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              last_updated = excluded.last_updated,
              updated_at = excluded.updated_at
            """,
            (user_id, last_updated, now),
        )
        db.executemany(
            """
            INSERT INTO tasks (
              user_id, id, position, title, notes, quadrant, original_quadrant,
              minutes, priority, is_starred, productivity, feeling, status, created_at, updated_at,
              completed_at, completed_quadrant, history_json
            )
            VALUES (
              :user_id, :id, :position, :title, :notes, :quadrant, :original_quadrant,
              :minutes, :priority, :is_starred, :productivity, :feeling, :status, :created_at, :updated_at,
              :completed_at, :completed_quadrant, :history_json
            )
            """,
            [{**task, "user_id": user_id} for task in normalized_tasks],
        )

    return load_user_state(user_id)


def load_conference_notes(user_id):
    db = get_db()
    people_rows = db.execute(
        """
        SELECT *
        FROM conference_people
        WHERE user_id = ?
        ORDER BY position ASC, created_at ASC
        """,
        (user_id,),
    ).fetchall()
    note_rows = db.execute(
        """
        SELECT *
        FROM conference_notes
        WHERE user_id = ?
        ORDER BY person_id ASC, position ASC, created_at ASC
        """,
        (user_id,),
    ).fetchall()

    notes_by_person = {}
    for row in note_rows:
        notes_by_person.setdefault(row["person_id"], []).append(conference_note_from_row(row))

    return [
        conference_person_from_row(row, notes_by_person.get(row["id"], []))
        for row in people_rows
    ]


def save_user_conference_notes(user_id, data):
    raw_people = data.get("people") if isinstance(data, dict) else data
    if not isinstance(raw_people, list):
        abort(400, "Conference notes must include a people array.")

    people = normalize_conference_people(raw_people)
    now = utc_now()
    db = get_db()
    with db:
        db.execute("DELETE FROM conference_people WHERE user_id = ?", (user_id,))
        db.executemany(
            """
            INSERT INTO conference_people (
              user_id, id, position, name, created_at, updated_at
            )
            VALUES (
              :user_id, :id, :position, :name, :created_at, :updated_at
            )
            """,
            [
                {
                    "user_id": user_id,
                    "id": person["id"],
                    "position": person["position"],
                    "name": person["name"],
                    "created_at": person["created_at"],
                    "updated_at": person["updated_at"] or now,
                }
                for person in people
            ],
        )
        db.executemany(
            """
            INSERT INTO conference_notes (
              user_id, person_id, id, position, text, completed,
              created_at, updated_at, completed_at
            )
            VALUES (
              :user_id, :person_id, :id, :position, :text, :completed,
              :created_at, :updated_at, :completed_at
            )
            """,
            [
                {
                    "user_id": user_id,
                    "person_id": person["id"],
                    "id": note["id"],
                    "position": note["position"],
                    "text": note["text"],
                    "completed": note["completed"],
                    "created_at": note["created_at"],
                    "updated_at": note["updated_at"] or now,
                    "completed_at": note["completed_at"],
                }
                for person in people
                for note in person["notes"]
            ],
        )

    return load_conference_notes(user_id)


def normalize_conference_people(raw_people):
    normalized = []
    used_person_ids = set()

    for index, raw in enumerate(raw_people[:200]):
        if not isinstance(raw, dict):
            abort(400, "Every conference contact must be an object.")

        person_id = unique_clean_id(raw.get("id"), "person", used_person_ids)
        name = clean_text(raw.get("name"), 80) or "Unknown"
        created_at = clean_date(raw.get("createdAt") or raw.get("created_at")) or utc_now()
        updated_at = clean_date(raw.get("updatedAt") or raw.get("updated_at")) or created_at
        raw_notes = normalize_raw_conference_notes(raw.get("notes"))

        normalized.append(
            {
                "id": person_id,
                "position": index,
                "name": name,
                "created_at": created_at,
                "updated_at": updated_at,
                "notes": normalize_conference_note_list(raw_notes),
            }
        )

    return normalized


def normalize_raw_conference_notes(value):
    if isinstance(value, str):
        text = value.strip()
        return [{"text": text}] if text else []
    if isinstance(value, list):
        return value
    return []


def normalize_conference_note_list(raw_notes):
    normalized = []
    used_note_ids = set()

    for index, raw in enumerate(raw_notes[:1000]):
        if isinstance(raw, str):
            raw = {"text": raw}
        if not isinstance(raw, dict):
            abort(400, "Every conference note must be an object.")

        text = clean_text(raw.get("text"), 200)
        if not text:
            continue

        is_completed = bool(raw.get("completed"))
        created_at = clean_date(raw.get("createdAt") or raw.get("created_at")) or utc_now()
        updated_at = clean_date(raw.get("updatedAt") or raw.get("updated_at")) or created_at
        completed_at = clean_date(raw.get("completedAt") or raw.get("completed_at"))
        if is_completed and not completed_at:
            completed_at = updated_at

        normalized.append(
            {
                "id": unique_clean_id(raw.get("id"), "note", used_note_ids),
                "position": index,
                "text": text,
                "completed": 1 if is_completed else 0,
                "created_at": created_at,
                "updated_at": updated_at,
                "completed_at": completed_at if is_completed else None,
            }
        )

    return normalized


def unique_clean_id(value, prefix, used_ids):
    base_id = clean_text(value, 120)
    if not base_id:
        base_id = f"{prefix}-{uuid.uuid4()}"

    candidate = base_id
    while candidate in used_ids:
        candidate = f"{prefix}-{uuid.uuid4()}"

    used_ids.add(candidate)
    return candidate


def conference_person_from_row(row, notes):
    return {
        "id": row["id"],
        "name": row["name"],
        "notes": notes,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def conference_note_from_row(row):
    return {
        "id": row["id"],
        "text": row["text"],
        "completed": bool(row["completed"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "completedAt": row["completed_at"],
    }


def default_bucket_quadrants():
    now = utc_now()
    return [
        {
            "id": "bq-1",
            "title": "✈️ Travel & Adventure",
            "color": "#3b82f6",
            "createdAt": now,
            "updatedAt": now,
            "items": [
                { "id": "bi-1", "title": "Visit Northern Lights in Norway", "remarks": "Book winter tickets", "goalDate": "2026-12-31", "isAchieved": False, "createdAt": now, "updatedAt": now, "achievedAt": None },
                { "id": "bi-2", "title": "Road trip through Japan", "remarks": "Tokyo to Kyoto", "goalDate": "2027-05-15", "isAchieved": False, "createdAt": now, "updatedAt": now, "achievedAt": None }
            ]
        },
        {
            "id": "bq-2",
            "title": "🧠 Personal Growth & Learning",
            "color": "#10b981",
            "createdAt": now,
            "updatedAt": now,
            "items": [
                { "id": "bi-3", "title": "Read 24 books this year", "remarks": "2 books per month", "goalDate": "2026-12-31", "isAchieved": False, "createdAt": now, "updatedAt": now, "achievedAt": None },
                { "id": "bi-4", "title": "Master Python & AI Agents", "remarks": "Build daily projects", "goalDate": "2026-10-01", "isAchieved": False, "createdAt": now, "updatedAt": now, "achievedAt": None }
            ]
        },
        {
            "id": "bq-3",
            "title": "💪 Health & Fitness Goals",
            "color": "#f59e0b",
            "createdAt": now,
            "updatedAt": now,
            "items": [
                { "id": "bi-5", "title": "Run a 10K Marathon", "remarks": "Train 3x a week", "goalDate": "2026-11-20", "isAchieved": False, "createdAt": now, "updatedAt": now, "achievedAt": None }
            ]
        },
        {
            "id": "bq-4",
            "title": "💼 Career & Financial Milestones",
            "color": "#8b5cf6",
            "createdAt": now,
            "updatedAt": now,
            "items": [
                { "id": "bi-6", "title": "Launch Time Matrix Mobile App", "remarks": "Sync Android APK & Web", "goalDate": "2026-09-01", "isAchieved": True, "createdAt": now, "updatedAt": now, "achievedAt": now }
            ]
        }
    ]


def load_bucket_list(user_id):
    db = get_db()
    quadrant_rows = db.execute(
        """
        SELECT *
        FROM bucket_quadrants
        WHERE user_id = ?
        ORDER BY position ASC, created_at ASC
        """,
        (user_id,),
    ).fetchall()
    if not quadrant_rows:
        return default_bucket_quadrants()

    item_rows = db.execute(
        """
        SELECT *
        FROM bucket_items
        WHERE user_id = ?
        ORDER BY quadrant_id ASC, position ASC, created_at ASC
        """,
        (user_id,),
    ).fetchall()

    items_by_quadrant = {}
    for row in item_rows:
        items_by_quadrant.setdefault(row["quadrant_id"], []).append(bucket_item_from_row(row))

    return [
        bucket_quadrant_from_row(row, items_by_quadrant.get(row["id"], []))
        for row in quadrant_rows
    ]


def bucket_quadrant_from_row(row, items):
    return {
        "id": row["id"],
        "title": row["title"],
        "color": row["color"],
        "items": items,
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def bucket_item_from_row(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "remarks": row["remarks"],
        "goalDate": row["goal_date"],
        "isAchieved": bool(row["is_achieved"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "achievedAt": row["achieved_at"],
    }


def save_user_bucket_list(user_id, data):
    raw_quadrants = data.get("quadrants") if isinstance(data, dict) else data
    if not isinstance(raw_quadrants, list):
        abort(400, "Bucket list must include a quadrants array.")

    quadrants = normalize_bucket_quadrants(raw_quadrants)
    now = utc_now()
    db = get_db()
    with db:
        db.execute("DELETE FROM bucket_items WHERE user_id = ?", (user_id,))
        db.execute("DELETE FROM bucket_quadrants WHERE user_id = ?", (user_id,))
        db.executemany(
            """
            INSERT INTO bucket_quadrants (
              user_id, id, position, title, color, created_at, updated_at
            )
            VALUES (
              :user_id, :id, :position, :title, :color, :created_at, :updated_at
            )
            """,
            [
                {
                    "user_id": user_id,
                    "id": quad["id"],
                    "position": quad["position"],
                    "title": quad["title"],
                    "color": quad["color"],
                    "created_at": quad["created_at"],
                    "updated_at": quad["updated_at"] or now,
                }
                for quad in quadrants
            ],
        )
        db.executemany(
            """
            INSERT INTO bucket_items (
              user_id, quadrant_id, id, position, title, remarks, goal_date, is_achieved,
              created_at, updated_at, achieved_at
            )
            VALUES (
              :user_id, :quadrant_id, :id, :position, :title, :remarks, :goal_date, :is_achieved,
              :created_at, :updated_at, :achieved_at
            )
            """,
            [
                {
                    "user_id": user_id,
                    "quadrant_id": quad["id"],
                    "id": item["id"],
                    "position": item["position"],
                    "title": item["title"],
                    "remarks": item["remarks"],
                    "goal_date": item["goal_date"],
                    "is_achieved": item["is_achieved"],
                    "created_at": item["created_at"],
                    "updated_at": item["updated_at"] or now,
                    "achieved_at": item["achieved_at"],
                }
                for quad in quadrants
                for item in quad["items"]
            ],
        )

    return load_bucket_list(user_id)


def normalize_bucket_quadrants(raw_quadrants):
    normalized = []
    used_quadrant_ids = set()

    for index, raw in enumerate(raw_quadrants):
        if not isinstance(raw, dict):
            abort(400, "Every bucket quadrant must be an object.")

        quadrant_id = unique_clean_id(raw.get("id"), "bucket-quadrant", used_quadrant_ids)
        title = clean_text(raw.get("title"), 80) or "Untitled Quadrant"
        color = clean_text(raw.get("color"), 30) or "#3b82f6"
        created_at = clean_date(raw.get("createdAt") or raw.get("created_at")) or utc_now()
        updated_at = clean_date(raw.get("updatedAt") or raw.get("updated_at")) or created_at
        raw_items = raw.get("items") if isinstance(raw.get("items"), list) else []

        normalized.append(
            {
                "id": quadrant_id,
                "position": index,
                "title": title,
                "color": color,
                "created_at": created_at,
                "updated_at": updated_at,
                "items": normalize_bucket_items(raw_items),
            }
        )

    return normalized


def normalize_bucket_items(raw_items):
    normalized = []
    used_item_ids = set()

    for index, raw in enumerate(raw_items[:500]):
        if not isinstance(raw, dict):
            abort(400, "Every bucket item must be an object.")

        title = clean_text(raw.get("title"), 120)
        if not title:
            continue

        remarks = clean_text(raw.get("remarks"), 500)
        goal_date = clean_date(raw.get("goalDate") or raw.get("goal_date")) or utc_now()[:10]
        is_achieved = bool(raw.get("isAchieved") or raw.get("is_achieved"))
        created_at = clean_date(raw.get("createdAt") or raw.get("created_at")) or utc_now()
        updated_at = clean_date(raw.get("updatedAt") or raw.get("updated_at")) or created_at
        achieved_at = clean_date(raw.get("achievedAt") or raw.get("achieved_at"))
        if is_achieved and not achieved_at:
            achieved_at = updated_at

        normalized.append(
            {
                "id": unique_clean_id(raw.get("id"), "bucket-item", used_item_ids),
                "position": index,
                "title": title,
                "remarks": remarks,
                "goal_date": goal_date,
                "is_achieved": 1 if is_achieved else 0,
                "created_at": created_at,
                "updated_at": updated_at,
                "achieved_at": achieved_at if is_achieved else None,
            }
        )

    return normalized


def load_goal_tracker(user_id):
    db = get_db()
    row = db.execute(
        "SELECT * FROM user_goal_trackers WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    if not row:
        return default_goal_tracker_data()
    try:
        tasks = json.loads(row["tasks_json"] or "[]")
    except json.JSONDecodeError:
        tasks = []

    try:
        months_data = json.loads(row["months_json"] if "months_json" in row.keys() else "{}")
    except (json.JSONDecodeError, TypeError, KeyError):
        months_data = {}

    return {
        "goalTitle": row["goal_title"],
        "monthYear": row["month_year"],
        "reward": row["reward"],
        "notes": row["notes"],
        "theme": row["theme"] or "pastel",
        "tasks": tasks if isinstance(tasks, list) else [],
        "monthsData": months_data if isinstance(months_data, dict) else {},
        "updatedAt": row["updated_at"],
    }


def default_goal_tracker_data():
    now = datetime.now()
    now_month_name = now.strftime("%B %Y")
    now_year = now.year
    now_month = now.month
    return {
        "goalTitle": "Monthly Consistency & Habit Goal",
        "monthYear": now_month_name,
        "year": now_year,
        "month": now_month,
        "reward": "Treat myself to a favorite dinner or trip! ✈️",
        "notes": "Small daily steps lead to massive long-term results.",
        "theme": "pastel",
        "tasks": [
            {
                "id": "gt-1",
                "title": "Waking Up Early",
                "uom": "Daily",
                "icon": "🌅",
                "score": 10,
                "scores": [0] * 31,
                "checks": [False] * 31,
            },
            {
                "id": "gt-2",
                "title": "Workout / Exercise",
                "uom": "30-45m",
                "icon": "🏋️",
                "score": 10,
                "scores": [0] * 31,
                "checks": [False] * 31,
            },
            {
                "id": "gt-3",
                "title": "Read Book (20 min)",
                "uom": "20 min",
                "icon": "📖",
                "score": 5,
                "scores": [0] * 31,
                "checks": [False] * 31,
            },
            {
                "id": "gt-4",
                "title": "Deep Work / Study",
                "uom": "60-90m",
                "icon": "📝",
                "score": 10,
                "scores": [0] * 31,
                "checks": [False] * 31,
            },
            {
                "id": "gt-5",
                "title": "Sleep On Time",
                "uom": "10:30 PM",
                "icon": "🛌",
                "score": 5,
                "scores": [0] * 31,
                "checks": [False] * 31,
            },
        ],
        "monthsData": {},
        "updatedAt": utc_now(),
    }


def save_user_goal_tracker(user_id, data):
    raw = data.get("goalTracker") if isinstance(data, dict) and "goalTracker" in data else data
    if not isinstance(raw, dict):
        raw = {}

    goal_title = clean_text(raw.get("goalTitle") or raw.get("goal_title"), 120)
    month_year = clean_text(raw.get("monthYear") or raw.get("month_year"), 60)
    try:
        year = int(raw.get("year") or datetime.now().year)
    except (ValueError, TypeError):
        year = datetime.now().year
    try:
        month = int(raw.get("month") or datetime.now().month)
    except (ValueError, TypeError):
        month = datetime.now().month

    reward = clean_text(raw.get("reward"), 200)
    notes = clean_text(raw.get("notes"), 800)
    theme = clean_text(raw.get("theme"), 30) or "pastel"
    raw_tasks = raw.get("tasks") if isinstance(raw.get("tasks"), list) else []
    raw_months = raw.get("monthsData") or raw.get("months_data")
    months_data = raw_months if isinstance(raw_months, dict) else {}

    normalized_tasks = []
    used_ids = set()
    for index, task_raw in enumerate(raw_tasks[:50]):
        if not isinstance(task_raw, dict):
            continue
        title = clean_text(task_raw.get("title"), 120) or "Untitled Task"
        uom = clean_text(task_raw.get("uom"), 30) or ""
        icon = clean_text(task_raw.get("icon"), 20) or "🎯"
        try:
            score = max(1, min(100, int(task_raw.get("score") or 10)))
        except (ValueError, TypeError):
            score = 10

        raw_scores = task_raw.get("scores")
        raw_checks = task_raw.get("checks")
        scores = []
        checks = []

        for i in range(31):
            sc_val = 0
            if isinstance(raw_scores, list) and i < len(raw_scores):
                try:
                    sc_val = max(0, min(100, int(raw_scores[i] or 0)))
                except (ValueError, TypeError):
                    sc_val = 0
            elif isinstance(raw_checks, list) and i < len(raw_checks):
                sc_val = score if bool(raw_checks[i]) else 0

            scores.append(sc_val)
            checks.append(sc_val > 0)

        task_id = unique_clean_id(task_raw.get("id"), "gt-task", used_ids)
        normalized_tasks.append({
            "id": task_id,
            "title": title,
            "uom": uom,
            "icon": icon,
            "score": score,
            "scores": scores,
            "checks": checks,
        })

    now = utc_now()
    db = get_db()
    with db:
        db.execute(
            """
            INSERT INTO user_goal_trackers (
              user_id, goal_title, month_year, reward, notes, theme, tasks_json, months_json, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              goal_title = excluded.goal_title,
              month_year = excluded.month_year,
              reward = excluded.reward,
              notes = excluded.notes,
              theme = excluded.theme,
              tasks_json = excluded.tasks_json,
              months_json = excluded.months_json,
              updated_at = excluded.updated_at
            """,
            (
                user_id,
                goal_title,
                month_year,
                reward,
                notes,
                theme,
                json.dumps(normalized_tasks),
                json.dumps(months_data),
                now,
            ),
        )
    return load_goal_tracker(user_id)



def normalize_task(raw, position):
    if not isinstance(raw, dict):
        abort(400, "Every task must be an object.")

    now = utc_now()
    quadrant = normalize_quadrant(raw.get("quadrant"))
    original_quadrant = normalize_quadrant(
        raw.get("originalQuadrant") or raw.get("original_quadrant"),
        quadrant,
    )
    completed_quadrant = raw.get("completedQuadrant") or raw.get("completed_quadrant")
    if completed_quadrant:
        completed_quadrant = normalize_quadrant(completed_quadrant, quadrant)

    status = str(raw.get("status") or "active")
    if status not in STATUSES:
        status = "active"

    task_id = clean_text(raw.get("id"), 120) or f"task-{uuid.uuid4()}"
    title = clean_text(raw.get("title"), 90)
    if not title:
        abort(400, "Task title is required.")

    return {
        "id": task_id,
        "position": position,
        "title": title,
        "notes": clean_text(raw.get("notes"), 600),
        "quadrant": quadrant,
        "original_quadrant": original_quadrant,
        "minutes": clamp_minutes(raw.get("minutes")),
        "priority": normalize_priority(raw.get("priority")),
        "is_starred": 1 if raw.get("isStarred") or raw.get("is_starred") else 0,
        "productivity": clean_text(raw.get("productivity"), 40) or "Medium",
        "feeling": clean_text(raw.get("feeling"), 40) or "Calm",
        "status": status,
        "created_at": clean_date(raw.get("createdAt")) or now,
        "updated_at": clean_date(raw.get("updatedAt")) or now,
        "completed_at": clean_date(raw.get("completedAt")),
        "completed_quadrant": completed_quadrant,
        "history_json": json.dumps(clean_history(raw.get("history"))),
    }


def task_from_row(row):
    try:
        history = json.loads(row["history_json"] or "[]")
    except json.JSONDecodeError:
        history = []

    return {
        "id": row["id"],
        "position": row["position"],
        "title": row["title"],
        "notes": row["notes"],
        "quadrant": normalize_quadrant(row["quadrant"]),
        "originalQuadrant": normalize_quadrant(row["original_quadrant"]),
        "minutes": row["minutes"],
        "priority": normalize_priority(row["priority"]),
        "isStarred": bool(row["is_starred"]),
        "productivity": row["productivity"],
        "feeling": row["feeling"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "completedAt": row["completed_at"],
        "completedQuadrant": (
            normalize_quadrant(row["completed_quadrant"]) if row["completed_quadrant"] else None
        ),
        "history": history if isinstance(history, list) else [],
    }


def normalize_quadrant(value, fallback="proactive"):
    raw = str(value or "").strip()
    if raw in LEGACY_QUADRANT_MAP:
        return LEGACY_QUADRANT_MAP[raw]
    if raw in QUADRANTS:
        return raw
    return fallback if fallback in QUADRANTS else "proactive"


def clean_history(value):
    if not isinstance(value, list):
        return []
    cleaned = []
    for item in value[:100]:
        if isinstance(item, dict):
            cleaned.append({str(key): item[key] for key in item if isinstance(key, str)})
    return cleaned


def clean_text(value, limit):
    return str(value or "").strip()[:limit]


def normalize_priority(value):
    priority = clean_text(value, 20).lower()
    legacy = {
        "high": "Priority 1",
        "medium": DEFAULT_PRIORITY,
        "low": "Priority 5",
    }
    if priority in legacy:
        return legacy[priority]

    number = priority.replace("priority", "").replace("p", "", 1).replace("#", "").replace("-", "").strip()
    if number in {"1", "2", "3", "4", "5"}:
        return f"Priority {number}"

    return DEFAULT_PRIORITY


def normalize_email(value):
    return clean_text(value, 255).lower()


def clean_date(value):
    if not value:
        return None
    return str(value)[:40]


def clamp_minutes(value):
    try:
        minutes = round(float(value))
    except (TypeError, ValueError):
        return 0
    return max(0, min(1440, minutes))


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


app = create_app()


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", 10000))
    app.run(host=host, port=port, debug=True)
