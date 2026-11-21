import { Text, View } from 'react-native';
import { SUPPORT_EMAIL } from '@/config/constants';
import SettingsDetailLayout from '@/components/settings/SettingsDetailLayout';

// GDPR Art. 13 transparency notice for the trusted-tester phase. DRAFT —
// content mirrored in docs/privacy-notice.md (the copy to host for the Play
// listing later). Keep the two in sync; have a human review before public
// release.

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className="mb-5">
      <Text className="text-fog text-sm font-bold mb-1.5">{title}</Text>
      <Text className="text-fog/60 text-sm leading-5">{children}</Text>
    </View>
  );
}

export default function PrivacyNoticeScreen() {
  return (
    <SettingsDetailLayout
      title="Privacy Notice"
      subtitle="What us stores, who can see it, and your rights. Last updated 31 October 2026."
    >
      <Section title="Who is responsible">
        {`us is a nonprofit project run by Pål Schakonat, Malmö, Sweden. Questions or requests: ${SUPPORT_EMAIL}.`}
      </Section>

      <Section title="What we store">
        {'Your account (sign-in email, display name, handle, bio), your spots (the places you define — visible only to you), your messages and group chats, your friend connections and requests, and gatherings you create or join.'}
      </Section>

      <Section title="Location — the important part">
        {'Your position is shared ONLY while you are inside one of your own active spots, and only with your friends. In transit you are invisible: the location record is deleted, not hidden. Ghost mode turns everything off instantly. Friends who see you also see the name of the spot you are at. The app ignores a location record after 24 hours, and deletes it the next time you open the app outside your spots, or sign out.'}
      </Section>

      <Section title="Encryption">
        {'Messages, group names, your location, your spots, signals and gathering details are end-to-end encrypted: they leave your phone encrypted and only the people they are meant for can read them. We cannot read them, and neither can Google. The key stays on your phone, so if you uninstall the app or change phone, old messages and spots cannot be recovered. We can still see what the service needs to work: your display name, handle and bio, who is friends and in which chat, and when things happen (not what was said). The encryption has not been independently audited yet.'}
      </Section>

      <Section title="Where it lives">
        {'Data is stored in Google Firebase (Google Cloud). Google acts as our processor and may process data in the US under the EU–US Data Privacy Framework and Standard Contractual Clauses. If the app crashes, tester builds send a technical crash report (error and device details — never your location or messages) to Sentry, our error-monitoring processor. We run no ads, no tracking, no analytics profiles, and we never sell data.'}
      </Section>

      <Section title="Your rights">
        {`You can ask for a copy of your data, correct it, or have your account and all its data deleted — email ${SUPPORT_EMAIL} and it will be handled within a month (usually much faster at this stage). You can also complain to the Swedish Authority for Privacy Protection (IMY, imy.se).`}
      </Section>

      <Section title="Testing phase">
        {'You are using a trusted-tester build. Testers are adults (18+) who received their account personally. Things may break; report anything odd via Settings → Report a Bug.'}
      </Section>
    </SettingsDetailLayout>
  );
}
