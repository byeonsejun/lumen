# CLAUDE.md

LUMEN — 3D 가구 쇼핑몰 (포트폴리오의 SHOPPY 를 대체).

- **이어서 작업할 땐 로컬 인수인계 문서 `.superpowers/HANDOFF.md`(git 에 없음)를 먼저 읽는다** — 있으면
- 설계: [`docs/superpowers/specs/2026-11-02-lumen-design.md`](./docs/superpowers/specs/2026-11-02-lumen-design.md) · 2차 [`2026-11-02-lumen-phase2-design.md`](./docs/superpowers/specs/2026-11-02-lumen-phase2-design.md)
- 작업 절차는 superpowers 스킬을 따른다. 플러그인이 없으면
  [`docs/external/superpowers/skills/`](./docs/external/superpowers/skills/) 의 `SKILL.md` 를 직접 읽는다
- 사본 갱신: `./scripts/sync-superpowers.sh`
- 디자인 작업에는 로컬 외부 스킬(`.claude/skills/`, git 에 없음 — 출처는 그 안의 `SOURCES.md`)을 쓴다 — 있으면
  - 역할: impeccable = 점검(audit · critique · polish) · ui-ux-pro-max = 팔레트 · 글꼴 · UX 가이드라인 검색 · taste-skill = "AI 가 만든 티" 목록(`references/tells.md`)
  - **브랜드가 우선이다.** 어두운 시네마틱 쇼룸(배경 `#0b0a09` · 조명색 accent `#e8b679`)을 바꾸는 제안은 받지 않는다. 스킬이 새 방향(팔레트 · 레이아웃)을 "뽑아" 주더라도 기본기 점검에만 쓴다
  - impeccable 엔진(외부 바이너리)은 자동 모드에서 실행이 막힌다. 편집마다 도는 훅(`/impeccable hooks on`)은 켜지 않는다
