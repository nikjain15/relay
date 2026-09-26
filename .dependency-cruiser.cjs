/**
 * Architecture invariant guard for Relay.
 *
 * PRD-relay.md §5.3: "No path exists from the system to a client. Outbound is a
 * human act, always. This is an architectural invariant, enforced in code and in
 * test, not a policy statement."
 *
 * This file is the "in code" half. tests/invariants/ is the "in test" half.
 *
 * Relay drafts client communications. It never sends them. A draft leaves the
 * system only when a supervisory principal dispositions it and a human acts, so
 * the drafting and proposal layers must not be able to reach any outbound
 * transport at all. Making it structurally impossible beats documenting it,
 * because a reviewer can check a rule and cannot check an intention.
 *
 * Modelled on the same invariant in roleos-app, which enforces "RO drafts, you
 * send" the same way.
 */
module.exports = {
  forbidden: [
    {
      name: "no-outbound-transport",
      comment:
        "Nothing in Relay may import an outbound transport. Relay drafts; a human sends. There is no dispatch route in this product by design.",
      severity: "error",
      from: { path: "^(lib|components|app)" },
      to: {
        path: [
          "nodemailer",
          "resend",
          "@sendgrid",
          "postmark",
          "mailgun",
          "twilio",
          "node:net",
          "node:http$",
          "node:https$",
          "^lib/outbound",
        ],
      },
    },
    {
      name: "proposal-engine-is-deterministic",
      comment:
        "PRD §5.3: constraint evaluation, ranking, recipient counting and policy checks are deterministic code, not model calls. lib/constraints and lib/recipients must not import any model client.",
      severity: "error",
      from: { path: "^lib/(constraints|recipients|ranking)" },
      to: { path: ["@anthropic-ai", "openai", "^lib/model"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
