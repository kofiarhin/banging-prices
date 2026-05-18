# Spec Memory

Store generated workflow specs in this folder.

Agents must create a saved detailed spec here before task planning or implementation. Use timestamped or slugged filenames, for example:

```txt
_spec/2026-05-10-add-dark-theme.md
```

The spec is a detailed, implementation-aware execution blueprint, not a lightweight brief. It must be saved before task planning and based on the active request, intake answers, repo intake, dirty worktree status, handoff/progress context, latest relevant summary, and durable project docs.

Use `Not applicable` for irrelevant sections. Do not delete required sections.

# Detailed Spec Template

## 1. Metadata
- Spec filename:
- Date:
- Request ID / slug:
- Request source:
- Execution mode:
- Request classification:
- Scope level:
- Risk level:

## 2. Original Request
- Raw user request:
- Normalized request:
- Source prompt / WORK_REQUEST reference:

## 3. Questions And Answers
- Questions asked:
- Answers received:
- Questions skipped:
- Remaining open questions:

## 4. Problem Definition
- Problem being solved:
- Why it matters:
- Current pain point:
- Expected value:

## 5. Current State Analysis
- Existing behavior:
- Existing architecture/components:
- Existing files/modules likely involved:
- Existing data flow:
- Existing API/UI/CLI/workflow behavior:
- Existing tests or verification coverage:

## 6. Desired End State
- Expected final behavior:
- User-facing outcome:
- Developer-facing outcome:
- System/workflow outcome:
- Backward compatibility expectations:

## 7. Scope
- In scope:
- Out of scope:
- Non-goals:
- Explicit boundaries:

## 8. Users And Use Cases
- Primary users:
- Secondary users:
- Main use cases:
- Edge use cases:

## 9. Functional Requirements
- Required behaviors:
- Inputs:
- Outputs:
- State changes:
- Error states:
- Permissions/auth expectations:

## 10. Non-Functional Requirements
- Performance expectations:
- Reliability expectations:
- Security/privacy expectations:
- Accessibility expectations:
- Maintainability expectations:
- DX expectations:

## 11. Affected Surfaces
- Files likely affected:
- Directories likely affected:
- UI surfaces:
- API routes:
- Components:
- Services:
- Database/schema:
- Config/env vars:
- Tests:
- Docs:
- Workflow artifacts:

## 12. Dependency And Integration Map
- Internal dependencies:
- External packages/services:
- Integration points:
- Ordering constraints:
- Migration/setup requirements:

## 13. Data And State Impact
- Data models:
- Database changes:
- State management changes:
- Cache/session/local storage impact:
- Backward compatibility impact:

## 14. UX / API / Workflow Expectations
- UX expectations:
- API contract expectations:
- CLI/workflow behavior:
- Error handling expectations:
- Empty/loading/success/failure states:

## 15. Execution Strategy
- Recommended implementation approach:
- Suggested sequencing:
- Safe rollout/migration approach:
- Files to inspect before editing:
- Decisions to avoid until more evidence exists:

## 16. Verification Strategy
- Required automated checks:
- Required manual checks:
- Test types needed:
- Build/lint/typecheck expectations:
- Acceptance evidence required:
- Proof of completion:

## 17. Acceptance Criteria
- [ ] Concrete measurable criterion 1
- [ ] Concrete measurable criterion 2
- [ ] Concrete measurable criterion 3

## 18. Edge Cases And Failure Modes
- Edge cases:
- Failure modes:
- Regression risks:
- Recovery expectations:

## 19. Risks And Mitigations
- Technical risks:
- Product/UX risks:
- Security risks:
- Scope risks:
- Mitigation plan:

## 20. Assumptions
- Explicit assumptions:
- Confidence level:
- What to revisit if assumptions are wrong:

## 21. Open Questions
- Blocking questions:
- Non-blocking questions:
- Execution impact:

## 22. Task Extraction Notes
- Suggested vertical task boundaries:
- Suggested first task:
- Suggested task ordering:
- Areas that should not become separate tasks:
- How the 3-pass Build -> Refine -> Polish loop should apply:

Task plans in `_task/` must be derived from this detailed spec and must cite or reference the detailed spec sections they use, especially affected surfaces, dependency and integration map, data and state impact, UX/API/workflow expectations, execution strategy, verification strategy, acceptance criteria, edge cases and failure modes, risks and mitigations, assumptions, open questions, and task extraction notes.

Workflow health must be `Partial` or `Failed` if a required detailed spec section is missing and was not repaired before planning.
