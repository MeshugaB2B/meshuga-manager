import dynamic from 'next/dynamic'

const DashboardPage = dynamic(
  () => import('./DashboardContent'),
  { ssr: false, loading: () => null }
)

export default DashboardPage
