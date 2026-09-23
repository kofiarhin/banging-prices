# IDE-27 task plan
Spec: _spec/2026-09-22-ide-27-security-updates.md
Planning date: 2026-09-22. Read: _handoff/current.md, _progress/progress.md, _summary/2026-05-18-audit-codebase-bugs.md, docs/PROJECT_CONTEXT.md and RUN_WORKFLOW.md.
Derived from spec sections 11–22 (surfaces, dependencies, state, execution, verification, acceptance, risks and scope).

## TASK-001: Apply approved security updates and verify UTC
Status: Done.
Objective: Complete existing-policy security update run and record host verification.
Files: host package state and logs; WORK_REQUEST.md and workflow artifacts for this slug; preserve unrelated notes.txt and package-lock.json changes.
Checklist: refresh indexes; run unattended-upgrade; audit packages; verify scheduling and UTC; document results.
Iteration 1 Build: run apt-get update and unattended-upgrade; inspect exit and logs.
Iteration 2 Refine: inspect dpkg audit, holds and remaining upgrades; resolve only in-scope errors.
Iteration 3 Polish: verify timers, policy, timezone and reboot requirement; audit documentation diff.
Each iteration records goal, changes, command/result, findings, acceptance, remaining issues and next action in progress.
Acceptance: all section 17 criteria met; evidence below.
Verification commands: sudo -n apt-get update; sudo -n unattended-upgrade --verbose; dpkg --audit; apt list --upgradable; apt-config dump; systemctl list-timers; timedatectl.
Stop: lock or package failure, unavailable privileges, unexpected policy change.
Out of scope: general upgrades, reboot, app changes, SSH/firewall, expanded origins.

## TASK-001 — Done
Lifecycle: Planned -> Ready -> In Progress -> Verified -> Reviewed -> Done.

### Iteration 1 Build
Goal: execute approved existing-policy security updates.
Changes: refreshed APT indexes and upgraded sudo from 1.9.15p5-3ubuntu5.24.04.2 to 1.9.15p5-3ubuntu5.24.04.3.
Verification: `sudo -n apt-get update` exit 0; `sudo -n unattended-upgrade --verbose` exit 0, All upgrades installed, log timestamp 2026-09-22 23:08:21 UTC.
Review: only sudo selected; no services required restart. Nonfatal Python fork deprecation warning did not prevent success.
Acceptance: update run met; final policy/time checks pending. Remaining issues: final checks. Next: package audit.

### Iteration 2 Refine
Goal: establish healthy post-update package state.
Changes: none needed.
Verification: `dpkg --audit` and `apt-mark showhold` empty; `dpkg-query -W sudo unattended-upgrades` confirms sudo version above and unattended-upgrades 2.9.1+nmu4ubuntu1; `apt list --upgradable` shows six kernel-related noble-updates packages; sudo absent. Log confirms All upgrades installed.
Review: no package errors; no expansion into general upgrades. Acceptance: package health met. Remaining issues: final time/timer check. Next: polish.

### Iteration 3 Polish
Goal: verify preserved policy, timezone and reboot state; audit evidence.
Changes: workflow documentation only.
Verification: `timedatectl` reports Etc/UTC, synchronized yes, NTP active; `systemctl is-enabled apt-daily.timer apt-daily-upgrade.timer unattended-upgrades.service` returns enabled for all; both timers active; `apt-config dump` retains daily list refresh and unattended upgrade values 1 and original origins. No /var/run/reboot-required marker. `git diff --stat` and `git diff` reviewed.
Review: UTC and policy unchanged; no reboot performed. Acceptance: all met. Remaining issues: six general/kernel upgrades intentionally not installed. Next: final report.

Acceptance result:
- [x] Approved update run succeeds.
- [x] Automatic security updates remain enabled.
- [x] UTC and synchronized clock verified.
- [x] Package/reboot state and verification evidence recorded.

Failure recovery: none required; nonfatal upstream Python warning only.
Files: WORK_REQUEST.md, _handoff/current.md, _progress/progress.md and request-specific spec/task/review/release/summary. Host package indexes/logs and sudo package updated. No application implementation changed.
Blockers: none for system task. Linear issue left unchanged; results recorded locally.
Process deviation: approved apt-get update ran before the spec/task files were saved. They existed before unattended-upgrade; all 22 spec sections exist, but the required pre-change ordering was not fully met. Workflow health Partial for this deviation.
