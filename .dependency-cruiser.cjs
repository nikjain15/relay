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
        "lib/constraints, lib/ranking, lib/recipients and lib/policy are deterministic. They may not import a model client.",
      severity: "error",
      from: { path: "^lib/(constraints|ranking|recipients|policy)/" },
      to: { path: "(^|node_modules/)(@anthropic-ai|openai|@azure/openai|ai|@ai-sdk)(/|$)" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
};
