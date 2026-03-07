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

export type ResultsEmailShellProps = {
  previewText: string;
  headline: string;
  intro: string;
  raceName: string;
  raceUrl: string;
  settingsUrl: string;
  logoUrl: string;
  round: number;
  countryCode: string | null;
  hasSprint: boolean;
  primaryCtaLabel: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  helperText?: string;
  footerText: string;
};

export function ResultsEmailShell({
  previewText,
  headline,
  intro,
  raceName,
  raceUrl,
  settingsUrl,
  logoUrl,
  round,
  countryCode,
  hasSprint,
  primaryCtaLabel,
  secondaryCtaLabel,
  secondaryCtaUrl,
  helperText,
  footerText,
}: ResultsEmailShellProps) {
  return (
    <Html>
      <Head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800&display=swap');

          .cta-button:hover {
            background-color: #0f766e !important;
          }

          .secondary-cta:hover {
            background-color: #f0fdfa !important;
          }
        `}</style>
      </Head>
      <Preview>{previewText}</Preview>
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
                  <div style={logoCircle}>
                    <Img
                      src={logoUrl}
                      width="22"
                      height="22"
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
            <Text style={headlineStyle}>{headline}</Text>
            <Text style={introText}>{intro}</Text>

            <Section style={raceCard}>
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

              <Text style={raceNameStyle}>{raceName}</Text>
            </Section>

            <Button className="cta-button" style={button} href={raceUrl}>
              {primaryCtaLabel}
            </Button>

            {secondaryCtaLabel && secondaryCtaUrl ? (
              <Button
                className="secondary-cta"
                style={secondaryButton}
                href={secondaryCtaUrl}
              >
                {secondaryCtaLabel}
              </Button>
            ) : null}

            {helperText ? <Text style={helperTextStyle}>{helperText}</Text> : null}
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            {footerText}{' '}
            <Link href={settingsUrl} style={footerLink}>
              Manage notification preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

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
  backgroundColor: '#0f172a',
  borderRadius: '9999px',
  textAlign: 'center' as const,
};

const logoIcon = {
  display: 'inline-block',
  verticalAlign: 'middle',
  position: 'relative' as const,
  top: '-2px',
  left: '1px',
};

const brandText = {
  color: '#0f172a',
  fontSize: '24px',
  fontWeight: '700' as const,
  fontFamily:
    '"Orbitron", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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

const headlineStyle = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: '600' as const,
  lineHeight: '28px',
  margin: '0 0 20px',
};

const introText = {
  color: '#475569',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 20px',
};

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
  fontWeight: '700' as const,
  fontFamily:
    '"Orbitron", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: '4px 0 12px',
  lineHeight: '24px',
};

const button = {
  backgroundColor: '#0d9488',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'block',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
  width: '100%',
  maxWidth: '320px',
  margin: '0 auto',
  boxSizing: 'border-box' as const,
};

const secondaryButton = {
  backgroundColor: '#ffffff',
  border: '1px solid #99f6e4',
  borderRadius: '8px',
  color: '#0f766e',
  display: 'block',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
  width: '100%',
  maxWidth: '320px',
  margin: '12px auto 0',
  boxSizing: 'border-box' as const,
};

const helperTextStyle = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '12px 0 0',
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
