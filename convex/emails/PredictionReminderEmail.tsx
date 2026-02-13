import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export type PredictionReminderProps = {
  raceName: string;
  timeUntilLock: string;
  raceUrl: string;
  settingsUrl: string;
};

export function PredictionReminderEmail({
  raceName,
  timeUntilLock,
  raceUrl,
  settingsUrl,
}: PredictionReminderProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {raceName} locks in {timeUntilLock} — submit your picks!
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Grand Prix Picks</Heading>
          <Hr style={hr} />
          <Section style={section}>
            <Text style={text}>
              The <strong>{raceName}</strong> locks in{' '}
              <strong>{timeUntilLock}</strong>. Don&apos;t miss your chance to
              earn points this weekend!
            </Text>
            <Button style={button} href={raceUrl}>
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

const body = {
  backgroundColor: '#0f0f0f',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  margin: '0',
  padding: '0',
};

const container = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  border: '1px solid #2a2a2a',
  margin: '40px auto',
  padding: '32px',
  maxWidth: '480px',
};

const heading = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700' as const,
  textAlign: 'center' as const,
  margin: '0 0 16px',
};

const hr = {
  borderColor: '#2a2a2a',
  margin: '20px 0',
};

const section = {
  textAlign: 'center' as const,
};

const text = {
  color: '#d4d4d4',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

const button = {
  backgroundColor: '#e11d48',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
};

const footer = {
  color: '#737373',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: '0',
};

const footerLink = {
  color: '#737373',
  textDecoration: 'underline',
};
