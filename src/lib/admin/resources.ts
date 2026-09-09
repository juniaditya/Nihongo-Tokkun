import type { Database } from '@/types/database.types';

export type ContentTable = 'courses' | 'lessons' | 'kotoba' | 'bunpou' | 'questions' | 'question_options' | 'flashcards' | 'subscription_tiers';
export type AdminField = { key: string; label: string; type?: 'text' | 'textarea' | 'number' | 'boolean' | 'select'; required?: boolean; options?: string[]; reference?: 'courses' | 'lessons' | 'kotoba' | 'bunpou' | 'questions' | 'dokkai_passages'; min?: number; max?: number; initial?: string | number | boolean };
export type Resource = { table: ContentTable; label: string; titleKey: string; fields: AdminField[] };
const text = (key: string, label: string, required = false): AdminField => ({ key, label, required });
const long = (key: string, label: string, required = false): AdminField => ({ key, label, required, type: 'textarea' });
const reference = (key: string, label: string, table: AdminField['reference'], required = false): AdminField => ({key, label, reference: table, required});
const order: AdminField = { key: 'sort_order', label: 'Urutan', type: 'number', initial: 0, required: true };
const active: AdminField = { key: 'is_active', label: 'Aktif', type: 'boolean', initial: true };
const supplementary: AdminField = { key: 'is_supplementary', label: 'Materi tambahan', type: 'boolean' };
const lesson = reference('lesson_id', 'Lesson', 'lessons', true);
const sources = [reference('kotoba_id','Sumber Kotoba','kotoba'), reference('bunpou_id','Sumber Bunpou','bunpou')];
export const resources: Record<string, Resource> = {
  courses: { table: 'courses', label: 'Kursus', titleKey: 'name', fields: [text('name','Nama',true), {key:'level',label:'Level JLPT',type:'select',options:['N5','N4','N3','N2','N1']},long('description','Deskripsi')] },
  lessons: { table: 'lessons', label: 'Lesson', titleKey:'title', fields:[reference('course_id','Kursus','courses',true),{key:'category',label:'Kategori',type:'select',options:['kotoba','bunpou','dokkai'],required:true}, {key:'number',label:'Nomor unit',type:'number',min:1,required:true},text('title','Judul'),long('description','Deskripsi'),order,active,{key:'is_guest_accessible',label:'Dapat dilihat tamu',type:'boolean'},{key:'time_limit_seconds',label:'Batas waktu (detik, kosong = tanpa timer)',type:'number',min:1}] },
  kotoba: { table:'kotoba',label:'Kotoba',titleKey:'word',fields:[lesson,text('word','Kata',true),text('reading','Cara baca'),long('meaning','Arti'),long('explanation','Penjelasan'),order,active,supplementary] },
  bunpou: { table:'bunpou',label:'Bunpou',titleKey:'grammar',fields:[lesson,text('grammar','Pola tata bahasa',true),long('meaning','Arti'),long('function','Fungsi'),long('formula','Rumus'),long('examples','Contoh'),long('key_difference','Perbedaan utama'),order,active,supplementary] },
  questions: { table:'questions',label:'Soal',titleKey:'question_text',fields:[lesson,...sources,reference('passage_id','Sumber bacaan','dokkai_passages'),text('question_type','Kode tipe latihan',true),long('question_text','Pertanyaan',true),long('explanation','Penjelasan'),order,{...active,initial:false}] },
  question_options: { table:'question_options',label:'Opsi jawaban',titleKey:'option_text',fields:[reference('question_id','Soal','questions',true),long('option_text','Jawaban',true),{key:'option_order',label:'Nomor opsi (1–4)',type:'number',min:1,max:4,required:true},{key:'is_correct',label:'Jawaban benar',type:'boolean'},long('explanation','Penjelasan')] },
  flashcards: { table:'flashcards',label:'Flashcard',titleKey:'front',fields:[lesson,...sources,text('front','Depan kartu',true),text('reading','Cara baca'),long('meaning','Arti'),long('explanation','Penjelasan'),order,active,supplementary] },
  subscriptions: {table:'subscription_tiers',label:'Tier langganan',titleKey:'name',fields:[text('code','Kode tier',true),text('name','Nama tier',true),long('description','Deskripsi'),order,active]},
};
export type ContentInsert = Database['public']['Tables'][ContentTable]['Insert'];
export type ContentRow = Database['public']['Tables'][ContentTable]['Row'];
// The allowlisted form registry validates this dynamic writer at runtime.
export type ContentWriterDatabase = { public: { Tables: { [K in ContentTable]: {
  Row: {id:string;updated_at:string}; Insert: Record<string,string|number|boolean|null>;
  Update: Record<string,string|number|boolean|null>; Relationships: [];
} }; Views: Record<never,never>; Functions: Record<never,never> } };
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseContent(resource: Resource, form: FormData) {
  const value: Record<string, string | number | boolean | null> = {};
  for (const field of resource.fields) {
    const raw = String(form.get(field.key) ?? '').trim();
    if (field.type === 'boolean') { value[field.key] = raw === 'on'; continue; }
    if (!raw) { if (field.required) throw new Error(`${field.label} wajib diisi.`); value[field.key] = null; continue; }
    if (raw.length > 20000) throw new Error(`${field.label} terlalu panjang.`);
    if (field.reference && !uuidPattern.test(raw)) throw new Error(`${field.label} tidak valid.`);
    if (field.options && !field.options.includes(raw)) throw new Error(`${field.label} tidak valid.`);
    if (field.type === 'number') {
      const n = Number(raw);
      if (!Number.isSafeInteger(n) || n < (field.min ?? -2147483648) || n > (field.max ?? 2147483647)) throw new Error(`${field.label} tidak valid.`);
      value[field.key] = n;
    } else value[field.key] = raw;
  }
  return value;
}
