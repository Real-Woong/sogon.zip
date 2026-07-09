import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const inboxPath = resolve('FE/ProtoWeb/public/prototype-inbox.json');

const receivedFile = {
  id: `seoyeon-${Date.now()}`,
  sender: '서연',
  title: '카페취향.zip',
  content: '다음 데이트는 조용한 창가 자리 있는 카페였으면 좋겠어.',
  message: '진웅아, 이번 주말에 같이 가보고 싶은 분위기야.',
  receivedAt: new Date().toISOString()
};

mkdirSync(dirname(inboxPath), { recursive: true });
writeFileSync(inboxPath, JSON.stringify({ files: [receivedFile] }, null, 2));

console.log('서연의 소곤.zip이 도착했습니다.');
console.log(`파일: ${receivedFile.title}`);
