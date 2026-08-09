/**
 * `.dev.vars`에서 API 키를 읽는다.
 *
 * 키를 명령줄 인자나 로그로 넘기지 않기 위해 존재한다. 이 파일을 거치는 값은
 * 절대 출력하지 않는다. 키가 한 번이라도 터미널에 찍히면 그때부터는
 * 사람 눈, 셸 히스토리, 대화 기록 어디에든 남는다.
 *
 * `.dev.vars`는 gitignore에 있다. 커밋되지 않는다.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** `.dev.vars`를 파싱해 객체로 돌려준다. 파일이 없으면 빈 객체다. */
export function loadDevVars() {
  let text;
  try {
    text = readFileSync(join(root, '.dev.vars'), 'utf8');
  } catch {
    return {};
  }

  const vars = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // 따옴표로 감싼 값도 받는다.
    if (value.length > 1 && (value.at(0) === '"' || value.at(0) === "'") && value.at(-1) === value.at(0)) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

/**
 * 키를 하나 꺼낸다. 없으면 어떻게 채우는지 알려주고 종료한다.
 * 실패 메시지에도 값은 절대 넣지 않는다.
 */
export function requireKey(name) {
  const value = process.env[name] ?? loadDevVars()[name];
  if (!value) {
    console.error(`\n${name}가 없다.\n`);
    console.error('프로젝트 루트에 `.dev.vars`를 만들고 아래 줄을 넣는다:');
    console.error(`\n  ${name}=발급받은키\n`);
    console.error('이 파일은 gitignore에 있어서 커밋되지 않는다.');
    console.error('키를 터미널에 echo 하거나 채팅에 붙여넣지 않는다.\n');
    process.exit(1);
  }
  return value;
}

/** 로그에 URL을 남길 때 키 부분을 가린다. */
export function maskKey(text, key) {
  return key ? text.split(key).join('***') : text;
}
