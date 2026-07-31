import { emailColors as email } from '@grandprixpicks/shared/tokens';
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'react-email';

import { SANS } from './fonts';

export type H2HReminderEmailProps = {
  raceName: string;
  raceUrl: string;
  settingsUrl: string;
  logoUrl: string;
};

export function H2HReminderEmail({
  raceName = 'Australian Grand Prix',
  raceUrl = 'https://grandprixpicks.com/races/australia-2026',
  settingsUrl = 'https://grandprixpicks.com/settings',
  logoUrl = 'https://grandprixpicks.com/logo-email.png',
}: H2HReminderEmailProps) {
  return (
    <Html>
      <Head>
        <style>{`
          .cta-button:hover {
            background-color: ${email.accentHover} !important;
          }
        `}</style>
      </Head>
      <Preview>Finish your {raceName} H2H picks before they lock!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoRow}>
            <table
              cellPadding="0"
              cellSpacing="0"
              role="presentation"
              style={{ margin: '0 auto' }}
            >
              <tr>
                <td align="center">
                  <Img
                    src={logoUrl}
                    width="32"
                    height="32"
                    alt=""
                    style={logoIcon}
                  />
                </td>
              </tr>
              <tr>
                <td style={brandText}>Grand Prix Picks</td>
              </tr>
            </table>
          </Section>
          <Hr style={hr} />

          <Section style={section}>
            <Text style={headline}>Finish your H2H picks</Text>
            <Text style={text}>
              Your Top 5 picks were recorded for{' '}
              <strong style={{ color: email.text }}>{raceName}</strong>.
            </Text>
            <Text style={text}>
              You forgot to submit your teammate head-to-head picks. Complete
              them now to avoid missing points.
            </Text>
            <Button className="cta-button" style={button} href={raceUrl}>
              Complete H2H Picks
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            You&apos;re receiving this because you have prediction reminders
            enabled.{' '}
            <Link href={settingsUrl} style={footerLink}>
              Manage notification preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/* ── Styles ─────────────────────────────────────────── */

const body = {
  backgroundColor: email.page,
  fontFamily: SANS,
  margin: '0',
  padding: '0 8px',
};

const container = {
  backgroundColor: email.surface,
  borderRadius: '4px',
  border: `1px solid ${email.border}`,
  margin: '40px auto',
  padding: '32px',
  maxWidth: '480px',
};

const logoRow = {
  textAlign: 'center' as const,
  margin: '0 0 16px',
};

const logoIcon = {
  display: 'inline-block',
  verticalAlign: 'middle',
  borderRadius: '4px',
};

const brandText = {
  color: email.text,
  fontSize: '22px',
  fontWeight: '600' as const,
  fontFamily: SANS,
  textAlign: 'center' as const,
  paddingTop: '8px',
  letterSpacing: '0.12em',
};

const hr = {
  borderColor: email.border,
  margin: '20px 0',
};

const section = {
  textAlign: 'center' as const,
};

const headline = {
  color: email.text,
  fontSize: '20px',
  fontWeight: '600' as const,
  lineHeight: '28px',
  margin: '0 0 16px',
};

const text = {
  color: email.textMuted,
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 12px',
};

const button = {
  backgroundColor: email.accent,
  borderRadius: '2px',
  color: email.textOnAccent,
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
  marginTop: '12px',
};

const footer = {
  color: email.textMuted,
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: '0',
};

const footerLink = {
  color: email.text,
  textDecoration: 'underline',
};

// Default export required by React Email dev server preview
export default H2HReminderEmail;
