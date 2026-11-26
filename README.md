# Time Matrix

A Flask-backed Time Management Matrix web app with SQLite persistence.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

The app creates `time_matrix.sqlite3` automatically in the project folder. Set
`TIME_MATRIX_DATABASE` to use another SQLite path and `TIME_MATRIX_SECRET_KEY`
to use a custom Flask session secret.

## Features

- Create backend users with login/logout.
- Keep each user's matrix and report data separate in SQLite.
- Save user profile name and email.
- Create tasks inside any quadrant.
- Drag active tasks between quadrants.
- Move tasks with a dropdown when dragging is inconvenient.
- Keep long task lists inside fixed-height scrollable quadrants.
- Search tasks inside each quadrant.
- Select visible tasks and bulk move, complete, or delete them.
- Toggle compact mode for denser task lists.
- Complete a task with its checkbox.
- Completed tasks move to the Report page in the same quadrant.
- Restore completed tasks back to the active matrix.
- Track time, productivity, feeling, notes, and movement history.
- Store user accounts, task data, and conference notes in the Flask backend database.
- Print the report as a PDF-friendly page.

## Backend Notes

Flask serves the static frontend and exposes JSON endpoints under `/api`.
Passwords are hashed with Werkzeug before being saved. Browser local storage is
only used for UI preferences such as compact mode and per-quadrant filters.
