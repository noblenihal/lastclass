import { NextRequest, NextResponse } from "next/server";
import type { z } from "zod";
import { errorResponse } from "./errors";

/**
 * One shape for every route handler.
 *
 * Each of the eight routes was repeating the same four steps — parse the body
 * with zod, bail on invalid input, run the work, map any thrown error through
 * `errorResponse`. Doing that once means a handler only contains the part that
 * is actually specific to it.
 */
export function jsonRoute<TSchema extends z.ZodTypeAny, TResult>(opts: {
  schema: TSchema;
  /** Shown to the learner if the work throws something we cannot classify. */
  fallbackError: string;
  /** Names the route in server logs. */
  name: string;
  handle: (input: z.infer<TSchema>) => Promise<TResult>;
}) {
  return async function POST(req: NextRequest) {
    const body = await req.json().catch(() => null);
    const parsed = opts.schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
      return NextResponse.json(await opts.handle(parsed.data));
    } catch (err) {
      console.error(`[${opts.name}]`, err);
      const { body: errBody, status } = errorResponse(err, opts.fallbackError);
      return NextResponse.json(errBody, { status });
    }
  };
}

/**
 * Thrown by a handler when the request was well-formed but cannot be
 * fulfilled — a declined topic, unintelligible input, a missing photo. These
 * carry their own status and reach the learner verbatim.
 */
export class RouteRefusal extends Error {
  readonly status: number;
  readonly kind: string;
  readonly retryable: boolean;

  constructor(opts: {
    message: string;
    kind: string;
    status?: number;
    retryable?: boolean;
  }) {
    super(opts.message);
    this.name = "RouteRefusal";
    this.kind = opts.kind;
    this.status = opts.status ?? 422;
    this.retryable = opts.retryable ?? false;
  }
}
