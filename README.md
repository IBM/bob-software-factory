# IBM Bob Software Factory 🏭

> **Autonomous multi-agent development assembly line in a single prompt.**  
> Powered by IBM Bob subagents, concurrent 4-way reviews (Security, UX, UI, Code), barrier synchronization, and durable markdown state.

🌐 **Website & Documentation:** [https://ibm.github.io/bob-software-factory](https://ibm.github.io/bob-software-factory)  
📄 **Prompt File:** [`prompt.md`](./prompt.md) | [`prompt.txt`](./prompt.txt)

---

## ⚡ Quickstart

1. **Copy the Factory Prompt:**  
   Copy the contents of [`prompt.md`](./prompt.md) or click **Copy Prompt** at [https://ibm.github.io/bob-software-factory](https://ibm.github.io/bob-software-factory).

2. **Paste into IBM Bob:**  
   Paste the prompt into your Bob session in any code repository. Bob will inspect your repo and automatically scaffold:
   - Orchestrator Skill: `.bob/skills/factory/SKILL.md`
   - Subagents: `.bob/agents/spec-writer.md`, `.bob/agents/builder.md`, `.bob/agents/reviewer-*.md`, `.bob/agents/approver.md`
   - Factory State: `factory/board.json`, `factory/dashboard.html`, `factory/backlog.md`

3. **Run Features & Monitor:**
   ```bash
   # In IBM Bob
   /factory "add sliding window rate limiter"
   
   # Or run the next queued item from factory/backlog.md
   /factory next
   
   # In your terminal (to view the visual board live)
   python3 -m http.server -d factory/ 8080
   ```

---

## 🔄 The Factory Loop

```text
                   ┌──────────────────┐
                   │     feature      │
                   └─────────┬────────┘
                             ▼
                   ┌──────────────────┐
                   │   spec-writer    │
                   │       Bob        │
                   └─────────┬────────┘
                             ▼
                   ┌──────────────────┐
                   │     builder      │◄────────────────────┐
                   │       Bob        │                     │
                   └─────────┬────────┘                     │
        ┌─────────────┬──────┴──────┬─────────────┐         │
        ▼             ▼             ▼             ▼         │
  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
  │  security │ │     ux    │ │ ui design │ │    code   │   │
  │    Bob    │ │   Bob     | │   Bob     │ │   Bob     │   │
  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘   │
        └─────────────┴──────┬──────┴─────────────┘         │
                             ▼                              │
                   ┌──────────────────┐   any CHANGES:      │
                   │   WAIT FOR ALL   ├─────────────────────┘
                   │   4 reviews in   │   resume builder
                   └─────────┬────────┘   (max 2 rounds)
                             ▼ all PASS
                   ┌──────────────────┐
                   │     approver     │
                   │       Bob        │
                   └─┬───────────────┬┘
             APPROVE │               │ ESCALATE
                     ▼               ▼
              ┌─────────────┐ ┌─────────────┐
              │merge to main│ │ needs-human │ ◄── /factory approve
              └─────────────┘ └─────────────┘
```

---

## 🛠️ CLI Commands

| Command | Description |
| :--- | :--- |
| `/factory <feature>` | Dispatches a new feature through the entire loop. |
| `/factory next` | Executes the first unchecked item in `factory/backlog.md`. |
| `/factory approve <job-id>` | Merges a `needs-human` escalated job into `main`. |
| `/factory rework <job-id> <note>` | Returns an escalated job to the builder with human feedback. |

---

## 📂 Target File System

```text
.bob/
  skills/factory/SKILL.md          # the orchestrator's instructions
  agents/                          # one file per agent in the loop
factory/
  board.json                       # durable state, drives the dashboard
  dashboard.html                   # visual board, polls board.json
  backlog.md                       # queue of features for /factory next
  jobs/003-rate-limiting/          # one folder per job
    spec.md
    build.md
    round-1/                       # one folder per review round
      review-security.md           # one file per reviewer
      review-ux.md
      review-ui.md
      review-code.md
    decision.md
```

---

## 📜 Factory Rules

- **File-Isolated Context:** Subagents read only their input files and write only their designated output file — zero context pollution.
- **Deterministic Verdicts:** Every review starts with `VERDICT: PASS` or `VERDICT: CHANGES`; decisions start with `APPROVE` or `ESCALATE`.
- **Barrier Synchronization (`WAIT FOR ALL`):** A review round is complete only when all 4 reviewer files exist. The builder is never resumed mid-round.
- **Resumable Builder:** The builder is spawned with `builder-<job-id>` and resumed with `SendMessage` pointing to the round folder.
- **Max 2 Review Rounds:** Prevents infinite rework loops. Unresolved changes route safely to `needs-human`.

---

## 📄 License

Apache-2.0 © IBM Corp.
