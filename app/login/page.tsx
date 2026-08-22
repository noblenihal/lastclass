"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ThemePicker } from "@/components/ThemePicker";
import { Button, ErrorNote, Eyebrow, Field, Reveal } from "@/components/ui";

const DEMO = { email: "demo@lastclass.app", pass: "lastclass" };

/** The class needs something to call you; the local part of the email does. */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._\-+0-9]+/).filter(Boolean)[0] ?? local;
  return first ? first[0].toUpperCase() + first.slice(1).toLowerCase() : "Guest";
}

export default function LoginPage() {
  const { profile, ready, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && profile) router.replace("/");
  }, [ready, profile, router]);

  function enter(p: { email: string; pass: string }) {
    const mail = p.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(mail))
      return setError("That email doesn't look right.");
    if (p.pass.length < 4)
      return setError("Password needs at least 4 characters.");
    signIn({ name: nameFromEmail(mail), email: mail, interest: "" });
    router.replace("/");
  }

  return (
    <main id="main" className="flex-1 flex flex-col px-6 py-6">
      <div className="flex justify-end">
        <ThemePicker />
      </div>
      <div className="flex-1 grid place-items-center py-10">
      <Reveal className="w-full max-w-[26rem]">
        <div className="mb-10 text-center">
          <Eyebrow>LastClass</Eyebrow>
          <h1
            className="mt-4 font-semibold tracking-[-0.035em] leading-[1.04]"
            style={{ fontSize: "var(--text-display-s)" }}
          >
            Sign in
          </h1>
          <p className="mt-3 text-[var(--text-lg)] text-[var(--color-ink-2)] leading-relaxed">
            Learn any topic in 5 levels. The last one: teach it to a class of
            students who ask you questions.
          </p>
        </div>

        <form
          className="space-y-5"
          aria-label="Sign in"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            enter({ email, pass });
          }}
        >
          <Field
            label="Email"
            hint="The class will call you by the first part of your address."
            type="email"
            placeholder="you@example.com"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            placeholder="••••••••"
            value={pass}
            autoComplete="current-password"
            onChange={(e) => setPass(e.target.value)}
          />

          <ErrorNote>{error}</ErrorNote>

          <Button type="submit" className="w-full">
            Enter the classroom
          </Button>
        </form>

        <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-paper-4)] bg-[var(--color-paper-2)]/60 p-4">
          <p className="text-[var(--text-sm)] text-[var(--color-ink-3)] leading-relaxed">
            Evaluating this? Use{" "}
            <code className="font-[family-name:var(--font-mono)] text-[var(--color-accent)]">
              {DEMO.email}
            </code>{" "}
            /{" "}
            <code className="font-[family-name:var(--font-mono)] text-[var(--color-accent)]">
              {DEMO.pass}
            </code>{" "}
            — or skip straight through.
          </p>
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => enter(DEMO)}
          >
            Continue as evaluator
          </Button>
        </div>
      </Reveal>
      </div>
    </main>
  );
}
