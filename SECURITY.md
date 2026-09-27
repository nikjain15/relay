# Security

Relay is a prototype on synthetic data. It has no server, no database, no accounts and no network
client. The static export runs entirely in the browser from the data folder, and a content security
policy in the page blocks any request to another host; a browser check proves that on every run.

There is no outbound path in the code by construction: no module under `app/`, `components/` or `lib/`
can import an email, SMS, HTTP-send or socket transport, and the dependency rules and tests that enforce
that were each seen failing on a planted violation before being recorded as enforced.

If you find a way for the product to send, write to a system of record, reach another host, or clear a
finding without a person, that is a defect in the invariant, not a feature. Please open an issue with the
steps to reproduce. There is no bounty programme; there is a prompt reply.
