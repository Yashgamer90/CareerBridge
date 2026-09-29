const API_BASE = "";

/* =========================
   USER
========================= */

function saveUser(user) {
    localStorage.setItem(
        "careerbridgeUser",
        JSON.stringify(user)
    );
}

function getUser() {
    try {
        return JSON.parse(
            localStorage.getItem("careerbridgeUser")
        );
    } catch (e) {
        return null;
    }
}

/* =========================
   REGISTER
========================= */

async function registerUser(e) {
    e.preventDefault();

    const btn = e.target.querySelector(
        "button[type=submit]"
    );

    btn.disabled = true;
    btn.textContent = "Creating...";

    const payload = {
        name: document.getElementById("regName").value,
        email: document.getElementById("regEmail").value,
        password: document.getElementById("regPassword").value,
        role: document.getElementById("regRole").value
    };

    try {
        const response = await fetch(
            API_BASE + "/api/register",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Registration failed."
            );
        }

        saveUser(data.user);

        alert(data.message);

        location.href = "profile.html";

    } catch (error) {
        alert(error.message);

    } finally {
        btn.disabled = false;
        btn.textContent = "Create Account";
    }
}

/* =========================
   LOGIN
========================= */

async function loginUser(e) {
    e.preventDefault();

    const btn = e.target.querySelector(
        "button[type=submit]"
    );

    btn.disabled = true;
    btn.textContent = "Signing in...";

    const payload = {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
    };

    try {
        const response = await fetch(
            API_BASE + "/api/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Login failed."
            );
        }

        saveUser(data.user);

        if (
            data.user.role &&
            data.user.role.toLowerCase().includes("employer")
        ) {
            location.href = "industry.html";
        } else {
            location.href = "student.html";
        }

    } catch (error) {
        alert(error.message);

    } finally {
        btn.disabled = false;
        btn.textContent = "Sign In";
    }
}

/* =========================
   LOAD JOBS
========================= */

async function loadJobs() {
    const box = document.getElementById("jobsList");

    if (!box) return;

    const search =
        document.getElementById("jobSearch")?.value || "";

    const locationValue =
        document.getElementById("jobLocation")?.value || "";

    const experience =
        document.getElementById("jobExperience")?.value || "";

    box.innerHTML =
        '<div class="loading">Finding matching jobs...</div>';

    try {
        const url =
            API_BASE +
            "/api/jobs?q=" +
            encodeURIComponent(search) +
            "&location=" +
            encodeURIComponent(locationValue) +
            "&experience=" +
            encodeURIComponent(experience);

        const response = await fetch(url);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Unable to load jobs."
            );
        }

        if (!data.jobs || !data.jobs.length) {
            box.innerHTML = `
                <div class="empty-state">
                    <h3>No jobs found</h3>
                    <p>
                        Try another skill, company or location.
                    </p>
                </div>
            `;

            return;
        }

        box.innerHTML = data.jobs.map(job => `
            <article class="job-result">

                <div class="company-logo">
                    ${job.company.slice(0, 2).toUpperCase()}
                </div>

                <div class="job-main">

                    <div class="job-top">

                        <div>

                            <span class="pill">
                                ${job.type}
                            </span>

                            <h2>
                                ${job.title}
                            </h2>

                            <p class="company">
                                ${job.company}
                            </p>

                        </div>

                        <button
                            class="save-job"
                            onclick="this.classList.toggle('saved')"
                        >
                            ♡
                        </button>

                    </div>

                    <div class="job-meta">

                        <span>
                            📍 ${job.location}
                        </span>

                        <span>
                            💼 ${job.experience}
                        </span>

                        <span>
                            💰 ${job.salary}
                        </span>

                    </div>

                    <p class="skills">
                        ${job.skills}
                    </p>

                    <div class="job-bottom">

                        <small>
                            Posted on CareerBridge
                        </small>

                        <a
                            class="primary-btn"
                            href="applynow.html?job=${job.id}"
                        >
                            Apply Now
                        </a>

                    </div>

                </div>

            </article>
        `).join("");

    } catch (error) {
        box.innerHTML = `
            <div class="empty-state">

                <h3>Something went wrong</h3>

                <p>
                    ${error.message}
                </p>

            </div>
        `;
    }
}

/* =========================
   SMART JOB MATCH
========================= */

function getProfileSkills() {
    try {
        const skills = JSON.parse(localStorage.getItem("careerbridgeSkills") || "[]");
        return Array.isArray(skills) ? skills : [];
    } catch (e) { return []; }
}

function saveProfileSkills(skills) {
    localStorage.setItem("careerbridgeSkills", JSON.stringify(skills));
}

async function findSmartMatches() {
    const input = document.getElementById("profileSkills");
    const box = document.getElementById("smartMatchResults");
    if (!input || !box) return;
    const skills = input.value.split(",").map(skill => skill.trim()).filter(Boolean);
    if (!skills.length) {
        box.innerHTML = '<div class="empty-state"><h3>Add your skills</h3><p>Example: HTML, CSS, JavaScript, Python</p></div>';
        return;
    }
    saveProfileSkills(skills);
    box.innerHTML = '<div class="loading">Analyzing your skills...</div>';
    try {
        const response = await fetch(API_BASE + "/api/match-jobs", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({skills})});
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Matching failed.");
        box.innerHTML = data.jobs.slice(0,6).map(job => `
            <article class="job-result" style="margin-bottom:12px;">
                <div class="company-logo">${job.company.slice(0,2).toUpperCase()}</div>
                <div class="job-main"><div class="job-top"><div>
                    <span class="pill">${job.matchScore}% Match</span>
                    <h2>${job.title}</h2><p class="company">${job.company} • ${job.location}</p>
                </div></div>
                <p class="skills"><b>Matched:</b> ${job.matchedSkills.length ? job.matchedSkills.join(", ") : "None yet"}</p>
                <p class="skills"><b>Skill gap:</b> ${job.missingSkills.length ? job.missingSkills.join(", ") : "No major skill gap"}</p>
                <div class="job-bottom"><small>${job.salary} • ${job.type}</small><a class="primary-btn" href="applynow.html?job=${job.id}">View / Apply</a></div>
                </div></article>`).join("");
    } catch (error) {
        box.innerHTML = `<div class="empty-state"><h3>Unable to calculate matches</h3><p>${error.message}</p></div>`;
    }
}

function loadSavedSkills() {
    const input = document.getElementById("profileSkills");
    if (input) input.value = getProfileSkills().join(", ");
}

/* =========================
   SUBMIT APPLICATION
========================= */

async function submitApplication(e) {
    e.preventDefault();

    const btn = document.getElementById("submitBtn");

    btn.disabled = true;
    btn.innerHTML = "Submitting...";

    const params = new URLSearchParams(
        window.location.search
    );

    const jobId = params.get("job");

    if (!jobId) {
        alert("Job information is missing.");

        btn.disabled = false;
        btn.innerHTML = "Submit Application →";

        return;
    }

    const ids = [
        "fullName",
        "phone",
        "email",
        "degree",
        "gradYear",
        "github",
        "linkedin",
        "coverLetter"
    ];

    const data = {};

    ids.forEach(id => {
        const element = document.getElementById(id);

        data[id] = element
            ? element.value.trim()
            : "";
    });

    data.jobId = jobId;

    try {
        const response = await fetch(
            API_BASE + "/api/applications",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Application failed."
            );
        }

        alert(result.message);

        btn.innerHTML = "✓ Application Sent";
        btn.style.background = "#10b981";

    } catch (error) {
        alert(error.message);

        btn.disabled = false;
        btn.innerHTML = "Submit Application →";
    }
}

/* =========================
   LOAD MY APPLICATIONS
========================= */

async function loadMyApplications() {
    const box = document.getElementById(
        "applicationsList"
    );

    if (!box) return;

    const user = getUser();

    if (!user || !user.email) {
        box.innerHTML = `
            <div class="empty-state">

                <h3>Please login first</h3>

                <p>
                    Login to see your applications.
                </p>

                <a
                    class="primary-btn"
                    href="login.html"
                >
                    Login
                </a>

            </div>
        `;

        return;
    }

    box.innerHTML =
        '<div class="loading">Loading your applications...</div>';

    try {
        const response = await fetch(
            API_BASE +
            "/api/applications?email=" +
            encodeURIComponent(user.email)
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Unable to load applications."
            );
        }

        if (
            !data.applications ||
            !data.applications.length
        ) {
            box.innerHTML = `
                <div class="empty-state">

                    <h3>No applications yet</h3>

                    <p>
                        Apply to a job and it will appear here.
                    </p>

                    <a
                        class="primary-btn"
                        href="student.html"
                    >
                        Find Jobs
                    </a>

                </div>
            `;

            return;
        }

        box.innerHTML =
            data.applications
                .reverse()
                .map(application => `
                    <article class="job-result">

                        <div class="company-logo">
                            ${application.company
                                .slice(0, 2)
                                .toUpperCase()}
                        </div>

                        <div class="job-main">

                            <div class="job-top">

                                <div>

                                    <span class="pill">
                                        ${application.status}
                                    </span>

                                    <h2>
                                        ${application.jobTitle}
                                    </h2>

                                    <p class="company">
                                        ${application.company}
                                    </p>

                                </div>

                            </div>

                            <div class="job-meta">

                                <span>
                                    📍 ${application.location}
                                </span>

                                <span>
                                    📅 Applied:
                                    ${application.appliedDate}
                                </span>

                                <span>
                                    🆔 ${application.applicationId}
                                </span>

                            </div>

                        </div>

                    </article>
                `)
                .join("");

    } catch (error) {
        box.innerHTML = `
            <div class="empty-state">

                <h3>Unable to load applications</h3>

                <p>
                    ${error.message}
                </p>

            </div>
        `;
    }
}

/* =========================
   PAGE LOAD
========================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const registerForm =
            document.getElementById("registerForm");

        if (registerForm) {
            registerForm.addEventListener(
                "submit",
                registerUser
            );
        }

        const loginForm =
            document.getElementById("loginForm");

        if (loginForm) {
            loginForm.addEventListener(
                "submit",
                loginUser
            );
        }

        const applicationForm =
            document.getElementById("applicationForm");

        if (applicationForm) {
            applicationForm.addEventListener(
                "submit",
                submitApplication
            );
        }

        if (
            document.getElementById("jobsList")
        ) {
            loadJobs();

            document
                .getElementById("jobSearchBtn")
                ?.addEventListener(
                    "click",
                    loadJobs
                );
        }

        if (
            document.getElementById("applicationsList")
        ) {
            loadMyApplications();
        }

        const user = getUser();

        document
            .querySelectorAll("[data-user-name]")
            .forEach(element => {
                element.textContent =
                    user?.name || "Guest";
            });
    }
);