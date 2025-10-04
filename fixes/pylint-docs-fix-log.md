# Fix Log — Python CI and Docs Hardening (2025-02-15)

## Fix Attempt 1: Adjust requirements path for CI linting
- **Command:** `python3 -m pip install -r requirements/pylint.txt`
- **Result:** Failed (`ERROR: Could not open requirements file: ... requirements/services/log-analyzer/requirements.txt`)
- **Resolution:** Updated `requirements/pylint.txt` to use relative path `../services/log-analyzer/requirements.txt`.
- **Verification:** Re-ran `python3 -m pip install -r requirements/pylint.txt` → success (see evidence in shell history chunk `b299d1`).

## Fix Attempt 2: Ensure pylint binary availability in CI
- **Command:** `pylint services/prompt_enhancer.py services/log-analyzer`
- **Result:** Failed (`bash: command not found: pylint`).
- **Resolution:** Switched workflow command to `python -m pylint ...` and used same approach locally.
- **Verification:** `python3 -m pylint services/prompt_enhancer.py services/log-analyzer` → score 10.00/10 (evidence `evidence/pylint.log`).
