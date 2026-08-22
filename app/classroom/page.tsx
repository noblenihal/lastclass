"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Hand,
  Plus,
} from "lucide-react";
import { useRequireProfile } from "@/lib/auth";
import { useSession } from "@/lib/store";
import { useDictation, useSpeaker } from "@/lib/speech";
import {
  byId,
  type Doubt,
  type MentorNote,
} from "@/lib/characters";
import { type SeatState } from "@/components/Seat";
import { ThemePicker } from "@/components/ThemePicker";
import { Button, ErrorNote, Eyebrow, Reveal } from "@/components/ui";
import { ReportCard } from "@/components/ReportCard";
import { VoicePad } from "@/components/classroom/VoicePad";
import { ClassroomStage } from "@/components/classroom/ClassroomStage";
import { DoubtCard } from "@/components/classroom/DoubtCard";
import { useMotionSafe } from "@/lib/a11y";

type Phase = "explaining" | "taking" | "answering" | "ended";

export default function ClassroomPage() {
  const profile = useRequireProfile();
  const { session, nudgeMastery, passLevel } = useSession();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("explaining");
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [reply, setReply] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [typed, setTyped] = useState(false);
  const [note, setNote] = useState<{ id: string; note: MentorNote } | null>(
    null,
  );
  const [asking, setAsking] = useState(false);
  /** A follow-up the current character is about to press with. */
  const [pending, setPending] = useState<Doubt | null>(null);
  /** Everything the learner has delivered to the class so far. */
  const [blocks, setBlocks] = useState<string[]>([]);
  const motion$ = useMotionSafe();
  /** Backdrop generated for THIS topic — atmosphere, never a blocker. */
  const [room, setRoom] = useState<string | null>(null);

  // The room is dressed for the subject: a gravity class and a knot-tying
  // class should not be taught in the same generic space. Generated once on
  // entry and faded in behind the seats; the class runs fine without it.
  useEffect(() => {
    if (!session) return;
    let alive = true;
    fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: session.topic,
        topicType: session.topicType,
        concepts: session.concepts.map((c) => c.name),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.image) setRoom(d.image as string);
      })
      .catch(() => {
        /* no backdrop — the seats stand on their own */
      });
    return () => {
      alive = false;
    };
  }, [session?.id, session?.topic, session?.topicType]);

  const dictation = useDictation();
  const answer = useDictation();
  const speaker = useSpeaker();
  const askedRef = useRef<string[]>([]);

  const active = doubts.find((d) => d.id === activeId) ?? null;
  const raised = doubts.filter((d) => d.status === "raised");
  const deferred = doubts.filter((d) => d.status === "deferred");

  const seatState = useCallback(
    (charId: string): SeatState => {
      if (speakingId === charId) return "speaking";
      const mine = doubts.filter((d) => d.characterId === charId);
      if (mine.some((d) => d.status === "raised")) return "raised";
      if (mine.some((d) => d.status === "deferred")) return "deferred";
      if (mine.some((d) => d.status === "resolved")) return "satisfied";
      return "idle";
    },
    [doubts, speakingId],
  );

  const severityOf = useCallback(
    (charId: string): 1 | 2 | 3 => {
      const mine = doubts.filter(
        (d) => d.characterId === charId && d.status === "raised",
      );
      return (mine[0]?.severity ?? 1) as 1 | 2 | 3;
    },
    [doubts],
  );

  const speakDoubt = useCallback(
    async (d: Doubt) => {
      const c = byId(d.characterId);
      setSpeakingId(c.id);
      await speaker.speak(d.question, c.voice, c.direction);
      setSpeakingId(null);
    },
    [speaker],
  );

  /* ---- take doubts: the explanation becomes the assessment ---- */
  /** Commits the current draft to the lecture as its own card. */
  function addBlock() {
    const t = dictation.transcript.trim();
    if (t.length < 20) {
      setError("Say a bit more before adding it to the lecture.");
      return;
    }
    setError("");
    setBlocks((prev) => [...prev, t]);
    dictation.reset();
  }

  async function takeDoubts() {
    if (!session) return;
    const draft = dictation.transcript.trim();
    const all = draft.length >= 20 ? [...blocks, draft] : blocks;
    const transcript = all.join("\n\n");
    if (transcript.length < 40) {
      setError("Explain a bit more first so the class has something to ask about.");
      return;
    }
    if (draft.length >= 20) {
      setBlocks(all);
      dictation.reset();
    }
    setError("");
    setBusy(true);
    dictation.stop();

    try {
      const res = await fetch("/api/classroom/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: session.topic,
          transcript,
          learnerName: profile?.name,
          level: session.statedLevel,
          detectedLevel: session.detectedLevel,
          levelEvidence: session.levelEvidence,
          interest: session.interest,
          asked: askedRef.current,
          concepts: session.concepts.map((c) => ({
            id: c.id,
            name: c.name,
            gist: c.gist,
            mastery: c.mastery,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The room went quiet.");

      const fresh = data.doubts as Doubt[];
      askedRef.current.push(...fresh.map((d) => d.question));
      setDoubts((prev) => [...prev, ...fresh]);
      setPhase("taking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke.");
    } finally {
      setBusy(false);
    }
  }

  function openDoubt(d: Doubt) {
    setActiveId(d.id);
    setReply(null);
    setNote(null);
    answer.reset();
    setPhase("answering");
    void speakDoubt(d);
  }

  /* ---- "I'll tell you later" — the hand stays up ---- */
  function defer() {
    if (!active) return;
    setDoubts((prev) =>
      prev.map((d) => (d.id === active.id ? { ...d, status: "deferred" } : d)),
    );
    speaker.stop();
    setSpeakingId(null);
    const next = doubts.find((d) => d.id !== active.id && d.status === "raised");
    if (next) openDoubt(next);
    else {
      setActiveId(null);
      setPhase("taking");
    }
  }

  /* ---- answer the doubt ---- */
  async function submitAnswer() {
    if (!active || !session) return;
    const text = answer.transcript.trim();
    if (text.length < 8) {
      setError("Say a little more.");
      return;
    }
    setError("");
    setBusy(true);
    answer.stop();

    try {
      const res = await fetch("/api/classroom/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: session.topic,
          characterId: active.characterId,
          question: active.question,
          lookingFor: active.lookingFor,
          answer: text,
          level: session.detectedLevel ?? session.statedLevel,
          depth: active.depth ?? 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not judge that.");

      const resolved = Boolean(data.resolved);
      const quality = Number(data.quality) || 0;
      const followUp = data.followUp as
        | { question: string; lookingFor: string }
        | null;

      setDoubts((prev) =>
        prev.map((d) =>
          d.id === active.id
            ? { ...d, status: resolved ? "resolved" : "fumbled" }
            : d,
        ),
      );

      // The learner model moves only here — on real evidence. An answer the
      // learner needed the Master for is worth half of one they found alone.
      const gain = (0.22 + quality * 0.18) * (active.assisted ? 0.5 : 1);
      nudgeMastery(active.conceptId, resolved ? gain : -0.14);

      setReply({ id: active.id, text: data.reply });

      const c = byId(active.characterId);
      setSpeakingId(c.id);
      await speaker.speak(data.reply, c.voice, c.direction);
      setSpeakingId(null);

      // A student who isn't satisfied doesn't move on — they press harder,
      // narrowing onto the exact thing that was missing.
      if (!resolved && followUp) {
        const press: Doubt = {
          id: `${active.id}-f${(active.depth ?? 0) + 1}`,
          characterId: active.characterId,
          question: followUp.question,
          severity: active.severity,
          conceptId: active.conceptId,
          lookingFor: followUp.lookingFor,
          status: "raised",
          depth: (active.depth ?? 0) + 1,
          assisted: active.assisted,
        };
        askedRef.current.push(press.question);
        setDoubts((prev) => [...prev, press]);
        setPending(press);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke.");
    } finally {
      setBusy(false);
    }
  }

  /* ---- stuck? the Master teaches YOU, then you still have to say it ---- */
  async function askMaster() {
    if (!active || !session) return;
    setError("");
    setAsking(true);
    try {
      const res = await fetch("/api/classroom/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: session.topic,
          question: active.question,
          lookingFor: active.lookingFor,
          level: session.detectedLevel ?? session.statedLevel,
          interest: session.interest,
          transcript: dictation.transcript.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The Master is unavailable.");

      // Taking the hint is recorded — it halves what this answer can earn.
      setDoubts((prev) =>
        prev.map((d) => (d.id === active.id ? { ...d, assisted: true } : d)),
      );
      setNote({ id: active.id, note: data as MentorNote });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something broke.");
    } finally {
      setAsking(false);
    }
  }

  function nextDoubt() {
    const next = pending ?? doubts.find((d) => d.status === "raised");
    setPending(null);
    setReply(null);
    setNote(null);
    answer.reset();
    if (next) openDoubt(next);
    else {
      setActiveId(null);
      setPhase("taking");
    }
  }

  function endClass() {
    speaker.stop();
    setSpeakingId(null);
    // Every hand still up is an unresolved gap — that IS the grade.
    const unresolved = doubts.filter(
      (d) => d.status === "deferred" || d.status === "raised",
    );
    unresolved.forEach((d) => nudgeMastery(d.conceptId, -0.08));
    if (session && unresolved.length === 0 && doubts.length > 0) passLevel(5);
    setPhase("ended");
  }

  const roomStatus = useMemo(() => {
    if (phase === "explaining") return "No questions yet — explain first.";
    const up = raised.length + deferred.length;
    if (up === 0) return "All hands down.";
    return `${up} hand${up === 1 ? "" : "s"} up${
      deferred.length ? ` · ${deferred.length} skipped` : ""
    }.`;
  }, [phase, raised.length, deferred.length]);

  if (!profile) return null;
  if (!session) {
    return (
      <main id="main" className="flex-1 grid place-items-center px-6">
        <div className="text-center">
          <p className="text-[var(--color-ink-2)]">No topic loaded.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Pick a topic
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "ended") {
    return (
      <ReportCard
        doubts={doubts}
        concepts={session.concepts}
        topic={session.topic}
        onRestart={() => {
          setDoubts([]);
          setBlocks([]);
          askedRef.current = [];
          setActiveId(null);
          setReply(null);
          dictation.reset();
          setPhase("explaining");
        }}
      />
    );
  }

  return (
    <main className="flex-1 px-6 py-6 sm:px-10">
      <header className="flex items-center justify-between mb-8">
        <Button variant="quiet" onClick={() => router.push("/learn")}>
          <ArrowLeft size={15} /> Ladder
        </Button>
        <div className="flex items-center gap-3">
          <Eyebrow>Rung 5 · Teach</Eyebrow>
          <ThemePicker />
        </div>
      </header>

      <div className="mx-auto max-w-[56rem]">
        {/* ---------- the room ---------- */}
        <Reveal>
          <ClassroomStage
            room={room}
            doubts={doubts}
            status={roomStatus}
            seatState={seatState}
            severityOf={severityOf}
            onOpenDoubt={openDoubt}
          />
        </Reveal>
        {/* ---------- explaining ---------- */}
        {phase === "explaining" && (
          <Reveal delay={0.1}>
            <section className="mt-8">
              <h1
                className="font-semibold tracking-[-0.03em] leading-[1.1] text-balance"
                style={{ fontSize: "var(--text-2xl)" }}
              >
                Teach them {session.topic}.
              </h1>
              <ol className="mt-3 space-y-1.5 text-[var(--color-ink-2)] leading-relaxed">
                <li>
                  <strong className="text-[var(--color-ink)] font-medium">
                    1.
                  </strong>{" "}
                  Explain the topic below — speak or type.
                </li>
                <li>
                  <strong className="text-[var(--color-ink)] font-medium">
                    2.
                  </strong>{" "}
                  Press <em className="not-italic text-[var(--color-accent)]">Take questions</em>.
                  Students raise their hands about the parts you missed.
                </li>
                <li>
                  <strong className="text-[var(--color-ink)] font-medium">
                    3.
                  </strong>{" "}
                  Answer each one, or skip it. Hands you skip stay up.
                </li>
              </ol>

              {blocks.length > 0 && (
                <ol className="mt-5 space-y-2.5">
                  {blocks.map((b, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.32 }}
                      className="rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
                          Point {i + 1}
                        </span>
                        <button
                          onClick={() =>
                            setBlocks((prev) => prev.filter((_, k) => k !== i))
                          }
                          className="text-[var(--text-xs)] text-[var(--color-ink-4)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--color-urgent)]"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="mt-1.5 text-[var(--text-base)] leading-relaxed text-[var(--color-ink)]">
                        {b}
                      </p>
                    </motion.li>
                  ))}
                </ol>
              )}

              <VoicePad
                dictation={dictation}
                typed={typed}
                setTyped={setTyped}
                placeholder={
                  blocks.length
                    ? "Add another point…"
                    : "Explain it in your own words. Start with what it is…"
                }
              />

              <ErrorNote>{error}</ErrorNote>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button variant="ghost" onClick={addBlock} disabled={busy}>
                  <Plus size={15} /> Add this point
                </Button>
                <Button onClick={takeDoubts} loading={busy}>
                  <Hand size={16} />
                  {busy ? "Reading it…" : "Take questions"}
                </Button>
              </div>
              <p className="mt-2 text-[var(--text-sm)] text-[var(--color-ink-3)]">
                {blocks.length
                  ? `${blocks.length} point${blocks.length === 1 ? "" : "s"} delivered. Add more, or hand over to the class.`
                  : "Add points one at a time, or hand over as soon as you're ready."}
              </p>
            </section>
          </Reveal>
        )}

        {/* ---------- between doubts ---------- */}
        {phase === "taking" && (
          <Reveal delay={0.05}>
            <section className="mt-8 text-center">
              {raised.length > 0 ? (
                <>
                  <p className="text-[var(--text-lg)] text-[var(--color-ink-2)]">
                    Students have questions. Answer them one by one.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => openDoubt(raised[0])}
                  >
                    Answer next question
                  </Button>
                </>
              ) : (
                <p className="text-[var(--text-lg)] text-[var(--color-ink-2)]">
                  {deferred.length
                    ? `${deferred.length} question${deferred.length === 1 ? "" : "s"} you skipped ${deferred.length === 1 ? "is" : "are"} still open.`
                    : "Nobody has questions left."}
                </p>
              )}
              <div className="mt-4 flex gap-3 justify-center flex-wrap">
                <Button variant="ghost" onClick={() => setPhase("explaining")}>
                  Explain more
                </Button>
                <Button variant="quiet" onClick={endClass}>
                  End class
                </Button>
              </div>
            </section>
          </Reveal>
        )}

        {/* ---------- answering one doubt ---------- */}
        <AnimatePresence mode="wait">
          {phase === "answering" && active && (
            <DoubtCard
              doubt={active}
              answer={answer}
              reply={reply?.id === active.id ? reply.text : null}
              note={note?.id === active.id ? note.note : null}
              speaking={speakingId === active.characterId}
              busy={busy}
              asking={asking}
              typed={typed}
              error={error}
              hasMoreRaised={doubts.some((d) => d.status === "raised")}
              pendingFrom={pending ? byId(pending.characterId).name : null}
              setTyped={setTyped}
              onExplain={submitAnswer}
              onAskMaster={askMaster}
              onDefer={defer}
              onEndClass={endClass}
              onNext={nextDoubt}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
