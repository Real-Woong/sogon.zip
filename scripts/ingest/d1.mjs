/**
 * 프로덕션 D1을 스크립트에서 읽고 쓰는 얇은 래퍼.
 *
 * wrangler는 진행 로그를 대개 stderr로 내지만 `--file`일 때는 "├ Checking…" 같은
 * 진행 표시가 stdout에도 섞인다. 그래서 stdout을 그냥 파싱하면 안 되고,
 * JSON이 시작하는 줄을 찾아서 거기서부터 읽는다.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DATABASE = 'sogonzip-db';

/** 진행 표시를 걷어내고 JSON 본문만 꺼낸다. */
function extractJson(stdout) {
  const lines = stdout.split('\n');

  for (let at = 0; at < lines.length; at += 1) {
    const head = lines[at].trim();
    if (head !== '[' && head !== '{') continue;
    try {
      return JSON.parse(lines.slice(at).join('\n'));
    } catch {
      // 진행 표시 안에 대괄호가 있었을 뿐이다. 다음 후보를 본다.
    }
  }

  throw new Error(`wrangler 응답에서 JSON을 찾지 못했다: ${stdout.trim().slice(-300)}`);
}

function run(args) {
  const stdout = execFileSync(
    'yarn',
    ['wrangler', 'd1', 'execute', DATABASE, '--remote', ...args, '--json', '-y'],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    }
  );

  const parsed = extractJson(stdout);
  if (!Array.isArray(parsed)) {
    throw new Error(parsed?.error?.text ?? stdout.slice(0, 300));
  }
  return parsed;
}

/** SELECT 결과 행 배열. */
export function query(sql) {
  return run(['--command', sql]).flatMap(result => result.results ?? []);
}

/**
 * SQL 파일을 실행한다. 바뀐 행 수는 돌려주지 않는다 —
 * `--file`일 때 wrangler가 주는 `meta.changes`는 실제 행 수보다 크게 나온다
 * (1행짜리 UPDATE에 2가 온다). 결과를 확인해야 하면 실행 뒤 다시 SELECT한다.
 */
export function execFile(path) {
  run([`--file=${path}`]);
}

/** SQL 리터럴. 문자열은 작은따옴표를 이중화한다. */
export function quote(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `'${String(value).replaceAll("'", "''")}'`;
}
