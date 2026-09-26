# Audit prompt: UBS interview work

Paste the block below into a **fresh session**. It is written so the auditor has to find sources
itself rather than trust anything the producing session wrote. Update the "artifacts" list whenever a
new file is added to this folder.

---

```
You are auditing work done in a previous session. Be adversarial. Your job is to find
errors and omissions, not to confirm the work. Do not edit any files. Report only.

CONTEXT
Nik Jain has an interview with the hiring manager for:
  UBS, Product Manager, Digital Solutions & AI (Wealth Management)
  New York, on-site. Team: STAAT Field Solutions, within Data, Analytics &
  Foundational Platforms.
A previous session produced a strategy, a PRD and a set of decisions for an interview
prototype called "Relay". The prototype itself is not built yet.

REPO
nikjain15/nik-jain-jobos, branch claude/interview-prototype-ideas-7b4qip, draft PR #1.
Read CLAUDE.md at the repo root FIRST and follow its rules throughout.

AUDIT EVERY ARTIFACT BELOW. NONE IS OUT OF SCOPE.

  A. roles/ubs-pm-digital-solutions-ai-wm/relay/PRD-relay.md
     The PRD. The main artifact.
  A2. roles/ubs-pm-digital-solutions-ai-wm/relay/AUDIT-FINDINGS-2026-09-26.md
     The previous audit's findings. Do NOT treat its verdicts as settled: it could not
     reach ubs.com, celent.com, sec.gov, finra.org or investmentnews.com first-hand.
     Re-verify anything it marked "reported" or "load-bearing".
  B. roles/ubs-pm-digital-solutions-ai-wm/relay/00-BRIEF.md
     Working brief: hiring-manager read, thesis, scope, personas, visual constraints,
     demo structure, known soft spots.
  C. roles/ubs-pm-digital-solutions-ai-wm/relay/AUDIT-PROMPT.md
     This file. Check it does not itself contain errors or leading questions.
  D. DECISIONS.md, entries D-49 through D-56 (2026-09-26 block)
     Check numbering against a fresh read, per CLAUDE.md section 5. Check each entry
     is actually a settled decision and not a restatement of an opinion.
  E. roles/STATE.md, the 2026-09-26 entry
     Check it is accurate, complete, and consistent with the other files.
  F. OS.md, the UBS pipeline row
     Check it agrees with STATE.md. Per CLAUDE.md, if they disagree, STATE.md wins and
     OS.md is the one that is wrong.
  G. The PR #1 title and body
     Check every claim in the PR body is supported by the diff.
  H. The existing role kit, for consistency with the new work:
     roles/ubs-pm-digital-solutions-ai-wm/jd.md
     roles/ubs-pm-digital-solutions-ai-wm/fit.md
     roles/ubs-pm-digital-solutions-ai-wm/outcome.md
     Flag any place the new artifacts contradict the fit map or the outcome log.

TASK 1: VERIFY EVERY FACTUAL CLAIM ABOUT UBS
Search the web. Find a primary or reputable source for each. State up front which
domains your container can and cannot reach, and never present a search summary as a
first-hand read of a primary document. Mark CONFIRMED / WRONG /
UNVERIFIABLE / STALE, with source URL and source date. Do NOT accept the PRD's own
appendix as a source.
  1.  UBS has roughly 5,700 financial advisors in the US. Note: some reporting says
      ~5,500. Establish which is current and from when.
  2.  At least 54 teams managing roughly $52B left UBS in 2025.
  3.  At least 27 teams managing $28B left UBS in H1 2026.
  4.  UBS released its 2026 compensation plan early to slow defections.
  5.  Rob Karofsky's title, and whether he said words to the effect of "we can't shrink
      the business to profitability, we have to invest in growth". Establish the title
      and the DATE of the quote; do not assume either.
  6.  The US growth plan involves four regional advisor centers and three wealth tiers:
      above $50M, above $5M, and $500K to $5M.
  7.  The Wealth Advice Center has about 400 staff and is planned to roughly triple
      within three years.
  8.  UBS Red comprises two domain-specific assistants built on Azure OpenAI and Azure
      AI Search.
  9.  Over 60,000 investment advice and product documents are indexed.
  10. Azure OpenAI reached roughly 30,000 UBS employees.
  11. UBS has a multi-year Broadridge programme rebuilding the advisor workstation.
  12. UBS Wealth Way is structured as Liquidity, Longevity, Legacy.
  13. The CIO House View publishes a Daily, a Weekly Key Messages, and a Monthly Letter.
  14. UBS won a 2026 Celent Model Wealth Manager Award for Data, Analytics and AI.
  15. WEAKEST CLAIM, check hardest: that UBS has the highest assets per advisor in the
      wirehouse segment, argued from competitor headcounts of roughly 15,000 each at
      Merrill and Morgan Stanley. Check the headcounts AND the assets-per-advisor
      inference separately. The producing session flagged this as inference, not a
      sourced fact.
  16. The JD in jd.md records job ref 331525BR and comp $200,000-275,000. The link Nik
      supplied was job id 338544. Establish whether these are the same posting, whether
      the role is still open, and whether anything material in the posting has changed.
      jobs.ubs.com may be unreachable from your container; say so if it is rather than
      guessing.

TASK 2: VERIFY THE REGULATORY CLAIMS
These drive the PRD's entire control map, so they must be exactly right. An error here
is the worst kind, because it would be said out loud to a wealth-management audience.
  a. FINRA Rule 2210: does it require principal pre-approval and retention for retail
     communications? Would an AI-drafted client note fall under it? Name any exceptions
     or nuances the PRD glosses over.
  b. Reg BI care obligation: is "documented reasonable basis and consideration of
     alternatives" a fair statement of it?
  c. FINRA Rule 3110: correct citation for supervisory system and written supervisory
     procedures?
  d. SEC Rule 17a-4: correct citation for books and records retention? Is "write-once"
     still accurate after the 2022-2023 amendments, or has the requirement changed to
     an audit-trail alternative?
  e. The PRD cites the SEC marketing rule under the Advisers Act. Establish which
     entity and which capacity that rule reaches, what UBS Financial Services Inc. is
     registered as, and therefore whether the citation is correct, partially correct,
     or should be replaced. State the correct framing. Reach your own verdict; the
     producing session's own doubts about this are not evidence either way.
  f. Anything the PRD's control map is MISSING that a wealth-management compliance
     officer would expect to see.

TASK 3: VERIFY THE HIRING MANAGER READ (00-BRIEF.md section 1)
The producing session worked from a LinkedIn screenshot. Verify what is verifiable.
  - Is UBS Evidence Lab a real UBS unit? What does it actually do?
  - Does STAAT plausibly expand to "Smart Technologies and Advanced Analytics Team"?
  - What does the manager's product ACTUALLY do, per public sources? Then, separately:
    does the thesis avoid pitching it back to him, at the level of strategy AND at the
    level of the data model and the signal taxonomy? Check the two levels separately;
    a strategy can disclaim a product while the data model rebuilds it.
  - FLAGGED: the brief claims "precision at the recipient's inbox" is the classic
     failure mode of automated advisor insights. Is that defensible domain knowledge or
     an unsupported assertion dressed up as expertise? Look for evidence either way, and
     say whether Nik should present it as a hypothesis rather than a finding.
  - Does the PRD's vocabulary actually match someone from an evidence and alerting
     background, or does it read generic?

TASK 4: COMPLETENESS AGAINST THE JD
Open jd.md. Build a table of every responsibility and every requirement it lists against
where the PRD or brief addresses it. Flag anything unaddressed. Pay particular attention
to the ones a prototype does not naturally cover:
  - "hire, coach, and performance manage PMs/POs" (people leadership, 2+ years)
  - "measurable UX outcomes" and "portfolio of shipped experiences"
  - "business change (training, comms, enablement)"
  - "adoption, CSAT"
  - "release readiness"
  - "12+ years product management, deep financial services"
Also flag anything in the PRD that the JD does NOT ask for and that may be scope creep.

TASK 5: CONSISTENCY WITH THE EXISTING KIT
  - fit.md scores this role 88/100 and names UX craft as the one real gap, bridgeable
    "maybe", with an explicit instruction not to invent a UX metric. Does the new work
    respect that, or does it quietly claim UX outcomes Nik has not earned?
  - fit.md names people leadership of PMs as a partial gap. Does the new work address it
    or ignore it?
  - outcome.md records the application as already submitted on 2026-08-11. Is the stage
    change to "Interview (HM)" recorded consistently in STATE.md and OS.md?
  - Does anything in the new work contradict claims/claims-audit.md, which is THE
    AUTHORITY per CLAUDE.md? Check specifically that no new claim about Nik's own
    experience has been introduced that is not already in the claims base.

TASK 6: HOUSE RULES COMPLIANCE (CLAUDE.md)
  - Em-dashes: there must be ZERO in every artifact. Grep for them and report counts
    per file.
  - Employer content: per CLAUDE.md section 8, no current-employer content of any
    kind, including its systems, vendors, advisors, or "at my day job".
    There must be none anywhere.
  - Is any synthetic client data presented as real?
  - Is any number printed that cannot be sourced?
  - PUBLISHED vs SENT rule: the prototype is intended to be shown or possibly hosted.
    Does any artifact carry a number that would be fine on a resume but not on an
    indexed page? Flag any such number and where it appears.
  - Close-out block, CLAUDE.md section 4: were all five steps done? STATE.md appended,
    OS.md updated, signals logged if any arrived, rule changes citing signal IDs if any,
    and stated in chat. Check playbook/signals-log.md: should anything from this session
    have been logged there and was not?
  - Section 5 multi-session rule: were D-49 to D-56 numbered against a fresh read? Is
    there any collision with an existing entry?

TASK 7: WHAT IS MISSING
Independently of everything above:
  - What would a UBS wealth-management product leader notice is absent?
  - What would an ex-Evidence Lab data leader notice is absent?
  - What would a compliance officer notice is absent?
  - Name the three weakest points in the body of work and what would strengthen each.
  - Is there anything in this work that could embarrass Nik if the hiring manager
    pushed back on it hard?

OUTPUT
  1. Verification table: claim, verdict, source URL, source date.
  2. Every error found, ordered by how badly it would damage Nik in the interview if
     said out loud.
  3. JD coverage table with gaps flagged.
  4. Consistency findings against the existing kit and the claims base.
  5. House rules violations, per file.
  6. The three weakest points and the fix for each.
  7. One paragraph: if you had to advise Nik to change ONE thing before the interview,
     what is it?
Do not edit any files.
```
