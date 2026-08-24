// Shared helpers for AiMerci Max pages

function autoExpand(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function downloadPDF(filename) {
    let container = document.querySelector('.container');
    if (!container || typeof html2pdf === "undefined") {
        alert("PDF export isn't available right now - check your internet connection and try again.");
        return;
    }

    document.body.classList.add('pdf-export');

    // Column widths shrink for export, so re-measure each textarea's
    // required height at its new width before capturing - otherwise
    // wrapped text gets clipped to the old (wider-column) height.
    container.querySelectorAll('td textarea').forEach(autoExpand);

    let opt = {
        margin: 0.4,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            windowWidth: document.documentElement.scrollWidth,
            scrollX: 0,
            scrollY: 0
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Give the browser a frame to apply the reflow/height changes above
    // before html2canvas takes its snapshot.
    requestAnimationFrame(() => {
        html2pdf().set(opt).from(container).save().then(() => {
            document.body.classList.remove('pdf-export');
            container.querySelectorAll('td textarea').forEach(autoExpand);
        }).catch(() => {
            document.body.classList.remove('pdf-export');
            container.querySelectorAll('td textarea').forEach(autoExpand);
            alert("Something went wrong generating the PDF. Please try again.");
        });
    });
}

// ---------- Auth ----------

function logout() {
    if (typeof auth === "undefined") return;
    auth.signOut().then(() => { window.location.href = "index.html"; });
}

async function showDashboardGreeting(user) {
    let greeting = document.getElementById("greeting");
    if (!greeting) return;
    try {
        let profile = await db.collection("users").doc(user.uid).get();
        if (profile.exists && profile.data().name) {
            greeting.textContent = "Welcome back, " + profile.data().name;
        } else {
            greeting.textContent = "Welcome back, " + user.email;
        }
    } catch (e) {
        greeting.textContent = "Welcome back";
    }
}

// Runs on every page. Pages that require login have class="requires-auth"
// on <body>. Signed-in users get their page-specific data loaded here too.
document.addEventListener("DOMContentLoaded", function () {
    if (typeof auth === "undefined") return; // Firebase not loaded on this page (e.g. index.html)

    auth.onAuthStateChanged(function (user) {
        let requiresAuth = document.body.classList.contains("requires-auth");

        if (!user) {
            if (requiresAuth) window.location.href = "login.html";
            return;
        }

        if (document.getElementById("greeting")) showDashboardGreeting(user);
        if (document.getElementById("subStatusText")) loadDashboardSubStatus();
        if (document.getElementById("lessonTable")) loadDraft();
        if (document.getElementById("notesIntro")) loadNotesDraft();
        if (document.getElementById("assessmentBody")) loadAssessmentDraft();
        if (document.getElementById("schemeTable")) loadSchemeCloud();
    });
});

// ---------- Lesson Plan Generator ----------

const LESSON_FIELD_IDS = [
    "school", "teacher", "subject", "class",
    "lessonTopic", "lessonCompetency", "lessonOutcomes", "lessonResources",
    "stepIntroTeacher", "stepIntroLearner",
    "step1Teacher", "step1Learner",
    "step2Teacher", "step2Learner",
    "step3Teacher", "step3Learner",
    "stepConcTeacher", "stepConcLearner"
];

async function saveDraft() {
    if (!document.getElementById("lessonTable") || !auth.currentUser) return;

    let data = {};
    LESSON_FIELD_IDS.forEach(id => {
        let el = document.getElementById(id);
        if (el) data[id] = el.value;
    });

    let status = document.getElementById("saveStatus");
    try {
        await db.collection("documents").doc(auth.currentUser.uid + "_lessonplan").set({
            uid: auth.currentUser.uid,
            type: "lessonplan",
            data: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (status) status.textContent = "Draft saved to your account " + new Date().toLocaleTimeString();
    } catch (e) {
        if (status) status.textContent = "Error: " + e.code + " | " + e.message;
    }
}

async function loadDraft() {
    if (!document.getElementById("lessonTable") || !auth.currentUser) return;

    let status = document.getElementById("saveStatus");
    try {
        let doc = await db.collection("documents").doc(auth.currentUser.uid + "_lessonplan").get();
        if (!doc.exists) return;

        let data = doc.data().data || {};
        LESSON_FIELD_IDS.forEach(id => {
            let el = document.getElementById(id);
            if (el && data[id] !== undefined) {
                el.value = data[id];
                if (el.tagName === "TEXTAREA") autoExpand(el);
            }
        });
        if (status) status.textContent = "Draft restored from your account";
    } catch (e) {
        if (status) status.textContent = "Couldn't load saved draft";
    }
}

function generateFullLessonAI() {
    let topic = document.getElementById("lessonTopic").value.trim();
    let competency = document.getElementById("lessonCompetency").value.trim();

    if (!topic) {
        alert("Enter a Lesson Topic first");
        return;
    }

    if (!competency) {
        document.getElementById("lessonCompetency").value =
            "Learners develop the knowledge and skills needed to understand and apply " + topic + ".";
    }

    if (!document.getElementById("lessonOutcomes").value.trim()) {
        document.getElementById("lessonOutcomes").value =
            "By the end of the lesson, learners should be able to explain, demonstrate, and apply key ideas related to " + topic + ".";
    }

    let steps = {
        stepIntroTeacher: "Introduces " + topic + " using a real-life example or question to spark curiosity.",
        stepIntroLearner: "Listen, observe, and share initial ideas or predictions about " + topic + ".",
        step1Teacher: "Explains the core concepts of " + topic + " step by step, using the board and available teaching aids.",
        step1Learner: "Take notes, ask clarifying questions, and respond to teacher prompts.",
        step2Teacher: "Organizes learners into small groups and assigns a short task or problem related to " + topic + ".",
        step2Learner: "Work in groups to discuss, solve the task, and prepare to share their findings.",
        step3Teacher: "Facilitates group presentations and clarifies any misconceptions about " + topic + ".",
        step3Learner: "Present group work, listen to peers, and refine their own understanding.",
        stepConcTeacher: "Summarizes key points of " + topic + " and links them to the next lesson.",
        stepConcLearner: "Answer a quick recap question or complete an exit-ticket task on " + topic + "."
    };

    Object.keys(steps).forEach(id => {
        let el = document.getElementById(id);
        el.value = steps[id];
        autoExpand(el);
    });

    saveDraft();
    alert("AiMerci Max has generated your lesson plan draft. Review and edit as needed!");
}

async function clearLessonPlan() {
    if (!confirm("Are you sure you want to clear this lesson plan?")) return;

    LESSON_FIELD_IDS.forEach(id => {
        let el = document.getElementById(id);
        if (el) el.value = "";
    });

    if (auth.currentUser) {
        try {
            await db.collection("documents").doc(auth.currentUser.uid + "_lessonplan").delete();
        } catch (e) { /* ignore */ }
    }

    let status = document.getElementById("saveStatus");
    if (status) status.textContent = "No draft saved yet";
}

// ---------- Notes Generator ----------

const NOTES_FIELD_IDS = [
    "notesSchool", "notesTeacher", "notesSubject", "notesClass", "notesTopic",
    "notesIntro", "notesDefinitions", "notesContent", "notesExamples",
    "notesSummary", "notesAssignment"
];

async function saveNotesDraft() {
    if (!document.getElementById("notesIntro") || !auth.currentUser) return;

    let data = {};
    NOTES_FIELD_IDS.forEach(id => {
        let el = document.getElementById(id);
        if (el) data[id] = el.value;
    });

    let status = document.getElementById("notesSaveStatus");
    try {
        await db.collection("documents").doc(auth.currentUser.uid + "_notes").set({
            uid: auth.currentUser.uid,
            type: "notes",
            data: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (status) status.textContent = "Draft saved to your account " + new Date().toLocaleTimeString();
    } catch (e) {
        if (status) status.textContent = "Error: " + e.code + " | " + e.message;
    }
}

async function loadNotesDraft() {
    if (!document.getElementById("notesIntro") || !auth.currentUser) return;

    let status = document.getElementById("notesSaveStatus");
    try {
        let doc = await db.collection("documents").doc(auth.currentUser.uid + "_notes").get();
        if (!doc.exists) return;

        let data = doc.data().data || {};
        NOTES_FIELD_IDS.forEach(id => {
            let el = document.getElementById(id);
            if (el && data[id] !== undefined) {
                el.value = data[id];
                if (el.tagName === "TEXTAREA") autoExpand(el);
            }
        });
        if (status) status.textContent = "Draft restored from your account";
    } catch (e) {
        if (status) status.textContent = "Couldn't load saved draft";
    }
}

function generateNotesAI() {
    let topic = document.getElementById("notesTopic").value.trim();

    if (!topic) {
        alert("Enter a Topic first");
        return;
    }

    let content = {
        notesIntro: "This lesson introduces learners to " + topic + " and its relevance in everyday life and further study.",
        notesDefinitions: "Key term 1: definition related to " + topic + ".\nKey term 2: definition related to " + topic + ".",
        notesContent: "A step-by-step explanation of " + topic + ", covering the main ideas, processes, and how they connect to what learners already know.",
        notesExamples: "Example 1: a simple worked illustration of " + topic + ".\nExample 2: a real-life scenario involving " + topic + ".",
        notesSummary: topic + " can be summarized in a few key points that learners should remember and be able to explain in their own words.",
        notesAssignment: "1. Define the key terms related to " + topic + ".\n2. Explain, in your own words, how " + topic + " applies in a real-life situation."
    };

    Object.keys(content).forEach(id => {
        let el = document.getElementById(id);
        el.value = content[id];
        autoExpand(el);
    });

    saveNotesDraft();
    alert("AiMerci Max has generated your lesson notes draft. Review and edit as needed!");
}

async function clearNotes() {
    if (!confirm("Are you sure you want to clear these notes?")) return;

    NOTES_FIELD_IDS.forEach(id => {
        let el = document.getElementById(id);
        if (el) el.value = "";
    });

    if (auth.currentUser) {
        try {
            await db.collection("documents").doc(auth.currentUser.uid + "_notes").delete();
        } catch (e) { /* ignore */ }
    }

    let status = document.getElementById("notesSaveStatus");
    if (status) status.textContent = "No draft saved yet";
}

// ---------- Assessment Generator ----------

const ASSESSMENT_META_IDS = [
    "assessSchool", "assessTeacher", "assessSubject", "assessClass",
    "assessDuration", "assessMarks", "assessTopic"
];

async function saveAssessmentDraft() {
    let tbody = document.getElementById("assessmentBody");
    if (!tbody || !auth.currentUser) return;

    let data = { meta: {}, rows: [] };
    ASSESSMENT_META_IDS.forEach(id => {
        let el = document.getElementById(id);
        if (el) data.meta[id] = el.value;
    });

    for (let row of tbody.rows) {
        let rowData = [];
        for (let cell of row.cells) {
            let textarea = cell.querySelector('textarea');
            rowData.push(textarea ? textarea.value : "");
        }
        data.rows.push({ cells: rowData });
    }

    let status = document.getElementById("assessmentSaveStatus");
    try {
        await db.collection("documents").doc(auth.currentUser.uid + "_assessment").set({
            uid: auth.currentUser.uid,
            type: "assessment",
            data: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (status) status.textContent = "Draft saved to your account " + new Date().toLocaleTimeString();
    } catch (e) {
        if (status) status.textContent = "Error: " + e.code + " | " + e.message;
    }
}

async function loadAssessmentDraft() {
    let tbody = document.getElementById("assessmentBody");
    if (!tbody || !auth.currentUser) return;

    let status = document.getElementById("assessmentSaveStatus");
    try {
        let doc = await db.collection("documents").doc(auth.currentUser.uid + "_assessment").get();
        if (!doc.exists) return;

        let data = doc.data().data || {};

        ASSESSMENT_META_IDS.forEach(id => {
            let el = document.getElementById(id);
            if (el && data.meta[id] !== undefined) el.value = data.meta[id];
        });

        if (data.rows && data.rows.length) {
            tbody.innerHTML = "";
            data.rows.forEach(rowData => {
                let cells = Array.isArray(rowData) ? rowData : (rowData.cells || []);
                let row = tbody.insertRow();
                cells.forEach(value => {
                    let cell = row.insertCell();
                    let area = document.createElement("textarea");
                    area.value = value;
                    area.oninput = function () { autoExpand(this); saveAssessmentDraft(); };
                    cell.appendChild(area);
                    autoExpand(area);
                });
            });
        }

        if (status) status.textContent = "Draft restored from your account";
    } catch (e) {
        if (status) status.textContent = "Couldn't load saved draft";
    }
}

function addQuestionRow() {
    let tbody = document.getElementById("assessmentBody");
    let row = tbody.insertRow(-1);

    for (let i = 0; i < 3; i++) {
        let cell = row.insertCell(i);
        cell.innerHTML = '<textarea oninput="autoExpand(this); saveAssessmentDraft();"></textarea>';
    }
}

function generateAssessmentAI() {
    let topic = document.getElementById("assessTopic").value.trim();

    if (!topic) {
        alert("Enter a Topic first");
        return;
    }

    let questions = [
        ["1", "Define the key terms associated with " + topic + ".", "5"],
        ["2", "Explain the main ideas or processes involved in " + topic + ".", "10"],
        ["3", "With the aid of a diagram or example, illustrate " + topic + ".", "10"],
        ["4", "Discuss the importance or real-life application of " + topic + ".", "10"],
        ["5", "Solve/answer a structured problem related to " + topic + ".", "15"]
    ];

    let tbody = document.getElementById("assessmentBody");
    tbody.innerHTML = "";

    questions.forEach(rowData => {
        let row = tbody.insertRow();
        rowData.forEach(value => {
            let cell = row.insertCell();
            let area = document.createElement("textarea");
            area.value = value;
            area.oninput = function () { autoExpand(this); saveAssessmentDraft(); };
            cell.appendChild(area);
            autoExpand(area);
        });
    });

    saveAssessmentDraft();
    alert("AiMerci Max has generated your assessment draft. Review, edit, and adjust marks as needed!");
}

function downloadAssessmentCSV() {
    let table = document.getElementById("assessmentTable");
    let csv = [];

    ASSESSMENT_META_IDS.forEach(id => {
        let el = document.getElementById(id);
        csv.push(id + ":," + (el ? el.value : ""));
    });
    csv.push("");

    for (let i = 0; i < table.rows.length; i++) {
        let row = table.rows[i];
        let rowData = [];
        for (let j = 0; j < row.cells.length; j++) {
            if (i === 0) {
                rowData.push(`"${row.cells[j].innerText}"`);
            } else {
                let textarea = row.cells[j].querySelector('textarea');
                let value = textarea ? textarea.value : "";
                rowData.push(`"${value.replace(/"/g, '""')}"`);
            }
        }
        csv.push(rowData.join(","));
    }

    let csvString = csv.join("\n");
    let blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    let link = document.createElement("a");
    let url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", "Assessment.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function clearAssessment() {
    if (!confirm("Are you sure you want to clear this assessment?")) return;

    ASSESSMENT_META_IDS.forEach(id => {
        let el = document.getElementById(id);
        if (el) el.value = "";
    });

    let tbody = document.getElementById("assessmentBody");
    tbody.innerHTML = '<tr><td><textarea oninput="autoExpand(this); saveAssessmentDraft();"></textarea></td><td><textarea oninput="autoExpand(this); saveAssessmentDraft();"></textarea></td><td><textarea oninput="autoExpand(this); saveAssessmentDraft();"></textarea></td></tr>';

    if (auth.currentUser) {
        try {
            await db.collection("documents").doc(auth.currentUser.uid + "_assessment").delete();
        } catch (e) { /* ignore */ }
    }

    let status = document.getElementById("assessmentSaveStatus");
    if (status) status.textContent = "No draft saved yet";
}

// ---------- Scheme of Work Generator ----------

const SCHEME_META_IDS = ["school", "teacher", "subject", "class", "term", "students", "weeks", "periods"];

async function saveSchemeCloud() {
    let tbody = document.getElementById("tableBody");
    if (!tbody || !auth.currentUser) return;

    let data = { meta: {}, rows: [] };
    SCHEME_META_IDS.forEach(id => {
        let el = document.getElementById(id);
        if (el) data.meta[id] = el.value;
    });

    for (let row of tbody.rows) {
        let rowData = [];
        for (let cell of row.cells) {
            let textarea = cell.querySelector('textarea');
            rowData.push(textarea ? textarea.value : "");
        }
        data.rows.push({ cells: rowData });
    }

    try {
        await db.collection("documents").doc(auth.currentUser.uid + "_scheme").set({
            uid: auth.currentUser.uid,
            type: "scheme",
            data: data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Scheme saved to your account!");
    } catch (e) {
        alert("Save failed: " + e.code + " | " + e.message);
    }
}

async function loadSchemeCloud() {
    let tbody = document.getElementById("tableBody");
    if (!tbody || !auth.currentUser) return;

    try {
        let doc = await db.collection("documents").doc(auth.currentUser.uid + "_scheme").get();
        if (!doc.exists) return;

        let data = doc.data().data || {};

        SCHEME_META_IDS.forEach(id => {
            let el = document.getElementById(id);
            if (el && data.meta[id] !== undefined) el.value = data.meta[id];
        });

        if (data.rows && data.rows.length) {
            tbody.innerHTML = "";
            data.rows.forEach(rowData => {
                let cells = Array.isArray(rowData) ? rowData : (rowData.cells || []);
                let row = tbody.insertRow();
                cells.forEach(value => {
                    let cell = row.insertCell();
                    let textarea = document.createElement("textarea");
                    textarea.value = value;
                    textarea.setAttribute("oninput", "autoExpand(this)");
                    cell.appendChild(textarea);
                    autoExpand(textarea);
                });
            });
        }
    } catch (e) {
        // silent - scheme page shows no persistent status line
    }
}

// ---------- AI Generation via Netlify Function ----------

// Defensive display helper: converts any AI-returned value into readable
// text, even if a provider sends a nested object/array instead of the plain
// string we asked for. Prevents "[object Object]" from ever showing again.
function toDisplayText(val) {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (Array.isArray(val)) return val.map(toDisplayText).join("\n");
    if (typeof val === "object") {
        return Object.entries(val).map(([k, v]) => `${k}: ${toDisplayText(v)}`).join("\n");
    }
    return String(val);
}

async function callAI(payload) {
    const res = await fetch("/.netlify/functions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    // A Netlify function that times out or crashes returns an HTML error
    // page, not JSON — parsing that as JSON is what produced the confusing
    // "Unexpected token '<'" error. Detect that case with a clear message.
    let data;
    try {
        data = await res.json();
    } catch (e) {
        throw new Error("The server took too long to respond. This usually means too much was requested at once — try a smaller batch.");
    }

    if (!res.ok || data.error) throw new Error(data.error || "AI generation failed");
    return JSON.parse(data.result);
}

// Scheme AI Generation — requested weeks are generated in small batches
// behind the scenes. This keeps each individual AI call fast enough to
// finish within Netlify's function time limit, and each response short
// enough to never get cut off, no matter how many weeks (or double
// periods per week) are requested.
const SCHEME_TARGET_ROWS_PER_BATCH = 10;

async function generateSchemeAI() {
    let subject = document.getElementById("subject").value.trim();
    let className = document.getElementById("class").value;
    let term = document.getElementById("term").value;
    let weeks = Number(document.getElementById("weeks").value);
    let periods = Number(document.getElementById("periods").value) || 1;

    if (!subject || weeks === 0) { alert("Enter Subject and Number of Weeks first"); return; }
    if (className === "Select Class") { alert("Please select a class"); return; }
    if (!(await requireSubscription())) return;

    let btn = document.querySelector(".btn-generate");
    let original = btn.textContent;
    btn.disabled = true;

    let tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";

    let priorTopics = [];

    // e.g. 2 double periods/week → ~5 weeks per batch (10 rows);
    // 1 period/week → ~10 weeks per batch. Always at least 1 week/batch.
    let batchSize = Math.max(1, Math.floor(SCHEME_TARGET_ROWS_PER_BATCH / periods));

    try {
        for (let start = 0; start < weeks; start += batchSize) {
            let batchWeeks = Math.min(batchSize, weeks - start);
            let batchEnd = start + batchWeeks;
            btn.textContent = `⏳ Generating weeks ${start + 1}–${batchEnd} of ${weeks}...`;

            let rows = await callAI({
                type: "scheme", subject, className, term,
                weeks: batchWeeks, periods,
                weekOffset: start,
                priorTopics: priorTopics.slice(-10).join(", ")
            });

            rows.forEach(r => {
                let row = tbody.insertRow();
                [r.week, r.period, r.topic, r.competency, r.outcomes, r.resources, r.methodology, r.reference, r.remarks].forEach(val => {
                    let cell = row.insertCell();
                    let area = document.createElement("textarea");
                    area.value = toDisplayText(val);
                    area.oninput = function() { autoExpand(this); };
                    cell.appendChild(area);
                    autoExpand(area);
                });
                if (r.topic) priorTopics.push(toDisplayText(r.topic));
            });
        }
        alert("✅ AiMerci Max has generated your scheme successfully!");
    } catch(e) {
        alert("AI generation failed: " + e.message + "\nUsing basic generation instead.");
        generateAI(); // fallback to basic
    } finally {
        btn.textContent = original;
        btn.disabled = false;
    }
}

// Lesson Plan AI Generation
async function generateFullLessonAI() {
    let subject = document.getElementById("subject")?.value.trim();
    let className = document.getElementById("class")?.value;
    let topic = document.getElementById("lessonTopic")?.value.trim();
    let competency = document.getElementById("lessonCompetency")?.value.trim();

    if (!topic) { alert("Enter a Lesson Topic first"); return; }
    if (!(await requireSubscription())) return;

    let btn = document.getElementById("aiPlanBtn");
    if (btn) { btn.textContent = "⏳ Generating... please wait"; btn.disabled = true; }

    try {
        let r = await callAI({ type: "lessonplan", subject, className, topic, competency });

        let fields = {
            lessonCompetency: r.competency,
            lessonOutcomes: r.outcomes,
            lessonResources: r.resources,
            stepIntroTeacher: r.introTeacher,
            stepIntroLearner: r.introLearner,
            step1Teacher: r.step1Teacher,
            step1Learner: r.step1Learner,
            step2Teacher: r.step2Teacher,
            step2Learner: r.step2Learner,
            step3Teacher: r.step3Teacher,
            step3Learner: r.step3Learner,
            stepConcTeacher: r.conclusionTeacher,
            stepConcLearner: r.conclusionLearner
        };

        Object.keys(fields).forEach(id => {
            let el = document.getElementById(id);
            if (el && fields[id]) { el.value = toDisplayText(fields[id]); autoExpand(el); }
        });

        saveDraft();
        alert("✅ AiMerci Max has generated your lesson plan!");
    } catch(e) {
        alert("AI generation failed: " + e.message);
    } finally {
        if (btn) { btn.textContent = "✨ Generate Full Plan (AiMerci)"; btn.disabled = false; }
    }
}

// Notes AI Generation
async function generateNotesAI() {
    let subject = document.getElementById("notesSubject")?.value.trim();
    let className = document.getElementById("notesClass")?.value;
    let topic = document.getElementById("notesTopic")?.value.trim();

    if (!topic) { alert("Enter a Topic first"); return; }
    if (!(await requireSubscription())) return;

    let btn = document.querySelector(".btn-generate");
    if (btn) { btn.textContent = "⏳ Generating... please wait"; btn.disabled = true; }

    try {
        let r = await callAI({ type: "notes", subject, className, topic });

        let fields = {
            notesIntro: r.intro,
            notesDefinitions: r.definitions,
            notesContent: r.content,
            notesExamples: r.examples,
            notesSummary: r.summary,
            notesAssignment: r.assignment
        };

        Object.keys(fields).forEach(id => {
            let el = document.getElementById(id);
            if (el && fields[id]) { el.value = toDisplayText(fields[id]); autoExpand(el); }
        });

        saveNotesDraft();
        alert("✅ AiMerci Max has generated your lesson notes!");
    } catch(e) {
        alert("AI generation failed: " + e.message);
    } finally {
        if (btn) { btn.textContent = "✨ Generate Notes with AiMerci"; btn.disabled = false; }
    }
}

// Assessment AI Generation
async function generateAssessmentAI() {
    let subject = document.getElementById("assessSubject")?.value.trim();
    let className = document.getElementById("assessClass")?.value;
    let topic = document.getElementById("assessTopic")?.value.trim();

    if (!topic) { alert("Enter a Topic first"); return; }
    if (!(await requireSubscription())) return;

    let btn = document.querySelector(".btn-generate");
    if (btn) { btn.textContent = "⏳ Generating... please wait"; btn.disabled = true; }

    try {
        let questions = await callAI({ type: "assessment", subject, className, topic });

        let tbody = document.getElementById("assessmentBody");
        tbody.innerHTML = "";

        questions.forEach(q => {
            let row = tbody.insertRow();
            [q.number, q.question, q.marks].forEach(val => {
                let cell = row.insertCell();
                let area = document.createElement("textarea");
                area.value = toDisplayText(val);
                area.oninput = function() { autoExpand(this); saveAssessmentDraft(); };
                cell.appendChild(area);
                autoExpand(area);
            });
        });

        saveAssessmentDraft();
        alert("✅ AiMerci Max has generated your assessment!");
    } catch(e) {
        alert("AI generation failed: " + e.message);
    } finally {
        if (btn) { btn.textContent = "✨ Generate Assessment with AiMerci"; btn.disabled = false; }
    }
}

// ---------- Subscription Check ----------

async function getOrFixUserData() {
    if (!auth.currentUser) return null;
    let ref = db.collection("users").doc(auth.currentUser.uid);
    let doc = await ref.get();
    let data = doc.exists ? doc.data() : {};
    if (!data.createdAt) {
        let update = { createdAt: firebase.firestore.FieldValue.serverTimestamp() };
        if (!doc.exists) update.email = auth.currentUser.email;
        await ref.set(update, { merge: true });
        data.createdAt = { toDate: () => new Date() };
    }
    return data;
}

async function checkSubscription() {
    if (!auth.currentUser) return false;
    try {
        let data = await getOrFixUserData();
        if (!data) return false;
        let now = new Date();
        let createdAt = data.createdAt ? data.createdAt.toDate() : now;
        let trialEnd = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
        let subscribed = data.subscribed || false;
        let subExpiry = data.subExpiry ? data.subExpiry.toDate() : null;
        if (subscribed && subExpiry && subExpiry > now) return true;
        if (now < trialEnd) return true;
        return false;
    } catch(e) {
        return true;
    }
}

async function requireSubscription() {
    let allowed = await checkSubscription();
    if (!allowed) {
        let go = confirm("⚠️ Your free trial has ended.\n\nSubscribe for UGX 4,000/month to continue using AI generation.\n\nTap OK to go to the subscription page.");
        if (go) window.location.href = "subscribe.html";
        return false;
    }
    return true;
}

// ---------- Dashboard subscription status ----------

async function loadDashboardSubStatus(isRetry) {
    let el = document.getElementById("subStatusText");
    if (!el || !auth.currentUser) return;
    try {
        let data = await getOrFixUserData();
        if (!data) { el.textContent = "Subscription status unavailable"; return; }
        let now = new Date();
        let createdAt = data.createdAt ? data.createdAt.toDate() : now;
        let trialEnd = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
        let subscribed = data.subscribed || false;
        let subExpiry = data.subExpiry ? data.subExpiry.toDate() : null;
        if (subscribed && subExpiry && subExpiry > now) {
            el.innerHTML = `<strong style="color:var(--accent)">Pro Active</strong> — expires ${subExpiry.toLocaleDateString()}`;
        } else if (now < trialEnd) {
            let daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
            el.innerHTML = `<strong style="color:var(--success)">Free Trial</strong> — ${daysLeft} day${daysLeft>1?'s':''} left`;
        } else {
            el.innerHTML = `<strong style="color:var(--danger)">Trial Expired</strong> — Subscribe to continue`;
        }
    } catch(e) {
        console.error("loadDashboardSubStatus failed:", e);
        if (!isRetry) {
            // Weak/slow connections can time out on the first attempt -
            // retry once automatically before bothering the user.
            setTimeout(() => loadDashboardSubStatus(true), 2000);
            el.textContent = "Checking subscription... (retrying)";
            return;
        }
        el.innerHTML = `Couldn't reach the server (error: ${e.code || e.message || e})
            <a href="#" onclick="loadDashboardSubStatus(); return false;" style="margin-left:6px;">Retry</a>`;
    }
}
