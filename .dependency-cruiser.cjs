/**
 * Architecture invariants (PRD §5.3). Relay drafts; a human sends.
 * No module in app/ or lib/ may reach an outbound transport, and the
 * deterministic modules may not reach a model client, because the model
 * composes language and never decides eligibility, ranking or regime.
 *
 * dependency-cruiser resolves "node:https" to "https", so core modules are
 * matched with the node: prefix optional, and packages by their resolved
 * node_modules path as well as their bare name.
 */
module.exports = {
  forbidden: [
    {
      name: "no-outbound-transport",
      comment:
        "Relay has no path to a client. Nothing may import an email, SMS, HTTP-send or socket transport.",
      severity: "error",
      from: { path: "^(app|components|lib)/" },
      to: {
        path: [
          "^(node:)?(net|tls|dgram|http|https|http2)$",
          "(^|node_modules/)(nodemailer|resend|@sendgrid|postmark|mailgun|twilio|undici|axios|got|node-fetch|ky)(/|$)",
        ],
      },
    },
    {
      name: "deterministic-no-model",
      comment:
        "lib/constraints, lib/ranking, lib/recipients, lib/policy, lib/learning, lib/profile, lib/evidence (the refusal), lib/servicing (the money-movement callback), lib/onboarding (escalation) and lib/household-math are deterministic. They may not import a model client.",
      severity: "error",
      from: { path: "^lib/(constraints|ranking|recipients|policy|learning|profile|evidence|servicing|onboarding)/|^lib/household-math" },
      to: { path: "(^|node_modules/)(@anthropic-ai|openai|@azure/openai|ai|@ai-sdk)(/|$)" },
    },
    {
      name: "personalization-cannot-widen",
      comment:
        "Eligibility, compliance checks, the recipient counter and evidence retrieval never read a profile or the learning loop, so no setting or learned preference can change what is allowed (R-19).",
      severity: "error",
      from: { path: "^lib/(constraints|recipients|policy|evidence)/" },
      to: { path: ["^lib/(profile|learning)/", "^data/(profiles/|events\\.json)"] },
    },
    {
      name: "deterministic-no-model-transitive",
      comment:
        "Closes the one-hop gap found in the R-21 audit: a helper outside these folders (lib/household-math, lib/format, lib/data) could import a model client and be reached from a deterministic module. No deterministic module may reach one by any path.",
      severity: "error",
      from: { path: "^lib/(constraints|ranking|recipients|policy|learning|profile|evidence|servicing|onboarding)/|^lib/household-math" },
      to: { path: "(^|node_modules/)(@anthropic-ai|openai|@azure/openai|ai|@ai-sdk)(/|$)", reachable: true },
    },
    {
      name: "personalization-cannot-widen-transitive",
      comment:
        "The same rule by any path: eligibility, compliance checks, the counter and retrieval may not reach the profile resolver or the learning loop through a shared helper (R-21).",
      severity: "error",
      from: { path: "^lib/(constraints|recipients|policy|evidence)/" },
      to: { path: ["^lib/(profile|learning)/", "^data/(profiles/|events\\.json)"], reachable: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
