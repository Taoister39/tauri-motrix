#!/bin/bash

echo "Checking dependency versions across workspace..."

raw_output=$(FORCE_COLOR=true pnpm exec syncpack lint 2>&1)
exit_code=$?

# Check if syncpack lint found no issues
if [[ $exit_code -eq 0 ]] && [[ "$raw_output" == *"No issues found"* ]]; then
    echo "✓ All dependencies are in sync across the workspace."
    exit 0
fi

# If there are issues, show the output
echo "$raw_output"
echo ""
echo "Issues found! Please run 'pnpm exec syncpack fix' to automatically fix the mismatches."

exit 1
