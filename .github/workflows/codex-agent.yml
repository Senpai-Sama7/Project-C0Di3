# Goals
1) Implement performance pass and verification for selected hot paths.
2) Keep behavior identical. All transforms must pass unit tests and translation validation.
3) Provide a clean PR with diffs, benchmark table, and proof logs.

# Scope
- Only modify files under src/, lib/, or kernels/ unless tests require fixtures.
- Prefer local changes over dependency churn.

# Tools available
- LLVM toolchain with clang and opt.
- Alive2 binaries available on PATH as opt-alive-test.sh and alive-tv.
- TVM Python for kernel auto-scheduling when a tensor op is present.

# Required procedure
1) Read CONTRIBUTING and Makefile targets.
2) Add minimal tests first for any new public API.
3) Propose code edits as small, reviewable commits.
4) For C++ or Rust:
   - build with -O2
   - extract LLVM IR
   - run Alive2 against each changed function IR after optimization
5) For Python tensor paths:
   - capture graph
   - apply fusion or schedule search
   - verify numeric equivalence on randomized seeds
6) Update docs and changelog.

# Output
- patches committed on a feature branch
- /artifacts/bench.json and /artifacts/proofs.log
- PR body with summary table and instructions to reproduce
