import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';

// Single-process durable room definitions. Live chat, guests and games stay ephemeral.
export function roomLibrary(file) {
  const records = new Map();
  if (file && existsSync(file)) {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(data)) throw Error('Kho phòng không hợp lệ.');
    for (const record of data) records.set(record.roomId, record);
  }
  const commit = next => {
    if (file) {
      mkdirSync(dirname(file), {recursive:true});
      writeFileSync(file+'.tmp', JSON.stringify([...next.values()]), {mode:0o600});
      renameSync(file+'.tmp', file);
    }
    records.clear(); for (const [id, record] of next) records.set(id, record);
  };
  return {records, put(record) {const next=new Map(records);next.set(record.roomId,structuredClone(record));commit(next);}};
}
export const normalizeAnswer = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9\p{L}]+/gu,' ').trim().replace(/\s+/g,' ');
