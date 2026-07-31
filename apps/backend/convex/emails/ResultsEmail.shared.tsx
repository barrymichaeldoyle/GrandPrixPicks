import { emailColors as email } from '@grandprixpicks/shared/tokens';
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
} from 'react-email';

import { MONO, SANS } from './fonts';

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
          @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&display=swap');

          .cta-button:hover {
            background-color: ${email.accentHover} !important;
          }

          .secondary-cta:hover {
            background-color: ${email.surfaceMuted} !important;
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

            {helperText ? (
              <Text style={helperTextStyle}>{helperText}</Text>
            ) : null}
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

const headlineStyle = {
  color: email.text,
  fontSize: '20px',
  fontWeight: '600' as const,
  lineHeight: '28px',
  margin: '0 0 20px',
};

const introText = {
  color: email.textMuted,
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 20px',
};

const raceCard = {
  backgroundColor: email.surfaceMuted,
  borderRadius: '4px',
  padding: '16px',
  margin: '0 0 20px',
  textAlign: 'left' as const,
  border: `1px solid ${email.border}`,
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
  color: email.textMuted,
  fontSize: '13px',
  fontWeight: '600' as const,
  fontFamily: MONO,
  letterSpacing: '0.08em',
  verticalAlign: 'middle',
};

const raceNameStyle = {
  color: email.text,
  fontSize: '18px',
  fontWeight: '600' as const,
  fontFamily: SANS,
  margin: '4px 0 12px',
  lineHeight: '24px',
};

/**
 * Chartreuse fill, near-black ink. White on chartreuse is ~1.3:1 and was a real
 * contrast bug on the web app before the reskin; it is not repeated here.
 */
const button = {
  backgroundColor: email.accent,
  borderRadius: '2px',
  color: email.textOnAccent,
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
  backgroundColor: email.surface,
  border: `1px solid ${email.borderStrong}`,
  borderRadius: '2px',
  color: email.text,
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
  color: email.textMuted,
  fontSize: '12px',
  lineHeight: '18px',
  margin: '12px 0 0',
};

const footer = {
  color: email.textMuted,
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: '0',
};

// Ink, not accent: chartreuse on white is ~1.4:1. The underline carries it.
const footerLink = {
  color: email.text,
  textDecoration: 'underline',
};
