'use client'
import dynamic from 'next/dynamic'

const DashboardContent = dynamic(
  () => import('./DashboardContent'),
  { ssr: false, loading: () => null }
)

export default DashboardContent
