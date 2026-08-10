# 저장소 문서·미사용 코드 정리

- 작업일: 2026-08-10
- 기준: 현재 빌드 경로, 실제 import 그래프, `docs/direction/`의 최신성

## 문제

루트와 소스 폴더에 현재 구현과 무관한 초기 초안, HTML 프로토타입, DB 데모,
Figma 입력 문서, 생성된 shadcn UI 전체가 함께 있었다. 어떤 문서가 현재 기준인지
파일 위치만 보고 판단하기 어려웠고, 실제 화면 22개 TypeScript 파일보다 미사용 UI 파일이
더 많았다.

## 문서 정리

다음 과거 자료를 `docs/archive/`로 이동했다.

- 초기 제품 아카이브와 HTML 프로토타입
- 2026-07 시점의 긴 `SOGONZIP.md` 원문
- 추천 v1 설계
- 완료된 방향 리뷰 요청 프롬프트
- 날짜 계획 전환 이전 와이어프레임
- Figma 생성용 원문 프롬프트
- 실제 D1 도입 전 SQLite DB 데모

`docs/archive/README.md`에 각 폴더의 의미와 “현재 기준이 아님”을 명시했다.

루트 `SOGONZIP.md`는 다음 내용만 가진 짧은 안내판으로 다시 작성했다.

- 반드시 읽어야 할 방향 문서
- 현재 추천 L0 작업 순서
- 저장소 구조
- `yarn verify`
- `0001~0004` 마이그레이션 목록
- 절대 규칙과 구현 규칙 요약

`README.md`, 방향 문서, 추천 v2 문서, 배포 문서와 기존 개발 로그의 링크도 새 위치에
맞춰 갱신했다. 현재 문서 16개의 로컬 Markdown 링크를 검사했고 깨진 링크는 0개였다.

## 미사용 프론트엔드 코드 제거

`FE/ProtoWeb/src/main.tsx`에서 시작해 상대 import를 따라가는 그래프를 만들었다.
정리 전 TypeScript 파일 71개 중 49개가 실제 앱 진입점에서 도달 불가능했다.

제거한 항목:

- `FE/ProtoWeb/src/app/components/ui/` 전체 48개
- 사용되지 않던 `figma/ImageWithFallback.tsx`
- 빈 `styles/globals.css`
- 사용되지 않던 `default_shadcn_theme.css`
- 더 이상 사실과 맞지 않는 Figma/Unsplash `ATTRIBUTIONS.md`

정리 후 ProtoWeb TypeScript 파일은 22개이며 22개 모두 `main.tsx`에서 도달 가능하다.

## 의존성 정리

루트 런타임 의존성을 57개에서 실제 사용하는 5개로 줄였다.

```text
lucide-react
react
react-dom
react-router
tw-animate-css
```

`yarn install`로 `yarn.lock`을 다시 만들었고, 제거한 UI 파일만 사용하던 약 190개의
직접·전이 패키지가 lockfile에서 빠졌다.

## 유지한 것

- `docs/direction/` 전체: 제품 규칙·로드맵·ADR·미결 질문의 현재 원문
- `docs/reference/recommendation/date-recommendation-v2-ai.md`: 추천 로그와 L0~L3 설계
- `docs/reference/data/date-course-data-strategy.md`: 장소 수집·검증 전략
- `BETA_DEPLOY.md`: 현재 배포와 운영 확인 절차
- `FE/App/mobile/`: 로드맵에서 보류 중이지만 다음 단계 골격으로 명시된 코드
- `CLAUDE.md`와 `AGENTS.md`: 각 에이전트의 저장소 진입점
- D1 마이그레이션과 수집 스크립트 전체

## 복구 방법

`docs/archive/`로 옮긴 파일은 저장소 안에 그대로 남아 있다. 제거한 미사용 코드와 테마는
Git의 이전 커밋에서 복구할 수 있다.

## 실제 삭제한 내용

아카이브로 이동한 자료와 실제 삭제한 자료를 구분한다.

### 실제 삭제 — Git 기록에서만 복구

| 대상 | 이유 |
|---|---|
| `FE/ProtoWeb/src/app/components/ui/`의 48개 파일 | 전부 `main.tsx` import 그래프에서 도달 불가능 |
| `FE/ProtoWeb/src/app/components/figma/ImageWithFallback.tsx` | import 0회 |
| `default_shadcn_theme.css` | import 0회인 Figma/shadcn 생성 테마 |
| `FE/ProtoWeb/src/styles/globals.css` | 내용이 없는 빈 파일이며 import도 없음 |
| `ATTRIBUTIONS.md` | 제거한 shadcn·Unsplash 생성물에 대한 낡은 고지 |
| `postcss.config.mjs` | 플러그인이 하나도 없는 빈 설정. Tailwind는 Vite 플러그인이 처리 |

UI 파일과 함께 그 파일에서만 사용하던 Radix, MUI, Emotion, 폼·차트·캐러셀 등
52개 직접 런타임 의존성도 `package.json`에서 제거했다.

### 삭제하지 않고 아카이브로 이동

| 이전 위치 | 현재 위치 |
|---|---|
| `SogonZip_archive.md`, `sogon_zip_archive.html` | `docs/archive/product/` |
| 기존의 긴 `SOGONZIP.md` 원문 | `docs/archive/product/SOGONZIP-context-2026-07.md` |
| `DB-DEMO/` | `docs/archive/db-demo/` |
| `docs/date-recommendation-v1.md` | `docs/archive/recommendation/` |
| `docs/direction-review-prompt.md` | `docs/archive/reviews/` |
| `docs/wireframes/` | `docs/archive/wireframes/` |
| `FE/ProtoWeb/src/imports/pasted_text/` | `docs/archive/design-prompts/` |

### 현재 문서 폴더 재구성

```text
docs/
  direction/         제품 규칙·로드맵·ADR·미결 질문
  reference/         현재 구현의 상세 추천·데이터 설계
  development-log/   완료한 작업 기록과 삭제 내역
  archive/           현재 기준이 아닌 과거 자료
```

루트에는 자동 탐색이나 빌드·배포에 필요한 파일만 유지했다. `AGENTS.md`, `CLAUDE.md`,
`README.md`, `LICENSE`, `package.json`, `index.html`, Vite·TypeScript 설정,
Cloudflare의 `functions/`, 실제 코드 폴더는 도구가 기본 경로에서 찾으므로 이동하지 않았다.
