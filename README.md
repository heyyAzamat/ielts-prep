# Word by Word

IELTS vocabulary trainer: 600 words from *Essential Words for the IELTS*, split into 10 units and 30 topics like the book.

- **Flashcards** — word on the front; translation (RU) or English explanation (EN) with 5 collocations on the back. Tap to flip, swipe to rate.
- **Quiz** — Kahoot-style, 20 s per question, choose 10 / 20 / 40 / all / endless, shuffle or book order.
- **Reading** — an original text for every topic that uses all 20 of its words; tap any highlighted word or phrase to see its meaning.
- **Natural voice** — every word and collocation pre-recorded (Kokoro TTS), one mp3 per topic in `public/audio`.
- Progress and spaced repetition (1, 3, 7, 16, 35 days) are stored in the browser.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

Production: `npm run build && npm start`, or import the repo on Vercel (framework preset: Next.js).

## Structure

- `app/` — routes: `/`, `/topic/[n]`, `/read/[n]`, `/cards`, `/quiz`, `/words`
- `components/` — Flashcards, Quiz, Reading, dialogs
- `lib/` — data, progress (localStorage), audio, canvas garden and fireflies
- `data/` — words, topics, reading texts, audio index
