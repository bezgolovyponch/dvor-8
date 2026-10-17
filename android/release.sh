#!/bin/sh
# PUBLISH THE STABLE BUILD — the operator's rule: "when you get a stable version push it on the link in repo".
#
#   sh android/release.sh 0.5.0 5
#
# Refuses unless the chain is GREEN (exit 0): stability is the chain's verdict, not a judgement call. Then it builds
# the signed APK, creates the GitHub release the README links to, rewrites that link, and commits only the README -
# the release asset is the artefact, the repo only points at it.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(dirname "$HERE")
VERSION=${1:?usage: release.sh <version> <versionCode>}
CODE=${2:?usage: release.sh <version> <versionCode>}
REPO=bezgolovyponch/dvor-8
cd "$ROOT"

echo "== the stability gate: the chain must exit 0"
if ! CHROME=${CHROME:-/tmp/chrome-nosandbox.sh} node tools/chain.mjs > /tmp/release-chain.log 2>&1; then
  echo "REFUSED: the chain is not green. Its last lines:"; tail -6 /tmp/release-chain.log; exit 1
fi
echo "the chain passed; its vector:"
grep -E "PASS|OK  |of 19|of 12|BASELINE|MATCHES|PAIRED" /tmp/release-chain.log | tail -12

echo "== the APK"
VERSION=$VERSION CODE=$CODE sh "$HERE/build.sh"
APK=$HERE/out/dvor-8-$VERSION.apk
[ -f "$APK" ] || { echo "REFUSED: no APK at $APK"; exit 1; }

echo "== the release"
NOTES=$(cat <<TXT
DVOR-8 $VERSION — built from the chain-green tree.

$(grep -E "criteria MET|lines match|BASELINE|DELIVERY|PAIRED|MATCHES" /tmp/release-chain.log | sed 's/^/· /' | head -8)
TXT
)
gh release create "v$VERSION" "$APK" --repo "$REPO" --title "DVOR-8 $VERSION" --notes "$NOTES" || {
  echo "REFUSED: gh release failed (is the tag taken?)"; exit 1; }

echo "== the link in the repo"
URL="https://github.com/$REPO/releases/download/v$VERSION/dvor-8-$VERSION.apk"
python3 - "$URL" "$VERSION" <<'PY'
import re, sys
url, ver = sys.argv[1], sys.argv[2]
p = 'README.md'
s = open(p).read()
s = re.sub(r'\[Download dvor-8-[0-9.]+\.apk\]\([^)]*\)',
           f'[Download dvor-8-{ver}.apk]({url})', s, count=1)
open(p, 'w').write(s)
print('README now points at', url)
PY
git add README.md && git -c user.name="dvor8-loop" -c user.email="loop@dvor8.local" commit -q -m "release: $VERSION — the chain-green tree, published

The operator's rule: publish only a stable version, on the repo's own link.
The release asset is the artefact; the repo only points at it.

$NOTES" && git push origin main
echo "PUBLISHED $URL"
