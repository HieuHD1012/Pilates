import { ArrowRight, RotateCcw } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Link } from "react-router";

import { CLASS_FORMATS } from "~/content/studio";

/**
 * "Tìm hình thức phù hợp" — a three-question guide translated from Pearl's
 * class finder. It is presentation only: nothing is sent or stored, and it
 * decides nothing the backend owns. Every outcome points at a page that
 * already exists (a Services section or the consultation form), and every
 * reason it gives is quoted from `CLASS_FORMATS.forWho`, the studio's own
 * confirmed copy. A tie, or an injury, sends the visitor to a conversation
 * rather than to a format.
 *
 * Rendered identically on the server (step 0) and the client, so it is safe
 * inside a prerendered route.
 */

type FormatId = (typeof CLASS_FORMATS)[number]["id"];

function format(id: FormatId) {
  const found = CLASS_FORMATS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown class format ${id}`);
  return found;
}

const GROUP = format("group");
const PRIVATE = format("private");

interface Answer {
  label: string;
  /** Which format this answer points toward, if any. */
  leans?: FormatId;
  /** The studio's own "phù hợp với" line that this answer matches. */
  reason?: string;
  /** Needs a conversation before any format is suggested. */
  consultFirst?: boolean;
}

interface Question {
  prompt: string;
  answers: [Answer, Answer, Answer];
}

const QUESTIONS: Question[] = [
  {
    prompt: "Bạn đã từng tập trên máy reformer chưa?",
    answers: [
      { label: "Chưa, đây sẽ là lần đầu", leans: "private", reason: PRIVATE.forWho[1] },
      { label: "Đã tập vài buổi" },
      {
        label: "Đã quen các động tác cơ bản",
        leans: "group",
        reason: GROUP.forWho[2],
      },
    ],
  },
  {
    prompt: "Cơ thể bạn có điều gì cần lưu ý?",
    answers: [
      {
        label: "Đang phục hồi sau chấn thương",
        leans: "private",
        reason: PRIVATE.forWho[0],
        consultFirst: true,
      },
      {
        label: "Muốn điều chỉnh tư thế cụ thể",
        leans: "private",
        reason: PRIVATE.forWho[2],
      },
      { label: "Không có gì đặc biệt" },
    ],
  },
  {
    prompt: "Bạn muốn buổi tập diễn ra thế nào?",
    answers: [
      { label: "Một kèm một, tập trung vào riêng mình", leans: "private" },
      {
        label: "Có nhịp chung, có người tập cùng",
        leans: "group",
        reason: GROUP.forWho[1],
      },
      {
        label: "Đều đặn theo lịch mỗi tuần",
        leans: "group",
        reason: GROUP.forWho[0],
      },
    ],
  },
];

type Outcome =
  | { kind: "format"; id: FormatId; reasons: string[]; consultFirst: boolean }
  | { kind: "unsure" };

function decide(picks: Answer[]): Outcome {
  const score = { group: 0, private: 0 };
  for (const pick of picks) if (pick.leans) score[pick.leans] += 1;
  const consultFirst = picks.some((pick) => pick.consultFirst);
  const leader: FormatId | null =
    consultFirst || score.private > score.group
      ? "private"
      : score.group > score.private
        ? "group"
        : null;
  if (!leader) return { kind: "unsure" };
  const reasons = picks
    .filter((pick) => pick.leans === leader && pick.reason)
    .map((pick) => pick.reason as string);
  return { kind: "format", id: leader, reasons, consultFirst };
}

export const FORMAT_ANCHOR: Record<FormatId, string> = {
  group: "lop-nhom",
  private: "lop-rieng",
};

export function FormatGuide({ id = "tim-hinh-thuc" }: { id?: string }) {
  const [picks, setPicks] = useState<Answer[]>([]);
  const headingId = useId();
  // The clicked answer unmounts with its question; move focus to the new
  // question (or result) so keyboard and screen-reader users keep their place.
  const stageRef = useRef<HTMLDivElement>(null);
  const choose = (next: Answer[]) => {
    setPicks(next);
    requestAnimationFrame(() => stageRef.current?.focus());
  };
  const step = picks.length;
  const done = step === QUESTIONS.length;
  const question = done ? null : QUESTIONS[step];
  const outcome = done ? decide(picks) : null;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-field="dark"
      className="pl-dark pl-section"
    >
      <div className="gutter mx-auto grid max-w-(--container-page) gap-x-12 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="pl-ruled pl-ruled--light">Chưa biết bắt đầu từ đâu</p>
          <h2 id={headingId} className="pl-h2 text-sand mt-6">
            Tìm hình thức phù hợp với bạn.
          </h2>
          <p className="measure text-sand/75 mt-5 text-base">
            Ba câu hỏi ngắn. Câu trả lời không được gửi đi hay lưu lại — đây chỉ là gợi ý
            để buổi tư vấn đầu tiên bắt đầu đúng chỗ.
          </p>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <div className="flex items-center justify-between gap-4">
            <div className="pl-steps" aria-hidden="true">
              {QUESTIONS.map((q, index) => (
                <span
                  key={q.prompt}
                  data-done={index < step ? "true" : undefined}
                  data-current={index === step ? "true" : undefined}
                />
              ))}
            </div>
            <p className="text-sand/65 text-xs">
              {done ? (
                "Gợi ý của bạn"
              ) : (
                <>
                  Câu <span className="figures">{step + 1}</span> /{" "}
                  <span className="figures">{QUESTIONS.length}</span>
                </>
              )}
            </p>
          </div>

          <div ref={stageRef} tabIndex={-1} aria-live="polite" className="mt-6 outline-none">
            {question ? (
              <fieldset>
                <legend className="font-display text-sand text-2xl font-light md:text-3xl">
                  {question.prompt}
                </legend>
                <div className="mt-6 flex flex-col gap-3">
                  {question.answers.map((answer) => (
                    <button
                      key={answer.label}
                      type="button"
                      className="pl-answer"
                      onClick={() => choose([...picks, answer])}
                    >
                      <span>{answer.label}</span>
                      <ArrowRight aria-hidden="true" className="size-4 shrink-0 opacity-60" />
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {outcome ? <GuideResult outcome={outcome} /> : null}
          </div>

          {step > 0 ? (
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              {!done ? (
                <button
                  type="button"
                  className="text-sand/75 hover:text-sand text-sm underline underline-offset-[6px]"
                  onClick={() => choose(picks.slice(0, -1))}
                >
                  Quay lại câu trước
                </button>
              ) : null}
              <button
                type="button"
                className="text-sand/75 hover:text-sand inline-flex items-center gap-2 text-sm underline underline-offset-[6px]"
                onClick={() => choose([])}
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Làm lại
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function GuideResult({ outcome }: { outcome: Outcome }) {
  if (outcome.kind === "unsure") {
    return (
      <div className="pl-guide-result">
        <p className="pl-ruled pl-ruled--light">Gợi ý</p>
        <p className="font-display text-sand mt-4 text-3xl font-light">
          Trò chuyện với studio trước.
        </p>
        <p className="measure text-sand/75 mt-3 text-sm">
          Câu trả lời của bạn nghiêng đều về cả hai hình thức. Nhân viên studio sẽ hỏi thêm
          và tư vấn hình thức phù hợp.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link to="/dat-tu-van" className="pl-link pl-link--light">
            Để lại thông tin tư vấn <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link to="/dich-vu" className="pl-link pl-link--light">
            So sánh hai hình thức
          </Link>
        </div>
      </div>
    );
  }

  const chosen = format(outcome.id);
  return (
    <div className="pl-guide-result">
      <p className="pl-ruled pl-ruled--light">Gợi ý · {chosen.sub}</p>
      <p className="font-display text-sand mt-4 text-3xl font-light">
        {chosen.name}
        {outcome.consultFirst ? ", sau một buổi tư vấn." : "."}
      </p>
      {outcome.reasons.length > 0 ? (
        <>
          <p className="text-sand/65 mt-4 text-xs">Studio mô tả hình thức này phù hợp với:</p>
          <ul className="mt-2 space-y-1.5">
            {outcome.reasons.map((reason) => (
              <li key={reason} className="text-sand/90 flex gap-3 text-sm">
                <span aria-hidden="true" className="text-amber">
                  —
                </span>
                {reason}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {outcome.consultFirst ? (
        <p className="measure text-sand/75 mt-4 text-sm">
          Với chấn thương, studio cần nghe tình trạng của bạn trước khi xếp lớp.
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link to={`/dich-vu#${FORMAT_ANCHOR[outcome.id]}`} className="pl-link pl-link--light">
          Xem {chosen.name.toLowerCase()} <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        <Link to="/dat-tu-van" className="pl-link pl-link--light">
          Để lại thông tin tư vấn
        </Link>
      </div>
    </div>
  );
}
