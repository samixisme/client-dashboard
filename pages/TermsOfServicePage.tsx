import React from 'react';

const termsSections = [
  {
    title: 'Acceptance of Terms',
    points: [
      'By using this dashboard, you agree to these Terms of Service and applicable laws.',
      'If you do not agree, you must stop using the service.',
    ],
  },
  {
    title: 'Use of the Service',
    points: [
      'You are responsible for activity under your account and for keeping credentials secure.',
      'You agree to use the service only for lawful purposes and in compliance with third-party platform policies.',
      'You must not misuse APIs, attempt unauthorized access, or interfere with service operation.',
    ],
  },
  {
    title: 'Social Media Platform Compliance',
    points: [
      'You must follow the developer terms, community standards, and API policies of connected social platforms.',
      'We may suspend or limit integrations if required by platform policy, legal obligations, or abuse prevention.',
      'You are responsible for obtaining any required rights or permissions for content you publish.',
    ],
  },
  {
    title: 'Content and Intellectual Property',
    points: [
      'You retain ownership of your submitted content.',
      'You grant us a limited license to host, process, and transmit your content solely to operate the service.',
      'The service software, branding, and platform materials remain our property or the property of licensors.',
    ],
  },
  {
    title: 'Disclaimers and Limitation of Liability',
    points: [
      'The service is provided on an as-is and as-available basis without warranties of uninterrupted operation.',
      'To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages.',
      'Our aggregate liability is limited to the amount paid by you for the service in the prior 12 months, if any.',
    ],
  },
  {
    title: 'Termination',
    points: [
      'We may suspend or terminate access for violations of these terms, legal requirements, or security risks.',
      'You may stop using the service at any time and request account deletion subject to legal retention obligations.',
    ],
  },
  {
    title: 'Changes to Terms',
    points: [
      'We may update these terms from time to time. Continued use after updates means acceptance of revised terms.',
    ],
  },
];

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground md:px-8">
      <div className="mx-auto w-full max-w-4xl rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur md:p-10">
        <p className="text-sm text-muted-foreground">Last updated: March 12, 2026</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Terms of Service</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground md:text-base">
          These Terms of Service govern use of this dashboard application, including integrations with social media
          developer platforms and related APIs.
        </p>

        <div className="mt-8 space-y-6">
          {termsSections.map((section) => (
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
            For legal inquiries, contact: <span className="font-medium text-foreground">support@client-dashboard.local</span>
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <a href="/privacy" className="rounded-lg border border-border px-4 py-2 text-foreground transition hover:bg-accent">
            View Privacy Policy
          </a>
          <a href="/#/login" className="rounded-lg border border-border px-4 py-2 text-foreground transition hover:bg-accent">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
