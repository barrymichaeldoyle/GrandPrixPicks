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
} from '@react-email/components';

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
            background-color: #0f766e !important;
          }
        `}</style>
      </Head>
      <Preview>Finish your {raceName} H2H picks before they lock!</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Brand header */}
          <Section style={logoRow}>
            <table
              cellPadding="0"
              cellSpacing="0"
              role="presentation"
              style={{ margin: '0 auto' }}
            >
              <tr>
                <td align="center">
                  <div style={logoCircle}>
                    <Img
                      src={logoUrl}
                      width="20"
                      height="20"
                      alt=""
                      style={logoIcon}
                    />
                  </div>
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
              Nice work — you submitted your Top 5 predictions for{' '}
              <strong style={{ color: '#0f172a' }}>{raceName}</strong>.
            </Text>
            <Text style={text}>
              You still have teammate head-to-head picks left. Complete them now
              to avoid missing points.
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
  backgroundColor: '#f1f5f9',
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: '0',
  padding: '0 8px',
};

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  margin: '40px auto',
  padding: '32px',
  maxWidth: '480px',
};

const logoRow = {
  textAlign: 'center' as const,
  margin: '0 0 16px',
};

const logoCircle = {
  display: 'inline-block' as const,
  width: '32px',
  height: '32px',
  lineHeight: '32px',
  backgroundColor: '#ccfbf1',
  borderRadius: '9999px',
  textAlign: 'center' as const,
};

const logoIcon = {
  display: 'inline-block',
  verticalAlign: 'middle',
  position: 'relative' as const,
  top: '-1px',
  left: '1px',
};

const brandText = {
  color: '#0f172a',
  fontSize: '24px',
  fontWeight: '700' as const,
  textAlign: 'center' as const,
  paddingTop: '8px',
  letterSpacing: '-0.01em',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '20px 0',
};

const section = {
  textAlign: 'center' as const,
};

const headline = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: '600' as const,
  lineHeight: '28px',
  margin: '0 0 16px',
};

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 12px',
};

const button = {
  backgroundColor: '#0d9488',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
  marginTop: '12px',
};

const footer = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: '0',
};

const footerLink = {
  color: '#0d9488',
  textDecoration: 'underline',
};

// Default export required by React Email dev server preview
export default H2HReminderEmail;
