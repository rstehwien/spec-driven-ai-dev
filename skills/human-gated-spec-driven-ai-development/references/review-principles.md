# Review Principles

Use these principles during `review-phase` and `final-review`.

## SOLID
- Check whether each module has one clear reason to change.
- Check whether abstractions can be extended without editing unrelated code.
- Check whether interfaces are narrow and purposeful.
- Check whether high-level policy depends on abstractions rather than volatile details.

## DRY
- Find duplicated logic, repeated business rules, or repeated test setup that should become shared support.
- Avoid deduplication that makes the code harder to understand.

## YAGNI
- Find speculative abstractions, unused extension points, and infrastructure without a current need.
- Prefer direct implementations unless real reuse pressure exists.

## KISS
- Prefer simpler control flow, simpler boundaries, and clearer naming.
- Call out cleverness that harms readability or debugging.

## Separation of Concerns
- Keep business rules, persistence, IO, UI, and orchestration meaningfully separated.
- Call out mixed responsibilities.

## Coupling and Cohesion
- Favor low coupling and high cohesion.
- Call out modules that would force broad change for a small feature.

## Testability
- Check whether important behavior can be tested without fragile setup.
- Prefer behavior-focused tests over implementation-detail tests.

## Review output expectations
- Distinguish must-fix from should-fix and optional improvements.
- Quote exact code examples when possible for must-fix issues.
- Recommend simplification before recommending additional abstraction.
