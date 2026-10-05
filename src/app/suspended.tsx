import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useMyProfile } from '@/features/profile/hooks';
import { signOut } from '@/services/auth';

const SUPPORT_EMAIL = 'hola@ronda.app'; // Definitivo cuando esté el dominio (Hito 7).

export default function SuspendedScreen() {
  const { data: profile } = useMyProfile();
  const until = profile?.suspended_until ? new Date(profile.suspended_until) : null;
  const permanent = until !== null && until.getFullYear() > 2100;

  return (
    <Screen>
      <EmptyState
        emoji="⛔"
        title={permanent ? 'Tu cuenta fue suspendida' : `Tu cuenta está suspendida hasta el ${until?.toLocaleDateString('es-AR')}`}
        description={profile?.suspension_reason ? `Motivo: ${profile.suspension_reason}` : undefined}>
        <Text variant="muted" className="pt-4 text-center">
          Si creés que es un error, escribinos a {SUPPORT_EMAIL}
        </Text>
      </EmptyState>
      <Button title="Cerrar sesión" variant="ghost" onPress={() => signOut()} />
    </Screen>
  );
}
