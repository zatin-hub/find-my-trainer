import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use — findmytrainer",
  description: "The rules for using findmytrainer.",
};

// PENDING BEFORE PUBLIC LAUNCH: replace with the real grievance/contact
// address (P0 in LAUNCH.md).
const CONTACT_EMAIL = "grievance@findmytrainer.example";

const H2 = "mt-8 text-lg font-semibold text-slate-100";
const P = "mt-2 text-sm leading-relaxed text-slate-400";
const LI = "ml-5 list-disc text-sm leading-relaxed text-slate-400";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-100">Terms of Use</h1>
      <p className={P}>
        Last updated: 8 July 2026. By using findmytrainer you agree to these
        terms. You must be 18 or older to submit content or set up alerts.
      </p>

      <h2 className={H2}>What findmytrainer is</h2>
      <p className={P}>
        A free, crowdsourced directory of fitness trainers. Listings and
        reviews come from the community. We verify signals where we can (such
        as checking that an Instagram profile exists) but we do not vet,
        certify or endorse any trainer, and we are not a party to any
        arrangement between you and a trainer. Exercise your own judgement —
        especially before making payments.
      </p>

      <h2 className={H2}>Community content rules</h2>
      <ul className="mt-2 space-y-1">
        <li className={LI}>
          Reviews must be truthful and based on first-hand experience.
        </li>
        <li className={LI}>
          No defamation, harassment, hate speech or private information
          (personal phone numbers, home addresses) about anyone.
        </li>
        <li className={LI}>
          No fake listings, self-reviews disguised as customers, or vote
          manipulation.
        </li>
        <li className={LI}>
          By submitting content you grant us a non-exclusive licence to display
          it on the platform. We may edit for formatting or remove content at
          our discretion.
        </li>
      </ul>

      <h2 className={H2}>Listings, claims and removal</h2>
      <p className={P}>
        Trainers may claim their profile to correct details and reply to
        reviews. Any trainer may request removal of their listing by writing to{" "}
        <span className="text-slate-300">{CONTACT_EMAIL}</span> — removal
        requests are honoured without requiring a reason. Moderation actions
        are audit-logged.
      </p>

      <h2 className={H2}>Acceptable use</h2>
      <p className={P}>
        No scraping at scale, probing, disrupting the service, or attempting to
        bypass rate limits and moderation. We may restrict access for abuse.
      </p>

      <h2 className={H2}>Disclaimers and liability</h2>
      <p className={P}>
        The service is provided &quot;as is&quot;, free of charge, without
        warranties of any kind. To the maximum extent permitted by law, we are
        not liable for any loss arising from your use of the platform or from
        engagements with trainers found through it. Map data ©
        OpenStreetMap contributors.
      </p>

      <h2 className={H2}>Privacy</h2>
      <p className={P}>
        How we handle personal data is described in the{" "}
        <Link href="/privacy" className="text-pink-400 underline">
          Privacy Policy
        </Link>
        .
      </p>

      <h2 className={H2}>Governing law</h2>
      <p className={P}>
        These terms are governed by the laws of India. Courts at Bengaluru,
        Karnataka have exclusive jurisdiction.
      </p>

      <h2 className={H2}>Contact</h2>
      <p className={P}>
        <span className="text-slate-300">{CONTACT_EMAIL}</span> (placeholder
        while the platform is pre-launch).
      </p>
    </div>
  );
}
