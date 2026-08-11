-- 0005: 약속에 시간 창과 예산을 붙인다
--
-- 하루짜리 코스를 만들려면 "몇 시부터 몇 시까지"가 있어야 한다. 0004는 시작
-- 시각(start_time)만 받았다. 끝나는 시각이 없으면 슬롯을 몇 개 만들지, 저녁을
-- 넣을지 말지를 정할 수 없다.
--
-- ## 왜 취향 프로필이 아니라 약속에 붙나
--
-- 시간 창·출발 동네·예산은 취향이 아니라 **그날의 설정**이다. "나는 성수를
-- 좋아한다"가 아니라 "이번 토요일엔 성수에서 만난다"다. 같은 커플이 다음 주엔
-- 잠실에서 만날 수 있고, 그건 취향이 바뀐 게 아니다.
--
-- 프로필로 두면 매번 고치러 들어가야 하고, 고치는 걸 잊으면 지난주 설정으로
-- 코스가 나온다. 약속에 두면 약속을 만들 때 자연히 정해진다.
--
-- ## 0005 번호에 대해
--
-- 이 번호로 온보딩 마이그레이션(`0005_onboarding.sql`)을 썼다가 접었다
-- (`docs/direction/03-decisions.md` #26). **프로덕션에 적용한 적이 없어서**
-- 번호를 그대로 다시 쓴다. 혹시 어딘가에 적용했다면 `onboarding_answers`
-- 테이블이 남아 있을 텐데, 아무것도 참조하지 않으므로 그냥 두거나 지우면 된다.
--
-- ALTER TABLE ... ADD COLUMN은 SQLite에서 IF NOT EXISTS를 지원하지 않는다.
-- 이 파일은 한 번만 실행한다.
--   yarn wrangler d1 execute sogonzip-db --remote --file=BE/migrations/0005_date_plan_window.sql

-- 끝나는 시각. HH:mm, Asia/Seoul. NULL이면 아직 안 정한 것이고, 코스는
-- start_time부터 기본 창(6시간)으로 만든다.
ALTER TABLE date_plans ADD COLUMN end_time TEXT;

-- 어디서 만나는가. places.area_code와 같은 값을 쓴다(성수, 연남 ...).
-- 후보 생성이 이 값으로 지오해시 격자를 좁힌다. NULL이면 방이 지난번에 쓴
-- 동네를 쓰거나, 그것도 없으면 전체에서 뽑는다.
ALTER TABLE date_plans ADD COLUMN origin_area TEXT;

-- 1인 예산 상한(원). NULL은 "정하지 않음"이고 필터에서 제외되지 않는다.
--
-- ⚠️ places.price_level은 **식사에만 통째로 없다.** 음식점 0/458 · 카페 1/108.
-- 활동 268/543 · 전시 95/223은 서울 문화행사가 USE_FEE로 채워줬다.
-- 즉 예산으로 거를 수 있는 건 활동·전시뿐이고, 하루 예산의 큰 몫인 식사는
-- 못 거른다(05-open-questions Q14). 그래도 받아두는 이유는 코스 카드에
-- "1인 8만원 예상"을 보여주고, 나중에 가격 데이터가 들어왔을 때 소급할 수
-- 없는 "그때 얼마로 잡았나"를 지금부터 남기기 위해서다.
-- **못 거르는 슬롯에서 거르는 척은 하지 않는다.**
ALTER TABLE date_plans ADD COLUMN budget_per_person INTEGER;

-- 다가오는 약속을 훑을 때 시간 창까지 한 번에 읽는다. 코스 생성 Cron이
-- 매일 "내일 이후 planned 약속 전부"를 이 인덱스로 가져간다.
CREATE INDEX idx_date_plans_window
  ON date_plans(status, scheduled_date, start_time);
