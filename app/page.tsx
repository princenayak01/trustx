import TrustXV2 from '@/components/trustx-v2'
import TrustXLiveCenter from '@/components/trustx-live-center'
import AuthGate from '@/components/auth-gate'

export default function Page() {
  return (
    <AuthGate>
      <TrustXV2 />
      <TrustXLiveCenter />
    </AuthGate>
  )
}
