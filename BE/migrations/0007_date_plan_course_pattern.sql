-- 0007: 사용자가 고른 데이트 코스 흐름
--
-- NULL이면 기본 골격을 사용하고, JSON 배열이면 그 순서로 장소 슬롯을 만든다.
-- 이 파일은 한 번만 실행한다.
--   yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0007_date_plan_course_pattern.sql

ALTER TABLE date_plans ADD COLUMN course_pattern_json TEXT;
