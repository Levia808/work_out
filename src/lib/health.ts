export type HealthSource = 'apple-health-export' | 'health-connect-export' | 'generic-json' | 'generic-csv';

export type HealthSnapshot = {
  source: HealthSource;
  importedAt: string;
  latestSleepHours?: number;
  latestWeightKg?: number;
  latestSteps?: number;
  latestActiveCalories?: number;
  recordCount: number;
};

type HealthRecord = {
  kind: 'sleep' | 'weight' | 'steps' | 'activeCalories';
  value: number;
  start: number;
  end?: number;
};

const STORAGE_KEY = 'fittrack.health.snapshot';

const normalizeKey = (key: string) => key.toLowerCase().replace(/[\s_-]+/g, '');

const firstValue = (record: Record<string, unknown>, keys: string[]) => {
  const aliases = new Set(keys.map(normalizeKey));
  return Object.entries(record).find(([key, value]) => aliases.has(normalizeKey(key)) && value !== undefined && value !== null && value !== '')?.[1];
};

const parseDate = (value: unknown): number | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const numberValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const typeName = (value: unknown) => String(value ?? '').toLowerCase().replace(/[\s_-]+/g, '');

const normalizeRecord = (record: Record<string, unknown>): HealthRecord | null => {
  const type = typeName(firstValue(record, ['type', 'name', 'identifier', 'dataType', 'data_type', 'metric', 'category']));
  const unit = typeName(firstValue(record, ['unit', 'units']));
  const rawValue = firstValue(record, ['value', 'quantity', 'amount', 'samples', 'count']);
  const value = numberValue(rawValue);
  const start = parseDate(firstValue(record, ['startDate', 'start_date', 'startTime', 'start_time', 'start', 'date', 'timestamp', 'time']));
  const end = parseDate(firstValue(record, ['endDate', 'end_date', 'endTime', 'end_time', 'end']));
  if (start === null) return null;

  // Apple Health sleep records are category records whose value is a text label
  // such as “AsleepCore”; their duration is encoded by startDate/endDate.
  if (type.includes('sleep') || type.includes('sleepanalysis') || type.includes('sleepsession')) {
    const hours = end && end > start
      ? (end - start) / 3_600_000
      : value !== null ? (value > 24 ? value / 3_600_000 : value) : 0;
    return hours > 0 ? { kind: 'sleep', value: hours, start, end: end ?? undefined } : null;
  }

  if (value === null) return null;
  if (type.includes('bodymass') || type.includes('weight') || unit.includes('kg') || unit.includes('kilogram') || unit.includes('lb') || unit.includes('pound')) {
    const weightKg = unit.includes('lb') || unit.includes('pound') ? value * 0.45359237 : value;
    return { kind: 'weight', value: weightKg, start };
  }
  if (type.includes('step')) return { kind: 'steps', value, start };
  if (type.includes('activeenergy') || type.includes('calorie') || type.includes('energy')) return { kind: 'activeCalories', value, start };
  return null;
};

const recordsFromJson = (data: unknown): HealthRecord[] => {
  const candidate = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? ((data as Record<string, unknown>).records ?? (data as Record<string, unknown>).samples ?? (data as Record<string, unknown>).data ?? [])
      : [];
  if (!Array.isArray(candidate)) return [];
  return candidate.flatMap(item => item && typeof item === 'object' ? [normalizeRecord(item as Record<string, unknown>)].filter((record): record is HealthRecord => Boolean(record)) : []);
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { value += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { values.push(value.trim()); value = ''; continue; }
    value += char;
  }
  values.push(value.trim());
  return values;
};

const parseCsv = (text: string): HealthRecord[] => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(header => header.trim().toLowerCase());
  return lines.slice(1).flatMap(line => {
    const columns = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? '']));
    const normalized = normalizeRecord(record);
    return normalized ? [normalized] : [];
  });
};

const parseAppleXml = (text: string): HealthRecord[] => {
  const document = new DOMParser().parseFromString(text, 'application/xml');
  return Array.from(document.querySelectorAll('Record')).flatMap(node => {
    const record = normalizeRecord({
      type: node.getAttribute('type'),
      value: node.getAttribute('value'),
      unit: node.getAttribute('unit'),
      startDate: node.getAttribute('startDate'),
      endDate: node.getAttribute('endDate'),
    });
    return record ? [record] : [];
  });
};

export async function importHealthFile(file: File): Promise<HealthSnapshot> {
  const text = await file.text();
  const extension = file.name.toLowerCase().split('.').pop();
  const isAppleXml = extension === 'xml' || text.includes('<HealthData') || text.includes('HKQuantityTypeIdentifier') || text.includes('HKCategoryTypeIdentifierSleepAnalysis');
  const isCsv = extension === 'csv' || file.type.includes('csv');
  let records: HealthRecord[];
  if (isAppleXml) records = parseAppleXml(text);
  else if (isCsv) records = parseCsv(text);
  else {
    try { records = recordsFromJson(JSON.parse(text) as unknown); }
    catch { throw new Error('无法读取 JSON 文件，请选择有效的健康数据导出文件。'); }
  }

  if (!records.length) throw new Error('未解析到有效健康记录。请导入 Apple Health XML 或 Health Connect CSV/JSON 导出文件。');
  const latest = (kind: HealthRecord['kind']) => records.filter(record => record.kind === kind).sort((a, b) => b.start - a.start)[0];
  const snapshot: HealthSnapshot = {
    source: isAppleXml ? 'apple-health-export' : isCsv ? 'health-connect-export' : 'generic-json',
    importedAt: new Date().toISOString(),
    latestSleepHours: latest('sleep')?.value,
    latestWeightKg: latest('weight')?.value,
    latestSteps: latest('steps')?.value,
    latestActiveCalories: latest('activeCalories')?.value,
    recordCount: records.length,
  };
  saveHealthSnapshot(snapshot);
  return snapshot;
}

export function loadHealthSnapshot(): HealthSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as HealthSnapshot : null;
  } catch {
    return null;
  }
}

export function saveHealthSnapshot(snapshot: HealthSnapshot) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function healthSourceLabel(source: HealthSource) {
  if (source === 'apple-health-export') return 'Apple 健康导出';
  if (source === 'health-connect-export') return 'Health Connect 导出';
  return '健康数据导入';
}

export function healthPlatformLabel() {
  if (typeof navigator === 'undefined') return '手机健康数据';
  const agent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(agent)) return 'Apple 健康';
  if (/android/.test(agent)) return 'Android Health Connect';
  return '手机健康数据';
}
