import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — findmytrainer",
  description:
    "What we collect, why, and your rights under India's DPDP Act 2023.",
};

// PENDING BEFORE PUBLIC LAUNCH: replace the placeholder grievance contact
// below with a real, monitored address (tracked in tasks/todo.md).
const GRIEVANCE_EMAIL = "grievance@findmytrainer.example";

const H2 = "mt-8 text-lg font-semibold text-slate-100";
const P = "mt-2 text-sm leading-relaxed text-slate-400";
const LI = "ml-5 list-disc text-sm leading-relaxed text-slate-400";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-100">Privacy Policy</h1>
      <p className={P}>
        Last updated: 8 July 2026. This notice explains what personal data
        findmytrainer processes, why, and the rights you have under India&apos;s
        Digital Personal Data Protection Act, 2023 (&quot;DPDP Act&quot;).
      </p>

      <h2 className={H2}>What we collect</h2>
      <ul className="mt-2 space-y-1">
        <li className={LI}>
          <span className="text-slate-300">Match alerts:</span> your email
          address and alert preferences (activity, area, radius, budget) — only
          if you set up an alert.
        </li>
        <li className={LI}>
          <span className="text-slate-300">Trainer listings:</span> name, areas
          served, activities, indicative pricing, Instagram handle and an
          approximate map location. Listings are submitted by the community or
          by trainers themselves. A phone number is shown only after a trainer
          claims and verifies their own profile.
        </li>
        <li className={LI}>
          <span className="text-slate-300">Recommendations &amp; reports:</span>{" "}
          the text you write, an anonymous browser identifier and a one-way
          hashed IP (abuse prevention). We do not store raw IP addresses with
          your content.
        </li>
        <li className={LI}>
          <span className="text-slate-300">Technical:</span> short-lived rate-limit
          counters. No advertising trackers, no third-party analytics, no sale
          of data — ever.
        </li>
      </ul>

      <h2 className={H2}>Why we process it</h2>
      <p className={P}>
        To show trainer listings, send match-alert emails you asked for, keep
        the platform free of fake and abusive content, and moderate reported
        content. Nothing else.
      </p>

      <h2 className={H2}>Consent and withdrawal</h2>
      <p className={P}>
        Match alerts run on your consent. Every alert email contains a one-click
        unsubscribe link that deletes your alert (and stops all emails for it)
        immediately. You can also write to the grievance contact below.
      </p>

      <h2 className={H2}>If you are a trainer listed here</h2>
      <p className={P}>
        Listings describe professional services and are largely drawn from
        information trainers make public themselves (such as a public Instagram
        profile). You can <Link href="/" className="text-pink-400 underline">claim
        your profile</Link> to correct it, or request removal at any time via the
        grievance contact — we honour removal requests without requiring a
        reason.
      </p>

      <h2 className={H2}>Your rights (DPDP Act)</h2>
      <ul className="mt-2 space-y-1">
        <li className={LI}>Access a summary of your personal data we hold.</li>
        <li className={LI}>Correct inaccurate or misleading data.</li>
        <li className={LI}>Erase your data (alerts, reviews, listings).</li>
        <li className={LI}>
          Raise a grievance below; if unresolved, complain to the Data
          Protection Board of India.
        </li>
      </ul>

      <h2 className={H2}>Retention</h2>
      <p className={P}>
        Alert data is kept until you unsubscribe or ask for deletion. Content
        removed by moderation is deleted, with a minimal audit record of the
        moderation action itself. We do not keep personal data longer than the
        purpose requires.
      </p>

      <h2 className={H2}>Security &amp; storage</h2>
      <p className={P}>
        Data is stored with our infrastructure provider (Cloudflare) which may
        process it outside India, as permitted by the DPDP Act. Safeguards
        include hashed IPs, secrets management, rate limiting and audit-logged
        admin actions. In the unlikely event of a breach affecting you, we will
        notify you and the Data Protection Board as required.
      </p>

      <h2 className={H2}>Children</h2>
      <p className={P}>
        findmytrainer is intended for users aged 18 and above. We do not
        knowingly process children&apos;s data.
      </p>

      <h2 className={H2}>Grievance contact</h2>
      <p className={P}>
        Grievance Officer: to be appointed —{" "}
        <span className="text-slate-300">{GRIEVANCE_EMAIL}</span> (placeholder
        while the platform is pre-launch). We aim to acknowledge grievances
        within 72 hours and resolve them within 30 days.
      </p>

      <h2 className={H2}>Changes</h2>
      <p className={P}>
        We will update this page when our practices change and revise the date
        above. Also see our{" "}
        <Link href="/terms" className="text-pink-400 underline">
          Terms of Use
        </Link>
        .
      </p>
    </div>
  );
}
