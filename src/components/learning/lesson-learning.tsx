import Link from 'next/link';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';
import { readAll, questionTypeLabel } from '@/lib/learning-progress';
import { masteryLabel, overallPercentage, percent, reviewedPercentage } from '@/lib/lesson-mastery';
import { ProgressBar } from '@/components/ui/progress-bar';

type Card = { id: string; kotoba_id: string | null; is_supplementary: boolean };
const panel = 'rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3';

export async function LessonLearning({ lessonId, category, userId }: { lessonId: string; category: string; userId?: string }) {
  const db = await createClient() as unknown as SupabaseClient<Database>;
  try {
    const [questions, scores, cards, supplementary] = await Promise.all([
      readAll<{question_type:string}>((from,to) => db.from('v_practice_questions').select('question_type').eq('lesson_id',lessonId).order('id').range(from,to)),
      userId ? db.from('lesson_type_progress').select('question_type,best_score,passed').eq('user_id',userId).eq('lesson_id',lessonId) : Promise.resolve({data:[],error:null}),
      category === 'dokkai' ? [] : readAll<Card>((from,to) => db.from('flashcards').select('id,kotoba_id,is_supplementary').eq('lesson_id',lessonId).eq('is_active',true).order('id').range(from,to)),
      category === 'kotoba' ? readAll<{id:string}>((from,to) => db.from('kotoba').select('id').eq('lesson_id',lessonId).eq('is_supplementary',true).order('id').range(from,to)) : [],
    ]);
    if (scores.error) throw scores.error;
    const supplementaryIds = new Set(supplementary.map(row => row.id));
    const mainCards = cards.filter(card => !card.is_supplementary && !supplementaryIds.has(card.kotoba_id ?? ''));
    const states: {flashcard_id:string}[] = [];
    if (userId) for (let start=0; start<mainCards.length; start+=200) {
      states.push(...await readAll<{flashcard_id:string}>((from,to) => db.from('flashcard_states').select('flashcard_id').eq('user_id',userId).in('flashcard_id',mainCards.slice(start,start+200).map(c=>c.id)).gt('review_count',0).order('flashcard_id').range(from,to)));
    }
    const types = [...new Set(questions.map(q=>q.question_type))].map(type => ({
      key:type, label:questionTypeLabel(type), href:`/practice/${lessonId}/${encodeURIComponent(type)}`,
      score:percent(scores.data?.find(row=>row.question_type===type)?.best_score ?? 0),
      detail:scores.data?.find(row=>row.question_type===type)?.passed ? 'Lulus ✓' : 'Belum lulus',
    }));
    if (mainCards.length) types.unshift({key:'flashcard',label:'Flashcard',href:`/flashcard/${lessonId}`,
      score:reviewedPercentage(mainCards.map(c=>c.id),states.map(s=>s.flashcard_id)),
      detail:`${new Set(states.map(s=>s.flashcard_id)).size} / ${mainCards.length} kartu utama pernah direview`,
    });
    const weakest = [...types].sort((a,b)=>a.score-b.score).slice(0,3);
    const mistakes = userId ? await db.rpc('get_lesson_mistakes',{p_lesson_id:lessonId}) : {data:[],error:null};
    if (mistakes.error) console.error('[Lesson mistakes]',mistakes.error.message);
    return <div className="space-y-6">
      {userId && types.length > 0 && <section aria-label="Overall Progress" className={panel}>
        <h2 className="font-bold text-lg">Overall Progress: {Math.round(overallPercentage(types.map(t=>t.score)))}%</h2>
        <ProgressBar value={overallPercentage(types.map(t=>t.score))} aria-label="Overall lesson progress" />
        <p className="text-xs text-muted-foreground">Rata-rata tipe belajar. Status kelulusan lesson mengikuti hasil latihan.</p>
        <p className="text-sm">Fokus latihan: {weakest.map(t=>`${t.label} (${masteryLabel(t.score)})`).join(' · ')}</p>
      </section>}
      <section aria-labelledby="learning-types-heading" className="space-y-3">
        <h2 id="learning-types-heading" className="text-xl font-bold">Tipe Belajar</h2>
        {!types.length && <p className={panel}>Belum ada materi untuk lesson ini.</p>}
        <div className="grid gap-3 sm:grid-cols-2">{types.map(type=><article key={type.key} className={panel}>
          <div className="flex justify-between gap-3"><h3 className="font-bold">{type.label}</h3>{userId && <span>{Math.round(type.score)}%</span>}</div>
          {userId && <><ProgressBar value={type.score} aria-label={`Progress ${type.label}`} /><p className="text-sm text-primary-500">{masteryLabel(type.score)}</p><p className="text-xs text-muted-foreground">{type.detail}</p></>}
          <Link href={type.href} className="inline-flex rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white focus-visible:ring-2 focus-visible:ring-primary-400">{type.key==='flashcard' ? 'Mulai Flashcard' : `Latihan ${type.label}`}</Link>
        </article>)}</div>
      </section>
      {userId && <section aria-labelledby="lesson-mistakes-heading" className="space-y-3">
        <h2 id="lesson-mistakes-heading" className="text-xl font-bold">Log Kesalahan</h2>
        {mistakes.error ? <p role="alert">Log kesalahan belum dapat dimuat. Silakan muat ulang.</p> : !mistakes.data?.length ? <p className={panel}>Belum ada kesalahan di lesson ini.</p> : <ul className="space-y-3">{mistakes.data.map(m=><li className={`${panel} break-words`} key={m.attempt_id}>
          <p className="font-japanese font-medium">{m.question_text}</p>
          <p className="text-sm font-japanese">Jawaban Anda: {m.selected_answer ?? '—'}</p>
          <p className="text-sm font-japanese text-emerald-500">Jawaban benar: {m.correct_answer ?? 'Tidak tersedia'}</p>
          <p className="text-sm">Alasan: {m.reason || 'Belum dicatat'}{m.custom_reason ? ` — ${m.custom_reason}` : ''}</p>
          <time className="text-xs text-muted-foreground" dateTime={m.answered_at}>{new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Makassar'}).format(new Date(m.answered_at))} WITA</time>
        </li>)}</ul>}
      </section>}
    </div>;
  } catch(error) {
    console.error('[Lesson learning]',error);
    return <p role="alert" className={panel}>Materi dan progress belum dapat dimuat. Silakan muat ulang halaman.</p>;
  }
}
