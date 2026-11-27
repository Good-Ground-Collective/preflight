#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
want_bad="bodyclose containedctx depguard gochecknoinits gocritic ireturn modernize noctx revive staticcheck"
failed=0

for preset in go-no-go recommended; do
  config="$here/../$preset.golangci.yml"
  golangci-lint config verify -c "$config"

  printf '%s: good fixture\n' "$preset"
  (cd "$here/good" && golangci-lint run -c "$config" ./...) || failed=1

  printf '%s: bad fixture\n' "$preset"
  found="$(cd "$here/bad" && golangci-lint run -c "$config" --output.json.path=stdout --output.text.path=/dev/null --show-stats=false ./... | jq -r '[.Issues[].FromLinter] | unique | join(" ")' || true)"
  for linter in $want_bad; do
    case " $found " in
      *" $linter "*) ;;
      *) printf '  missing expected finding from %s\n' "$linter"; failed=1 ;;
    esac
  done
done

exit "$failed"
