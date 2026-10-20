---
status: APPROVED
last_updated: 2026-10-20
scope: What the name Symbolon means and why the project carries it.
---

# The name

**Symbolon** (σύμβολον) is Ancient Greek for a token of recognition. It comes from _symballein_, "to throw together" or "to bring together": _syn_, together, and _ballein_, to throw.

## The practice

A symbolon was an object, often a knucklebone, a coin, a potsherd or a small tablet, broken in two by two parties, each keeping one half. Guest-friends (_xenoi_), business partners and contracting parties used them. Years later, whoever presented one half could prove who they were, or whom they came from, by fitting it against the other. The fit was the proof: no witness or third party was needed, because no other piece in the world matched the break. Hundreds of broken clay tokens of this kind have been found in Athens.

The word widened from there. In Athens, a _symbolon_ was also the official token a juror received on entering the court, which entitled him to vote and was later exchanged for his pay. It came to mean any token that proves identity or entitlement, and later a sign standing for something else, which is how it reached English as "symbol". In Plato's _Symposium_, Aristophanes calls each person "a symbolon of a human being", one half of a whole that is always looking for the half it fits.

## Why it fits

An identity provider is a modern symbolon practice:

- **Verification by matching.** A relying party trusts a user because what the user presents matches what Symbolon holds: a password against its hash, a passkey against its public key, an ID token's signature against the published JWKS. Like the broken token, the proof is the fit, and the halves are designed so that nothing else fits.
- **Tokens.** OpenID Connect is a protocol of tokens: codes, ID tokens, access tokens. Some are literally meant to be presented later and checked against a stored counterpart, which is what the provider's store does with each code and token digest.
- **Two parties, each keeping a half.** A user and an app meet through Symbolon, and each keeps its side of the relationship: the app its client credentials, the user their account and consent. The user-owned data store takes this further: the data stays with the user's half, and an app holds only the scoped access the user gave it.
- **Free of a third party.** The original token needed no authority to vouch for it. Symbolon is self-hosted: the operator holds both halves, with no vendor in between.

## Availability

The project holds the name where people will look for it:

- **GitHub:** the repository `codenhub/symbolon`, and the image `ghcr.io/codenhub/symbolon`.
- **npm:** the package `symbolon`, published as a placeholder (`0.0.0`, no code) on 2026-10-20, and the `symbolon` organization, which owns the `@symbolon` scope. Symbolon does not ship on npm; these exist so that nothing else can publish an "identity provider" under its name. The placeholder's README says so and points to this repository. It may become a real package later, such as an integration helper.

Docker Hub and trademark conflicts were not checked.

## Sources

- The Liddell–Scott–Jones lexicon, σύμβολον: the token broken between guest-friends or contracting parties, and the Athenian juror's identity token ([LSJ](https://lsj.gr/wiki/Special:MobileDiff/2905034)).
- Todd M. Compton, "The Handclasp and Embrace as Tokens of Recognition", on the symbolon in recognition scenes.
- Aristotle, _Athenian Constitution_ 65.2 and 68.2, on jurors' tokens.
- Plato, _Symposium_ 191d.
- University of Warwick, [Tokens in Classical Athens](https://warwick.ac.uk/fac/arts/classics/research/dept_projects/tcam/tokathe).
