import { Routes, Route, Navigate, useParams } from 'react-router-dom'

// Auth
import { AuthProvider } from '@/contexts/AuthContext'
import AuthGuard from '@/components/auth/AuthGuard'
import LoginPage from '@/pages/LoginPage'

// Layouts
import AdminLayout from '@/components/layout/AdminLayout'
import PublicLayout from '@/components/layout/PublicLayout'

// Admin pages
import DashboardPage from '@/pages/DashboardPage'
import InboxPage from '@/pages/InboxPage'
import AdminContactsPage from '@/pages/AdminContactsPage'
import AdminCandidatesPage from '@/pages/AdminCandidatesPage'
import Candidate360Page from '@/pages/Candidate360Page'
import AdminAccountsPage from '@/pages/AdminAccountsPage'
import AdminEmployersPage from '@/pages/AdminEmployersPage'
import Employer360Page from '@/pages/Employer360Page'
import AdminJobsPage from '@/pages/AdminJobsPage'
import CreateJobWizardPage from '@/pages/CreateJobWizardPage'
import JobDetailsPage from '@/pages/JobDetailsPage'
import AdminApplicationsPage from '@/pages/AdminApplicationsPage'
import ATSPipelinePage from '@/pages/ATSPipelinePage'
import SmartMatchPage from '@/pages/SmartMatchPage'
import InboxV2Page from '@/pages/InboxV2Page'
import CandidateProfilePage from '@/pages/CandidateProfilePage'
import EmployerProfilePage from '@/pages/EmployerProfilePage'

// Public pages
import PublicHomePage from '@/pages/PublicHomePage'
import { PublicLaunchGate } from '@/components/public/PublicLaunchGate'
import PublicJobsPage from '@/pages/PublicJobsPage'
import PublicJobPage from '@/pages/PublicJobPage'
import PublicRoleJobsPage from '@/pages/PublicRoleJobsPage'
import EmployersPage from '@/pages/EmployersPage'
import EmployersDiscreetPage from '@/pages/EmployersDiscreetPage'
import EmployersBrandingPage from '@/pages/EmployersBrandingPage'
import RecruitmentRequestPage from '@/pages/RecruitmentRequestPage'
import DentalShopPage from '@/pages/DentalShopPage'
import DentalAssetsPage from '@/pages/DentalAssetsPage'
import ClassDentalPage from '@/pages/ClassDentalPage'
import ContactPage from '@/pages/ContactPage'


function LegacyJobRedirect() {
  const { legacyJobCode } = useParams()

  const normalizedJobCode = legacyJobCode?.trim().toUpperCase()
  const isLikelyJobCode = /^[A-Z]{2,5}\d{1,5}$/.test(normalizedJobCode ?? '')

  if (!normalizedJobCode || !isLikelyJobCode) {
    return <Navigate to="/jobs" replace />
  }

  return <Navigate to={`/jobs/${normalizedJobCode}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
    <PublicLaunchGate>
    <Routes>
      {/* ─── Public routes (with PublicLayout) ─── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicHomePage />} />

        {/* Jobs — /jobs/role/:role must come before /jobs/:jobCode */}
        <Route path="/jobs" element={<PublicJobsPage />} />
        <Route path="/jobs/role/:role" element={<PublicRoleJobsPage />} />
        <Route path="/jobs/:jobCode" element={<PublicJobPage />} />

        {/* Employers */}
        <Route path="/employers" element={<EmployersPage />} />
        <Route path="/employers/discreet" element={<EmployersDiscreetPage />} />
        <Route path="/employers/branding" element={<EmployersBrandingPage />} />
        <Route path="/employers/recruitment-request" element={<RecruitmentRequestPage />} />

        {/* Dental services */}
        <Route path="/dental-shop" element={<DentalShopPage />} />
        <Route path="/dental-assets" element={<DentalAssetsPage />} />
        <Route path="/class-dental" element={<ClassDentalPage />} />

        {/* Contact */}
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* ─── Login ─── */}
      <Route path="/login" element={<LoginPage />} />

      {/* ─── Profile routes (no layout) ─── */}
      <Route path="/candidate/:contactId" element={<CandidateProfilePage />} />
      <Route path="/profile/:token" element={<CandidateProfilePage />} />
      <Route path="/employer-profile/:id" element={<EmployerProfilePage />} />

      {/* ─── Admin routes (with AdminLayout, auth-protected) ─── */}
      <Route path="/admin" element={<AuthGuard><AdminLayout /></AuthGuard>}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="inbox-v2" element={<InboxV2Page />} />

        {/* Contacts & Candidates */}
        <Route path="contacts" element={<AdminContactsPage />} />
        <Route path="contacts/:contactId" element={<Candidate360Page />} />
        <Route path="candidates" element={<AdminCandidatesPage />} />
        <Route path="candidates/:id" element={<Candidate360Page />} />

        {/* Accounts & Employers */}
        <Route path="accounts" element={<AdminAccountsPage />} />
        <Route path="accounts/:id" element={<Employer360Page />} />
        <Route path="employers" element={<AdminEmployersPage />} />
        <Route path="employers/:id" element={<Employer360Page />} />

        {/* Jobs */}
        <Route path="jobs" element={<AdminJobsPage />} />
        <Route path="jobs/new" element={<CreateJobWizardPage />} />
        <Route path="jobs/:code" element={<JobDetailsPage />} />

        {/* ATS */}
        <Route path="applications" element={<AdminApplicationsPage />} />
        <Route path="pipeline" element={<ATSPipelinePage />} />
        <Route path="ats" element={<ATSPipelinePage />} />

        {/* Tools */}
        <Route path="smart-match" element={<SmartMatchPage />} />
      </Route>

      {/* ─── Legacy job URLs from previous site ─── */}
      <Route path="/:legacyJobCode" element={<LegacyJobRedirect />} />
    </Routes>
    </PublicLaunchGate>
    </AuthProvider>
  )
}
