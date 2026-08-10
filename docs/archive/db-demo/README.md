# Sogon.zip DB Demo

> **아카이브 문서다.** 2026-08-10 정리에서 `DB-DEMO/`가 `docs/archive/db-demo/`로
> 옮겨졌다. 아래 명령의 `DB-DEMO/` 경로는 원문 그대로이므로, 실행하려면
> `docs/archive/db-demo/`로 바꿔 읽는다. 실제 스키마는 `BE/migrations/`가 정본이다.

시연용 로컬 SQL DB 설계입니다. 지금은 SQLite로 바로 실행할 수 있게 만들었고, 이후 Supabase/PostgreSQL 같은 서버 DB로 옮길 때도 테이블 의미가 유지되도록 구성했습니다.

## Files

- `schema.sql`: 테이블, 인덱스, 기본 제약 조건
- `seed.sql`: 김진웅/서연 데모 계정과 초기 데이터
- `queries.sql`: 앱 화면별로 필요한 대표 조회 쿼리

## Quick Start

```bash
cd /Users/kim_jinwoong/Desktop/project/Project_Personal/App/SogonZip
sqlite3 DB-DEMO/sogonzip-demo.sqlite < DB-DEMO/schema.sql
sqlite3 DB-DEMO/sogonzip-demo.sqlite < DB-DEMO/seed.sql
sqlite3 DB-DEMO/sogonzip-demo.sqlite < DB-DEMO/queries.sql
```

## Demo Account

```text
ID: 김진웅
Password: 1234
Partner: 서연
```

## Migration Note

이 DB는 시연용입니다. 실제 서비스 전환 시에는 비밀번호 평문 저장을 제거하고, `auth_users`는 인증 서버 또는 Supabase Auth 같은 외부 인증으로 분리해야 합니다.
