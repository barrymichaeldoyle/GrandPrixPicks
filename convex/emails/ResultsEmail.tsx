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

export type ResultsEmailProps = {
  raceName: string;
  sessionLabel: string;
  sessionPoints: number;
  bestPick: {
    code: string;
    position: number;
    points: number;
  } | null;
  globalRank: number;
  globalTotal: number;
  leagueRanks: Array<{
    leagueName: string;
    rank: number;
    total: number;
  }>;
  raceUrl: string;
  settingsUrl: string;
  logoUrl: string;
  round: number;
  countryCode: string | null;
  hasSprint: boolean;
};

export function ResultsEmail({
  raceName = 'Australian Grand Prix',
  sessionLabel = 'Race',
  sessionPoints = 18,
  bestPick = { code: 'VER', position: 1, points: 5 },
  globalRank = 3,
  globalTotal = 42,
  leagueRanks = [{ leagueName: 'Office League', rank: 1, total: 8 }],
  raceUrl = 'https://grandprixpicks.com/races/australia-2026',
  settingsUrl = 'https://grandprixpicks.com/settings',
  logoUrl = 'https://grandprixpicks.com/logo-email.png',
  round = 1,
  countryCode = 'au',
  hasSprint = false,
}: ResultsEmailProps) {
  const bestPickCallout =
    bestPick && bestPick.points >= 3
      ? bestPick.points === 5
        ? `Spot on — ${bestPick.code} in P${bestPick.position}!`
        : `Close call — ${bestPick.code} in P${bestPick.position}`
      : null;

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
        {`You scored ${sessionPoints}/25 in ${raceName} ${sessionLabel}`}
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
            <Text style={headline}>Your {sessionLabel} results are in</Text>

            {/* Score card */}
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

              {/* Large score */}
              <Text style={scoreStyle}>{sessionPoints} / 25 pts</Text>
            </Section>

            {/* Best pick callout */}
            {bestPickCallout && (
              <Text style={bestPickStyle}>{bestPickCallout}</Text>
            )}

            {/* Rankings */}
            <Section style={rankingsSection}>
              <Text style={rankingLine}>
                Global: #{globalRank} of {globalTotal}
              </Text>
              {leagueRanks.slice(0, 3).map((league) => (
                <Text key={league.leagueName} style={rankingLine}>
                  {league.leagueName}: #{league.rank} of {league.total}
                </Text>
              ))}
            </Section>

            <Button className="cta-button" style={button} href={raceUrl}>
              View Full Results
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            You&apos;re receiving this because you have result notifications
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
  margin: '0 0 20px',
};

/* Race card */
const raceCard = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '16px',
  margin: '0 0 20px',
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

const sprintTag = {
  backgroundColor: '#ede9fe',
  color: '#6d28d9',
  fontSize: '10px',
  fontWeight: '700' as const,
  padding: '2px 6px',
  borderRadius: '4px',
  verticalAlign: 'middle',
  marginLeft: '8px',
  letterSpacing: '0.03em',
};

const raceNameStyle = {
  color: '#0f172a',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '4px 0 12px',
  lineHeight: '24px',
};

const scoreStyle = {
  color: '#0d9488',
  fontSize: '28px',
  fontWeight: '700' as const,
  margin: '0',
  lineHeight: '36px',
  textAlign: 'center' as const,
};

const bestPickStyle = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0 0 16px',
  fontStyle: 'italic' as const,
};

const rankingsSection = {
  margin: '0 0 24px',
};

const rankingLine = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
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
// eslint-disable-next-line no-restricted-syntax
export default ResultsEmail;
