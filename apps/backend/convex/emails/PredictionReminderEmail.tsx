import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';

export type SessionScheduleItem = {
  label: string;
  date: string;
  time: string;
  isSprint: boolean;
};

export type PredictionReminderProps = {
  raceName: string;
  timeUntilLock: string;
  raceUrl: string;
  settingsUrl: string;
  logoUrl: string;
  sessions: Array<SessionScheduleItem>;
  round: number;
  countryCode: string | null;
};

export function PredictionReminderEmail({
  raceName = 'Australian Grand Prix',
  timeUntilLock = '24 hours',
  raceUrl = 'https://grandprixpicks.com/races/australia-2026',
  settingsUrl = 'https://grandprixpicks.com/settings',
  logoUrl = 'https://grandprixpicks.com/logo-email.png',
  sessions = [
    {
      label: 'Sprint Quali',
      date: 'Fri, 14 Mar',
      time: '03:30 UTC',
      isSprint: true,
    },
    { label: 'Sprint', date: 'Sat, 15 Mar', time: '03:00 UTC', isSprint: true },
    {
      label: 'Qualifying',
      date: 'Sat, 15 Mar',
      time: '06:00 UTC',
      isSprint: false,
    },
    { label: 'Race', date: 'Sun, 16 Mar', time: '04:00 UTC', isSprint: false },
  ],
  round = 1,
  countryCode = 'au',
}: PredictionReminderProps) {
  return (
    <Html>
      <Head>
        <style>{`
          .cta-button:hover {
            background-color: #0f766e !important;
          }
        `}</style>
      </Head>
      <Preview>
        {raceName} predictions lock in {timeUntilLock} — submit your picks!
      </Preview>
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
            <Text style={text}>
              Predictions for the{' '}
              <strong style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>
                {raceName}
              </strong>{' '}
              lock in{' '}
              <strong style={{ color: '#0f172a', whiteSpace: 'nowrap' }}>
                {timeUntilLock}
              </strong>
              . Don&apos;t miss your chance to earn points!
            </Text>

            {/* Race info card (like RaceCard) */}
            <Section style={raceCard}>
              {/* Flag + Round row */}
              <Row style={raceHeaderRow}>
                <Column style={raceHeaderLeft}>
                  {countryCode && (
                    <Img
                      src={`https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`}
                      width="40"
                      height="30"
                      alt=""
                      style={countryFlag}
                    />
                  )}
                  <span style={roundLabel}>Round {round}</span>
                </Column>
              </Row>

              {/* Race name */}
              <Text style={raceNameStyle}>{raceName}</Text>

              {/* Session schedule */}
              {sessions.length > 0 && (
                <Section style={scheduleSection}>
                  {sessions.map((s) => (
                    <Row key={s.label} style={scheduleRow}>
                      <Column style={scheduleLabelCol}>
                        {s.isSprint ? (
                          <span style={sprintBadge}>{s.label}</span>
                        ) : (
                          <span style={sessionLabel}>{s.label}</span>
                        )}
                      </Column>
                      <Column style={scheduleTimeCol}>
                        <span style={scheduleDate}>{s.date}</span>
                        <span style={scheduleTime}> · {s.time}</span>
                      </Column>
                    </Row>
                  ))}
                </Section>
              )}
            </Section>

            <Button className="cta-button" style={button} href={raceUrl}>
              Submit Your Picks
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

const text = {
  color: '#475569',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

/* Race card */
const raceCard = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 24px',
  textAlign: 'left' as const,
  border: '1px solid #e2e8f0',
};

const raceHeaderRow = {
  margin: '0 0 8px',
};

const raceHeaderLeft = {
  verticalAlign: 'middle' as const,
};

const countryFlag = {
  display: 'inline-block',
  verticalAlign: 'middle',
  borderRadius: '2px',
  marginRight: '10px',
};

const roundLabel = {
  color: '#64748b',
  fontSize: '13px',
  fontWeight: '500' as const,
  verticalAlign: 'middle',
};

const raceNameStyle = {
  color: '#0f172a',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '4px 0 12px',
  lineHeight: '24px',
};

const scheduleSection = {
  margin: '0',
};

const scheduleRow = {
  margin: 0,
};

const scheduleLabelCol = {
  width: '120px',
  padding: '4px 0',
  textAlign: 'left' as const,
  verticalAlign: 'middle' as const,
};

const scheduleTimeCol = {
  padding: '4px 0',
  textAlign: 'right' as const,
  verticalAlign: 'middle' as const,
};

const sessionLabel = {
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: '500' as const,
  lineHeight: '22px',
  display: 'inline-block' as const,
};

const sprintBadge = {
  color: '#6d28d9',
  fontSize: '14px',
  fontWeight: '600' as const,
  lineHeight: '22px',
  display: 'inline-block' as const,
};

const scheduleDate = {
  color: '#64748b',
  fontSize: '13px',
  lineHeight: '1.2',
};

const scheduleTime = {
  color: '#64748b',
  fontSize: '13px',
  lineHeight: '1.2',
  whiteSpace: 'nowrap' as const,
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
export default PredictionReminderEmail;
