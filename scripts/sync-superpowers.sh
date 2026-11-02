#!/usr/bin/env bash
# docs/external/superpowers/ 를 로컬에 설치된 superpowers 플러그인 최신본으로 갱신한다.
# 사용법: ./scripts/sync-superpowers.sh [소스경로]
set -euo pipefail

DEST="$(cd "$(dirname "$0")/.." && pwd)/docs/external/superpowers"
CACHE="$HOME/.claude/plugins/cache/superpowers-marketplace/superpowers"

if [ $# -ge 1 ]; then
  SRC="$1"
else
  # 캐시에서 가장 높은 버전 디렉토리를 고른다
  SRC="$(find "$CACHE" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | sort -V | tail -1)"
fi

if [ -z "${SRC:-}" ] || [ ! -d "$SRC/skills" ]; then
  echo "error: superpowers 소스를 찾을 수 없습니다: ${SRC:-<없음>}" >&2
  echo "  /plugin 으로 superpowers 를 설치했는지 확인하거나, 소스 경로를 인자로 넘기세요." >&2
  exit 1
fi

VERSION="$(basename "$SRC")"
COMMIT="$(git -C "$SRC" rev-parse HEAD 2>/dev/null || echo '<알 수 없음>')"
echo "source : $SRC"
echo "version: $VERSION"
echo "commit : $COMMIT"

rm -rf "$DEST/skills"
cp -R "$SRC/skills" "$DEST/skills"
cp "$SRC/LICENSE" "$DEST/LICENSE"

# 스킬 저자의 평가용 픽스처 제거 (절차 문서가 아님)
find "$DEST/skills" \
  \( -name 'CREATION-LOG.md' -o -name 'test-pressure-*.md' -o -name 'test-academic.md' \) \
  -delete

echo
echo "완료. docs/external/superpowers/README.md 의 버전/커밋/일자를 갱신하세요:"
echo "  버전 $VERSION · 커밋 $COMMIT"
echo "이어서 docs/workflow/ 의 참조가 깨지지 않았는지 확인하세요:"
echo "  git diff --stat docs/external/superpowers"
