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

import { MONO, SANS } from './fonts';

export type SeasonRecapEmailProps = {
  season: number;
  recapUrl: string;
  headline: string;
  intro: string;
  settingsUrl: string;
  unsubscribeUrl?: string;
  logoUrl: string;
};

/**
 * The season-end mail. One card, one button: the recap page carries the
 * detail, and this only has to say the season is over and where to look.
 */
export function SeasonRecapEmail({
  season,
  recapUrl,
  headline,
  intro,
  settingsUrl,
  unsubscribeUrl,
  logoUrl,
}: SeasonRecapEmailProps) {
  return (
    <Html>
      <Head>
        <style>{`
          .cta-button:hover {
            background-color: ${email.accentHover} !important;
          }
        `}</style>
      </Head>
      <Preview>{intro}</Preview>
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
            <Text style={eyebrow}>{season} season</Text>
            <Text style={headlineStyle}>{headline}</Text>
            <Text style={text}>{intro}</Text>
            <Button className="cta-button" style={button} href={recapUrl}>
              See my season recap
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            You&apos;re receiving this because you have result notifications
            enabled.{' '}
            <Link href={settingsUrl} style={footerLink}>
              Manage notification preferences
            </Link>
            {unsubscribeUrl ? (
              <>
                {' · '}
                <Link href={unsubscribeUrl} style={footerLink}>
                  Unsubscribe
                </Link>
              </>
            ) : null}
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
};

const hr = {
  borderColor: email.border,
  margin: '0',
};

const section = {
  padding: '24px 0 8px',
  textAlign: 'center' as const,
};

const eyebrow = {
  color: email.textMuted,
  fontFamily: MONO,
  fontSize: '12px',
  letterSpacing: '0.08em',
  margin: '0 0 8px',
};

const headlineStyle = {
  color: email.text,
  fontSize: '24px',
  fontWeight: '600' as const,
  lineHeight: '1.25',
  margin: '0 0 12px',
};

const text = {
  color: email.textMuted,
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0 0 24px',
};

const button = {
  backgroundColor: email.accent,
  borderRadius: '4px',
  color: email.textOnAccent,
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 20px',
  textAlign: 'center' as const,
  textDecoration: 'none',
};

const footer = {
  color: email.textMuted,
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '20px 0 0',
  textAlign: 'center' as const,
};

const footerLink = {
  color: email.textMuted,
  textDecoration: 'underline',
};

// The React Email dev server (`pnpm --filter @grandprixpicks/backend email:dev`)
// renders the default export, so it supplies its own sample props.
export default function SeasonRecapPreview() {
  return (
    <SeasonRecapEmail
      season={2026}
      recapUrl="https://grandprixpicks.com/p/overcut/season"
      headline="That's the 2026 season"
      intro="You finished 7th of 43 with 412 points from 18 weekends. Your recap has your best weekend, your most-backed driver and every round you played."
      settingsUrl="https://grandprixpicks.com/settings"
      unsubscribeUrl="https://grandprixpicks.com/unsubscribe"
      logoUrl="https://grandprixpicks.com/logo-email.png"
    />
  );
}
