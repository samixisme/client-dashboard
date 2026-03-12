import React from 'react';
import { Link } from 'react-router-dom';

const privacySections = [
  {
    title: 'Information We Collect',
    points: [
      'Account details such as your name, email address, and profile information.',
      'Content you create or connect, including social media posts, media assets, and related metadata.',
      'Usage and device information such as log data, browser type, IP address, and feature interactions.',
    ],
  },
  {
    title: 'How We Use Information',
    points: [
      'To provide, maintain, and improve dashboard and social media management features.',
      'To authenticate users, secure accounts, and prevent abuse or unauthorized access.',
      'To support platform integrations and API functionality requested by the user.',
      'To communicate service updates, support responses, and important account notices.',
    ],
  },
  {
    title: 'Social Media Platform Data',
    points: [
      'When you connect third-party social media accounts, we access only permissions you explicitly grant.',
      'Connected platform data is used solely to provide the requested publishing, analytics, and account features.',
      'We do not sell your platform data to third parties.',
    ],
  },
  {
    title: 'Data Sharing',
    points: [
      'We may share data with service providers that help us run hosting, analytics, and security operations.',
      'We may disclose information when required by law or to protect rights, safety, and platform integrity.',
      'We do not share personal data for third-party advertising sales.',
    ],
  },
  {
    title: 'Data Retention and Security',
    points: [
      'We retain data only as long as needed for legitimate business, legal, and operational purposes.',
      'We use technical and organizational safeguards designed to protect your information.',
      'No system can be guaranteed 100 percent secure, and users should also protect account credentials.',
    ],
  },
  {
    title: 'Your Rights and Choices',
    points: [
      'You may request access, correction, export, or deletion of your account data, subject to legal requirements.',
      'You can disconnect linked social media accounts through the platform or provider settings.',
      'You may contact us for privacy requests and compliance questions.',
    ],
  },
];

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground md:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur md:p-10">
        <p className="text-sm text-muted-foreground">Last updated: March 12, 2026</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground md:text-base">
          This Privacy Policy explains how this dashboard application collects, uses, stores, and protects information,
          including data received through social media developer platform integrations.
        </p>

        <div className="mt-8 space-y-6">
          {privacySections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground md:text-base">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-xl border border-border/70 bg-background/60 p-4">
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            For privacy requests, contact: <span className="font-medium text-foreground">support@client-dashboard.local</span>
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link to="/terms" className="rounded-lg border border-border px-4 py-2 text-foreground transition hover:bg-accent">
            View Terms of Service
          </Link>
          <Link to="/login" className="rounded-lg border border-border px-4 py-2 text-foreground transition hover:bg-accent">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
