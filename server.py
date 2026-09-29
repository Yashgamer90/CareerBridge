from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
DATA.mkdir(exist_ok=True)

USERS = DATA / "users.txt"
APPLICATIONS = DATA / "applications.txt"
JOBS = DATA / "jobs.txt"

app = Flask(__name__, static_folder=str(BASE), static_url_path="")


# -----------------------------
# USER FUNCTIONS
# -----------------------------

def read_users():
    rows = []

    if USERS.exists():
        for line in USERS.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue

            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                pass

    return rows


def save_user(user):
    with USERS.open("a", encoding="utf-8") as f:
        f.write(json.dumps(user, ensure_ascii=False) + "\n")


# -----------------------------
# JOB FUNCTIONS
# -----------------------------

def read_jobs():
    rows = []

    if JOBS.exists():
        for line in JOBS.read_text(encoding="utf-8").splitlines():

            parts = line.split("|")

            if len(parts) >= 8:
                rows.append({
                    "id": parts[0],
                    "title": parts[1],
                    "company": parts[2],
                    "location": parts[3],
                    "experience": parts[4],
                    "salary": parts[5],
                    "skills": parts[6],
                    "type": parts[7]
                })

    return rows


# -----------------------------
# HOME / STATIC FILES
# -----------------------------

@app.get("/")
def home():
    return send_from_directory(BASE, "index.html")


@app.get("/<path:name>")
def files(name):
    return send_from_directory(BASE, name)


# -----------------------------
# REGISTER
# -----------------------------

@app.post("/api/register")
def register():

    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "Student / Job Seeker")

    if not name or not email or len(password) < 6:
        return jsonify(
            ok=False,
            message="Name, valid email and 6+ character password are required."
        ), 400

    users = read_users()

    if any(user.get("email") == email for user in users):
        return jsonify(
            ok=False,
            message="An account with this email already exists."
        ), 409

    user = {
        "name": name,
        "email": email,
        "password": generate_password_hash(password),
        "role": role
    }

    save_user(user)

    return jsonify(
        ok=True,
        message="Account created successfully",
        user={
            "name": name,
            "email": email,
            "role": role
        }
    )


# -----------------------------
# LOGIN
# -----------------------------

@app.post("/api/login")
def login():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    for user in read_users():

        if (
            user.get("email") == email
            and check_password_hash(
                user.get("password", ""),
                password
            )
        ):

            return jsonify(
                ok=True,
                message="Login successful",
                user={
                    "name": user.get("name"),
                    "email": email,
                    "role": user.get("role")
                }
            )

    return jsonify(
        ok=False,
        message="Invalid email or password."
    ), 401


# -----------------------------
# JOB SEARCH
# -----------------------------

@app.get("/api/jobs")
def jobs():

    q = request.args.get("q", "").strip().lower()
    location = request.args.get("location", "").strip().lower()
    experience = request.args.get("experience", "").strip().lower()

    rows = read_jobs()

    def match(job):

        text = " ".join([
            job["title"],
            job["company"],
            job["skills"],
            job["location"]
        ]).lower()

        return (
            (not q or q in text)
            and
            (not location or location in job["location"].lower())
            and
            (not experience or experience == job["experience"].lower())
        )

    return jsonify(
        ok=True,
        jobs=[job for job in rows if match(job)]
    )


# -----------------------------
# SMART JOB MATCH
# -----------------------------

def normalize_skills(value):
    if isinstance(value, list):
        raw = value
    else:
        raw = str(value or '').replace(';', ',').split(',')
    return {item.strip().lower() for item in raw if item.strip()}

@app.post("/api/match-jobs")
def match_jobs():
    data = request.get_json(silent=True) or {}
    user_skills = normalize_skills(data.get("skills", []))
    if not user_skills:
        return jsonify(ok=False, message="Add at least one skill first."), 400
    results = []
    for job in read_jobs():
        required = normalize_skills(job.get("skills", ""))
        matched = sorted(user_skills & required)
        missing = sorted(required - user_skills)
        total = len(required)
        score = round((len(matched) / total) * 100) if total else 0
        results.append({**job, "matchScore": score, "matchedSkills": matched, "missingSkills": missing})
    results.sort(key=lambda item: item["matchScore"], reverse=True)
    return jsonify(ok=True, jobs=results)


# -----------------------------
# APPLY FOR JOB
# -----------------------------

@app.post("/api/applications")
def applications():

    data = request.get_json(silent=True) or {}

    # Required candidate information
    required = [
        "fullName",
        "phone",
        "email",
        "degree",
        "gradYear"
    ]

    for field in required:

        if not str(data.get(field, "")).strip():

            return jsonify(
                ok=False,
                message=f"{field} is required."
            ), 400


    # Find the selected job
    job_id = str(data.get("jobId", "")).strip()

    selected_job = None

    for job in read_jobs():

        if str(job["id"]) == job_id:
            selected_job = job
            break


    # If job is not found
    if not selected_job:

        return jsonify(
            ok=False,
            message="Selected job was not found."
        ), 404


    # Create application record
    application = {

        "applicationId":
            "APP" + datetime.now().strftime("%Y%m%d%H%M%S"),

        "userEmail":
            data.get("email", "").strip().lower(),

        "fullName":
            data.get("fullName", "").strip(),

        "phone":
            data.get("phone", "").strip(),

        "degree":
            data.get("degree", "").strip(),

        "gradYear":
            data.get("gradYear", "").strip(),

        # Optional fields
        "github":
            data.get("github", "").strip(),

        "linkedin":
            data.get("linkedin", "").strip(),

        "coverLetter":
            data.get("coverLetter", "").strip(),

        # Job information
        "jobId":
            selected_job["id"],

        "jobTitle":
            selected_job["title"],

        "company":
            selected_job["company"],

        "location":
            selected_job["location"],

        "appliedDate":
            datetime.now().strftime("%d %b %Y"),

        "status":
            "Applied"
    }


    # Save application
    with APPLICATIONS.open(
        "a",
        encoding="utf-8"
    ) as f:

        f.write(
            json.dumps(
                application,
                ensure_ascii=False
            ) + "\n"
        )


    return jsonify(
        ok=True,
        message="Application submitted successfully!",
        application=application
    )


# -----------------------------
# GET USER APPLICATIONS
# -----------------------------

@app.get("/api/applications")
def get_applications():

    email = request.args.get(
        "email",
        ""
    ).strip().lower()

    if not email:

        return jsonify(
            ok=False,
            message="Email is required."
        ), 400


    applications_list = []

    if APPLICATIONS.exists():

        for line in APPLICATIONS.read_text(
            encoding="utf-8"
        ).splitlines():

            if not line.strip():
                continue

            try:

                application = json.loads(line)

                if (
                    application.get(
                        "userEmail"
                    ) == email
                ):

                    applications_list.append(
                        application
                    )

            except json.JSONDecodeError:
                pass


    return jsonify(
        ok=True,
        applications=applications_list
    )


# -----------------------------
# BASIC STATS
# -----------------------------

@app.get("/api/stats")
def stats():

    return jsonify(
        users=len(read_users()),
        jobs=len(read_jobs())
    )


# -----------------------------
# START SERVER
# -----------------------------

if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )

