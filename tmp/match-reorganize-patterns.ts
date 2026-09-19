import 'dotenv/config';
import { prisma } from '@keeper/database';

const PATTERNS: Array<[string, RegExp]> = [
  ['review+reorganize', /\brevieww?\b.{0,80}re-?organi[sz]e\b/i],
  ['reorganize the document', /\bre-?organi[sz]e (the |this |our )?(document|points?|sections?|manuscript)\b/i],
  ['reorganization', /\bre-?organi[sz]ation\b/i],
  ['review the document', /\breview (the |this |our |the current |this current )document\b/i],
  ['review the current document', /\breview (the |this )current document\b/i],
  ['propose a better document', /\bpropose (a )better (document|structure|organization|organisation)\b/i],
  ['clean up the document', /\bclean up (the |this )document\b/i],
  ['organize the document', /\borgani[sz]e (the |these |our )(document|points?|sections?)\b/i],
  ['better organize/tell story', /\bbetter (organi[sz]e|tell) (the |this |our )?(current )?(story|document)\b/i],
  ['tell the current story', /\btell (the |this |a )(current )?story\b/i],
  ['directorial changes', /\b(directorial|director(ial)?) (changes?|review|edits?)\b/i],
  ['you are the director', /\b(you are|you're) the director\b/i],
  ['propose rearrangements', /\bpropose re-?arrangements?\b/i],
  ['rearrangements', /\bre-?arrangements?\b/i],
  ['better version of the document', /\bbetter version of (the |this )document\b/i],
  ['suggest a new title', /\bsuggest (a )?new title\b/i],
  ['update the forward/title', /\b(update|updating|rewrite|rewriting|write|writing|revise|revising|change|changing|set) (the |this )?(forward|title)\b/i],
  ['rename the document', /\brename (the |this )?(document|dialog|title)\b/i],
  ['document name/title', /\b(document|dialog) (name|title)\b/i],
  ['forward field/title', /\bforward (field|title|specifically)\b/i],
  ['every/all points ... open', /\b(every|all) points?.{0,80}\bopen\b/i],
  ['section called open', /\bsection called ["']?open\b/i],
  ['into section called open', /\binto (a )?(single )?section called ["']?open\b/i],
  ['moving every point', /\bmoving every point\b/i],
  ['thats useless/not a proposal', /\b(that'?s|that is) (useless|not (a |the )?(proposal|reorganization|reorganisation))\b/i],
  ['nothing/anything changed', /\b(nothing|anything) (actually |really )?(changed|different)\b/i],
  ['no meaningful change', /\bno (meaningful |real |actual )?change\b/i],
  ['same document/thing/proposal', /\b(the )?same (document|thing|proposal)\b/i],
  ['copy paste', /\bcopy.?paste[d]?\b/i],
  ['did you change', /\bdid (you|it|kip) (even )?change\b/i],
  ['restate', /\brestat(e|ed|ement|es)\b/i],
  ['do not belong', /\b(do not|don'?t) (necessarily )?belong\b/i],
];

const IDS = [
  'e06804fd-d9cf-428c-8c51-08e6f585dade',
  '60bf61d6-928f-4e2a-a7f2-665ac79eb758',
  '1f0dbc10-6328-4f51-9f20-4ae85249d91c',
  'df809d6d-8031-415a-aa26-7be8d4e563d0',
];

async function main() {
  const messages = await prisma.kip_messages.findMany({
    where: { id: { in: IDS } },
    select: { id: true, content: true, created_at: true },
  });
  const out = messages.map((m) => {
    const hits = PATTERNS
      .filter(([, re]) => re.test(m.content))
      .map(([name, re]) => {
        const match = m.content.match(re);
        return { name, match: match?.[0] ?? null };
      });
    return { id: m.id, created_at: m.created_at, hits };
  });
  console.log(JSON.stringify(out, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
