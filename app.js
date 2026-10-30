/**
 * IBM Bob Software Factory - Interactive Site Script
 */

document.addEventListener('DOMContentLoaded', () => {
  initCopyButtons();
  initTabs();
  initLoopStages();
  initFsExplorer();
  initSimulator();
  initMobileNav();
});

// Escape a value for safe interpolation into HTML
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Toast notification helper
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
    <span></span>
  `;
  // Use textContent so DOM-derived message text is never parsed as HTML
  toast.querySelector('span').textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

// Global copy handler
function initCopyButtons() {
  document.querySelectorAll('[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.getAttribute('data-copy-target');
      const targetElem = document.getElementById(targetId);
      if (!targetElem) return;

      const text = targetElem.innerText || targetElem.textContent;
      try {
        await navigator.clipboard.writeText(text.trim());
        const originalNodes = Array.from(btn.childNodes);
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg> Copied!
        `;
        btn.classList.add('btn-copied');
        showToast('Prompt copied to clipboard!');
        setTimeout(() => {
          btn.replaceChildren(...originalNodes);
          btn.classList.remove('btn-copied');
        }, 2200);
      } catch (err) {
        showToast('Failed to copy text', 'error');
      }
    });
  });

  document.querySelectorAll('[data-copy-text]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy-text');
      try {
        await navigator.clipboard.writeText(text);
        showToast(`Copied: ${text}`);
      } catch (err) {
        showToast('Failed to copy', 'error');
      }
    });
  });
}

// Code Tabs
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.prompt-showcase-card') || document;
      const targetTab = btn.getAttribute('data-tab');

      parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = parent.querySelector(`#${targetTab}`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// Loop Stage Selector Data & Interactivity
const stageData = {
  feature: {
    title: "1. Feature Ingestion",
    role: "Orchestrator Skill (/factory)",
    badge: "INPUT",
    desc: "The factory loop begins with a feature request. The orchestrator accepts user input either from the CLI command <code>/factory &lt;feature&gt;</code> or by picking the next unchecked item from <code>factory/backlog.md</code>.",
    tools: "Skill Activation, Read backlog.md, Write board.json",
    reads: "User prompt OR factory/backlog.md",
    writes: "factory/board.json (allocates job-id, e.g. 004-jwt-auth)"
  },
  spec: {
    title: "2. Spec-Writer Bob",
    role: "Subagent (spec-writer)",
    badge: "AGENT",
    desc: "Inspects the target repository to determine the primary language, testing framework, code patterns, and project conventions. Synthesizes the feature request into a strict specification with measurable acceptance criteria.",
    tools: "Read, Grep, Glob",
    reads: "Repo codebase, project conventions, package.json / pom.xml / Cargo.toml",
    writes: "factory/jobs/<job-id>/spec.md"
  },
  builder: {
    title: "3. Builder Bob",
    role: "Subagent (builder-<job-id>)",
    badge: "IMPLEMENTER",
    desc: "Creates an isolated git feature branch (<code>factory/&lt;job-id&gt;</code>). Reads <code>spec.md</code>, implements the code changes, writes automated unit/integration tests, and ensures the test suite passes.",
    tools: "Read, Grep, Glob, Bash, Write",
    reads: "factory/jobs/<job-id>/spec.md, round review files (on rework)",
    writes: "Git branch factory/<job-id>, factory/jobs/<job-id>/build.md"
  },
  reviews: {
    title: "4. 4 Parallel Reviewers",
    role: "4 Concurrent Subagents",
    badge: "PARALLEL GATES",
    desc: "Four specialized subagents execute simultaneously to audit the builder's pull request against distinct quality domains. Each reviewer produces a markdown file starting with VERDICT: PASS or CHANGES.",
    tools: "Read, Grep, Glob, Bash",
    reads: "Git diff on factory/<job-id>, spec.md, build.md",
    writes: "round-N/review-security.md, review-ux.md, review-ui.md, review-code.md"
  },
  wait: {
    title: "5. WAIT FOR ALL (Barrier Sync)",
    role: "Orchestrator Synchronization Gate",
    badge: "GATEWAY",
    desc: "Strict barrier synchronization: a review round is complete ONLY when all 4 reviewer files exist in the round folder. The orchestrator never resumes the builder mid-round.",
    tools: "Glob, Read",
    reads: "All 4 review files in factory/jobs/<job-id>/round-N/",
    writes: "factory/board.json (updates stage & round reviews)"
  },
  approver: {
    title: "6. Approver Bob",
    role: "Subagent (approver)",
    badge: "ARBITER",
    desc: "Once all 4 reviews are in: if all verdicts are PASS, Approver marks APPROVE for automated merge into main. If any reviewer requested CHANGES and max 2 rounds were exhausted (or unresolvable conflict), routes to ESCALATE.",
    tools: "Read, Write, Git Merge",
    reads: "spec.md, build.md, all round reviews",
    writes: "factory/jobs/<job-id>/decision.md (APPROVE or ESCALATE)"
  },
  resolution: {
    title: "7. Resolution: Main or Needs-Human",
    role: "Final Disposition",
    badge: "OUTCOME",
    desc: "Approved jobs are merged automatically into main. Escalated jobs are tagged <code>needs-human</code> on <code>factory/board.json</code> and highlighted on the dashboard for human review via <code>/factory approve &lt;job-id&gt;</code> or <code>/factory rework &lt;job-id&gt; &lt;note&gt;</code>.",
    tools: "Git Merge OR Human Intervention",
    reads: "decision.md, board.json",
    writes: "Main branch merge commit OR human override note"
  }
};

function initLoopStages() {
  const stageCards = document.querySelectorAll('.loop-stage-card');
  const detailTitle = document.getElementById('detail-stage-title');
  const detailRole = document.getElementById('detail-stage-role');
  const detailBadge = document.getElementById('detail-stage-badge');
  const detailDesc = document.getElementById('detail-stage-desc');
  const detailTools = document.getElementById('detail-stage-tools');
  const detailReads = document.getElementById('detail-stage-reads');
  const detailWrites = document.getElementById('detail-stage-writes');

  if (!stageCards.length || !detailTitle) return;

  stageCards.forEach(card => {
    card.addEventListener('click', () => {
      stageCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const stageKey = card.getAttribute('data-stage');
      const data = stageData[stageKey];
      if (!data) return;

      detailTitle.textContent = data.title;
      detailRole.textContent = data.role;
      detailBadge.textContent = data.badge;
      detailDesc.innerHTML = data.desc;
      detailTools.textContent = data.tools;
      detailReads.textContent = data.reads;
      detailWrites.textContent = data.writes;
    });
  });
}

// Target File System Tree Data & Interactivity
const fsData = {
  "skill": {
    path: ".bob/skills/factory/SKILL.md",
    purpose: "The brain of the factory. Orchestrator instructions that define the state loop, agent dispatch rules, board.json writing permissions, and CLI command handlers.",
    content: `---
name: factory
description: Orchestrates an autonomous multi-agent software factory with parallel reviews and durable markdown state.
---
# Factory Orchestrator

1. Inspect the repo to discover package manager, test scripts, and coding style.
2. Initialize or load factory/board.json.
3. For each job:
   - Spawn spec-writer -> factory/jobs/<id>/spec.md
   - Spawn builder (builder-<id>) -> creates branch, writes code & build.md
   - Concurrently spawn 4 reviewers (security, ux, ui, code) into round-N/
   - WAIT FOR ALL 4 review files.
   - If any CHANGES and round <= 2: SendMessage to builder-<id> and repeat.
   - Spawn approver -> factory/jobs/<id>/decision.md
   - If APPROVE: merge branch to main; If ESCALATE: mark needs-human.`
  },
  "agent-spec": {
    path: ".bob/agents/spec-writer.md",
    purpose: "Analyzes the repository code patterns and drafts a clear specification with testable acceptance criteria.",
    content: `---
name: spec-writer
description: Generates a technical spec and acceptance test suite for a new feature.
tools: Read, Grep, Glob
model: sonnet
---
Read the repo structure and user feature prompt.
Write factory/jobs/<job-id>/spec.md with:
- Target architecture & files to modify
- API contracts & component interfaces
- Explicit Acceptance Criteria (Given/When/Then)`
  },
  "agent-builder": {
    path: ".bob/agents/builder.md",
    purpose: "Creates feature branch, implements code changes, runs tests, and updates build.md.",
    content: `---
name: builder
description: Implements features on an isolated git branch according to spec.md.
tools: Read, Grep, Glob, Bash, Write
model: sonnet
---
Checkout git branch 'factory/<job-id>'.
Read factory/jobs/<job-id>/spec.md and round reviews (if rework).
Implement changes, execute tests using repo test command.
Commit changes and write factory/jobs/<job-id>/build.md.`
  },
  "agent-reviewer": {
    path: ".bob/agents/reviewer-security.md",
    purpose: "Reviews code diff specifically for security vulnerabilities (injection, auth, secrets, sanitization).",
    content: `---
name: reviewer-security
description: Audits git diff for security vulnerabilities and access control flaws.
tools: Read, Grep, Glob, Bash
model: sonnet
---
Inspect 'git diff main...factory/<job-id>'.
Evaluate against OWASP Top 10, sanitization, secret exposure, auth bypasses.
Write factory/jobs/<job-id>/round-<N>/review-security.md.
Must begin with 'VERDICT: PASS' or 'VERDICT: CHANGES' followed by findings.`
  },
  "agent-approver": {
    path: ".bob/agents/approver.md",
    purpose: "Final decision maker evaluating all 4 review verdicts and determining merge vs human escalation.",
    content: `---
name: approver
description: Evaluates all review verdicts and writes decision.md.
tools: Read, Write
model: sonnet
---
Read all 4 review files in factory/jobs/<job-id>/round-<N>/.
If all 4 are PASS: write factory/jobs/<job-id>/decision.md with 'APPROVE'.
If any CHANGES remain after max rounds: write 'ESCALATE' with reasoning.`
  },
  "board-json": {
    path: "factory/board.json",
    purpose: "Durable state file storing all active and completed jobs, stages, round numbers, and reviewer verdicts.",
    content: `{
  "jobs": [
    {
      "id": "003-rate-limiting",
      "branch": "factory/003-rate-limiting",
      "stage": "review",
      "round": 2,
      "reviews": {
        "security": "CHANGES",
        "ux": "PASS",
        "ui": "pending",
        "code": "PASS"
      }
    }
  ]
}`
  },
  "dashboard-html": {
    path: "factory/dashboard.html",
    purpose: "Self-contained visual kanban board that polls board.json and displays jobs, reviews, and links to markdown files.",
    content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>IBM Bob Factory Board</title>
  <style>/* Clean, self-contained responsive board CSS */</style>
</head>
<body>
  <h1>IBM Bob Software Factory Board</h1>
  <div id="board"></div>
  <script>
    async function refresh() {
      const res = await fetch('board.json');
      const data = await res.json();
      renderBoard(data);
    }
    setInterval(refresh, 2000);
    refresh();
  </script>
</body>
</html>`
  },
  "backlog-md": {
    path: "factory/backlog.md",
    purpose: "Queue of upcoming features. /factory next reads the first unchecked item and executes it.",
    content: `# Feature Backlog

- [ ] Add Redis-backed sliding window rate limiter
- [ ] Implement JWT token rotation with refresh cookies
- [ ] Create dark/light theme switcher component
- [x] Initial scaffold and test setup`
  }
};

function initFsExplorer() {
  const fsItems = document.querySelectorAll('.fs-item');
  const pathDisplay = document.getElementById('fs-selected-path');
  const purposeDisplay = document.getElementById('fs-selected-purpose');
  const codeDisplay = document.getElementById('fs-code-content');

  if (!fsItems.length || !pathDisplay) return;

  fsItems.forEach(item => {
    item.addEventListener('click', () => {
      fsItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const fileKey = item.getAttribute('data-file');
      const fileData = fsData[fileKey];
      if (!fileData) return;

      pathDisplay.textContent = fileData.path;
      purposeDisplay.textContent = fileData.purpose;
      codeDisplay.textContent = fileData.content;
    });
  });
}

// Live Interactive Factory Simulator
function initSimulator() {
  const logEl = document.getElementById('sim-log');
  const runBtn = document.getElementById('sim-run-btn');
  const resetBtn = document.getElementById('sim-reset-btn');

  if (!runBtn || !logEl) return;

  let simTimer = null;
  let isSimulating = false;

  const defaultBoard = [
    {
      id: "001-user-auth",
      title: "Add GitHub OAuth Login",
      branch: "factory/001-user-auth",
      stage: "merged",
      round: 1,
      reviews: { security: "PASS", ux: "PASS", ui: "PASS", code: "PASS" }
    },
    {
      id: "002-api-caching",
      title: "Redis Response Cache",
      branch: "factory/002-api-caching",
      stage: "merged",
      round: 2,
      reviews: { security: "PASS", ux: "PASS", ui: "PASS", code: "PASS" }
    },
    {
      id: "003-rate-limiting",
      title: "Sliding Window Rate Limiter",
      branch: "factory/003-rate-limiting",
      stage: "review",
      round: 2,
      reviews: { security: "CHANGES", ux: "PASS", ui: "pending", code: "PASS" }
    },
    {
      id: "004-cors-policy",
      title: "Strict CORS Whitelist Header",
      branch: "factory/004-cors-policy",
      stage: "needs-human",
      round: 2,
      reviews: { security: "CHANGES", ux: "PASS", ui: "PASS", code: "CHANGES" }
    }
  ];

  let currentBoard = JSON.parse(JSON.stringify(defaultBoard));

  function addLog(tag, msg) {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'sim-log-entry';
    const timeEl = document.createElement('span');
    timeEl.className = 'sim-log-time';
    timeEl.textContent = `[${time}]`;
    const tagEl = document.createElement('span');
    tagEl.className = 'sim-log-tag';
    tagEl.textContent = `[${tag}]`;
    entry.append(timeEl, ' ', tagEl, ` ${msg}`);
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderSimBoard() {
    const stages = {
      spec: document.getElementById('sim-col-spec'),
      build: document.getElementById('sim-col-build'),
      review: document.getElementById('sim-col-review'),
      merged: document.getElementById('sim-col-merged'),
      "needs-human": document.getElementById('sim-col-human')
    };

    // Clear columns
    Object.values(stages).forEach(col => {
      if (col) col.innerHTML = '';
    });

    const counts = { spec: 0, build: 0, review: 0, merged: 0, "needs-human": 0 };

    currentBoard.forEach(job => {
      counts[job.stage] = (counts[job.stage] || 0) + 1;
      const targetCol = stages[job.stage];
      if (!targetCol) return;

      const card = document.createElement('div');
      card.className = `sim-job-card ${job.stage === 'needs-human' ? 'needs-human' : ''}`;
      
      let reviewsHtml = '';
      if (job.reviews) {
        reviewsHtml = `
          <div class="sim-reviews-row">
            <span class="sim-rev-chip ${escapeHtml(job.reviews.security)}">SEC: ${escapeHtml(job.reviews.security)}</span>
            <span class="sim-rev-chip ${escapeHtml(job.reviews.ux)}">UX: ${escapeHtml(job.reviews.ux)}</span>
            <span class="sim-rev-chip ${escapeHtml(job.reviews.ui)}">UI: ${escapeHtml(job.reviews.ui)}</span>
            <span class="sim-rev-chip ${escapeHtml(job.reviews.code)}">CODE: ${escapeHtml(job.reviews.code)}</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="sim-job-id">${escapeHtml(job.id)} · R${escapeHtml(job.round)}</div>
        <div class="sim-job-title">${escapeHtml(job.title)}</div>
        ${reviewsHtml}
      `;

      card.addEventListener('click', () => {
        showToast(`Job ${job.id}: Stage=${job.stage}, Branch=${job.branch}`);
      });

      targetCol.appendChild(card);
    });

    // Update counts
    Object.keys(counts).forEach(stage => {
      const countEl = document.getElementById(`sim-count-${stage}`);
      if (countEl) countEl.textContent = counts[stage];
    });
  }

  renderSimBoard();

  runBtn.addEventListener('click', () => {
    if (isSimulating) {
      showToast('Simulation already running', 'info');
      return;
    }

    const newJobId = `005-telemetry-metrics`;
    const newJob = {
      id: newJobId,
      title: "Prometheus Telemetry Metrics",
      branch: `factory/${newJobId}`,
      stage: "spec",
      round: 1,
      reviews: { security: "pending", ux: "pending", ui: "pending", code: "pending" }
    };

    currentBoard.push(newJob);
    renderSimBoard();
    isSimulating = true;
    runBtn.disabled = true;

    addLog('ORCHESTRATOR', `Triggered /factory "${newJob.title}"`);
    addLog('SPEC-WRITER', `Analyzing repo conventions and drafting spec.md...`);

    // Step 1: Spec -> Build
    setTimeout(() => {
      newJob.stage = 'build';
      renderSimBoard();
      addLog('BUILDER', `Spec ready. Created branch ${newJob.branch}. Writing code & tests...`);

      // Step 2: Build -> Review
      setTimeout(() => {
        newJob.stage = 'review';
        renderSimBoard();
        addLog('ORCHESTRATOR', `Spawning 4 parallel reviewers (Security, UX, UI, Code)...`);

        // Concurrent review arrivals
        setTimeout(() => {
          newJob.reviews.security = "PASS";
          renderSimBoard();
          addLog('REVIEWER-SEC', `review-security.md written -> VERDICT: PASS`);
        }, 1200);

        setTimeout(() => {
          newJob.reviews.ux = "PASS";
          renderSimBoard();
          addLog('REVIEWER-UX', `review-ux.md written -> VERDICT: PASS`);
        }, 2000);

        setTimeout(() => {
          newJob.reviews.ui = "PASS";
          renderSimBoard();
          addLog('REVIEWER-UI', `review-ui.md written -> VERDICT: PASS`);
        }, 2800);

        setTimeout(() => {
          newJob.reviews.code = "PASS";
          renderSimBoard();
          addLog('REVIEWER-CODE', `review-code.md written -> VERDICT: PASS`);
          addLog('ORCHESTRATOR', `WAIT FOR ALL satisfied! All 4 reviews in with PASS.`);

          // Step 3: Approver -> Merge
          setTimeout(() => {
            newJob.stage = 'merged';
            renderSimBoard();
            addLog('APPROVER', `decision.md -> APPROVE. Merged ${newJob.branch} to main! 🚀`);
            isSimulating = false;
            runBtn.disabled = false;
            showToast('Job 005 completed and merged to main!');
          }, 1500);

        }, 3400);

      }, 2500);

    }, 2000);
  });

  resetBtn.addEventListener('click', () => {
    currentBoard = JSON.parse(JSON.stringify(defaultBoard));
    renderSimBoard();
    logEl.innerHTML = `
      <div class="sim-log-entry"><span class="sim-log-time">[INIT]</span> <span class="sim-log-tag">[FACTORY]</span> Orchestrator loaded board.json with 4 active jobs.</div>
    `;
    isSimulating = false;
    runBtn.disabled = false;
    showToast('Factory board reset to default state');
  });
}

// Mobile Menu Toggle
function initMobileNav() {
  const toggle = document.querySelector('.mobile-toggle');
  const links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('mobile-open');
    });

    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('mobile-open');
      });
    });
  }
}
