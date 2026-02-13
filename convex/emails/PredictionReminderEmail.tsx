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
  sessions: Array<SessionScheduleItem>;
  round: number;
  countryCode: string | null;
  hasSprint: boolean;
};

/** Lucide Flag icon SVG markup (24x24, teal stroke) */
const FLAG_SVG_RAW =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/></svg>';

/** Base64-encoded data URI for the flag icon */
const FLAG_SVG = `data:image/svg+xml;base64,${Buffer.from(FLAG_SVG_RAW).toString('base64')}`;

export function PredictionReminderEmail({
  raceName = 'Australian Grand Prix',
  timeUntilLock = '24 hours',
  raceUrl = 'https://grandprixpicks.com/races/australia-2026',
  settingsUrl = 'https://grandprixpicks.com/settings',
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
  hasSprint = true,
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
                      src={FLAG_SVG}
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
              Predictions for the <strong style={{ color: '#f8fafc', whiteSpace: 'nowrap' }}>{raceName}</strong> lock in{' '}
              <strong style={{ color: '#f8fafc', whiteSpace: 'nowrap' }}>{timeUntilLock}</strong>.
              Don&apos;t miss your chance to earn points!
            </Text>

            {/* Race info card (like RaceCard) */}
            <Section style={raceCard}>
              {/* Flag + Round + Sprint badge row */}
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
                  {hasSprint && <span style={sprintTag}>SPRINT</span>}
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
  backgroundColor: '#0f172a',
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: '0',
  padding: '0 8px',
};

const container = {
  backgroundColor: '#1e293b',
  borderRadius: '12px',
  border: '1px solid #334155',
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
  backgroundColor: 'rgba(13,148,136,0.1)',
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
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700' as const,
  textAlign: 'center' as const,
  paddingTop: '8px',
  letterSpacing: '-0.01em',
};

const hr = {
  borderColor: '#334155',
  margin: '20px 0',
};

const section = {
  textAlign: 'center' as const,
};

const text = {
  color: '#94a3b8',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

/* Race card */
const raceCard = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 24px',
  textAlign: 'left' as const,
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
  color: '#94a3b8',
  fontSize: '13px',
  fontWeight: '500' as const,
  verticalAlign: 'middle',
};

const sprintTag = {
  backgroundColor: 'rgba(126,34,206,0.3)',
  color: '#c4b5fd',
  fontSize: '10px',
  fontWeight: '700' as const,
  padding: '2px 6px',
  borderRadius: '4px',
  verticalAlign: 'middle',
  marginLeft: '8px',
  letterSpacing: '0.03em',
};

const raceNameStyle = {
  color: '#f8fafc',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '4px 0 12px',
  lineHeight: '24px',
};

const scheduleSection = {
  margin: '0',
};

const scheduleRow = {
  margin: '0 0 6px',
};

const scheduleLabelCol = {
  width: '120px',
  textAlign: 'left' as const,
  verticalAlign: 'middle' as const,
  paddingBottom: '4px',
};

const scheduleTimeCol = {
  textAlign: 'right' as const,
  verticalAlign: 'middle' as const,
  paddingBottom: '4px',
};

const sessionLabel = {
  color: '#f8fafc',
  fontSize: '14px',
  fontWeight: '500' as const,
};

const sprintBadge = {
  backgroundColor: 'rgba(126,34,206,0.3)',
  color: '#c4b5fd',
  fontSize: '12px',
  fontWeight: '600' as const,
  padding: '2px 8px',
  borderRadius: '4px',
};

const scheduleDate = {
  color: '#94a3b8',
  fontSize: '13px',
};

const scheduleTime = {
  color: '#94a3b8',
  fontSize: '13px',
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
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: '0',
};

const footerLink = {
  color: '#94a3b8',
  textDecoration: 'underline',
};

// Default export required by React Email dev server preview
// eslint-disable-next-line no-restricted-syntax
export default PredictionReminderEmail;
