#!/usr/bin/env bash
# Usage: ./scripts/bump-version.sh 0.2.0
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
    echo "Usage: $0 <version>  (e.g. 0.2.0)" >&2
    exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: version must be in semver format (e.g. 1.2.3)" >&2
    exit 1
fi

echo "Bumping to $VERSION..."

# package.json
jq --indent 4 --arg v "$VERSION" '.version = $v' "$ROOT/package.json" \
    > "$ROOT/package.json.tmp" \
    && mv "$ROOT/package.json.tmp" "$ROOT/package.json"

# package-lock.json — version appears at root and under packages[""]
jq --indent 4 --arg v "$VERSION" '.version = $v | .packages[""].version = $v' "$ROOT/package-lock.json" \
    > "$ROOT/package-lock.json.tmp" \
    && mv "$ROOT/package-lock.json.tmp" "$ROOT/package-lock.json"

echo "Updated:"
echo "  package.json      -> $VERSION"
echo "  package-lock.json -> $VERSION"
echo ""
echo "Running checks..."
(cd "$ROOT" && npm run format)
(cd "$ROOT" && npm run lint)
(cd "$ROOT" && npm run typecheck)
echo "All checks passed."
echo ""
echo "Next steps:"
echo "  git add package.json package-lock.json"
echo "  git commit -m \"Bump version to $VERSION\""
echo "  git tag v$VERSION && git push origin main && git push origin v$VERSION"
