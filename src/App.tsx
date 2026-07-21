import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { ALL_ROLE_SLUGS } from '@/lib/publicRolePages'
import { isRegionSlug } from '@/lib/publicRegionPages'
import { resolveLegacyPath } from '@/lib/legacyRedirects'

// Auth
import { AuthProvider } from '@/contexts/AuthContext'
import AuthGuard from '@/components/auth/AuthGuard'
import LoginPage from '@/pages/LoginPage'

// Global in-app CV (Word) viewer — mounted once, driven by cvViewerStore
import { CvViewerDialog } from '@/components/cv/CvViewerDialog'

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
import AdminFixPublicationsPage from '@/pages/AdminFixPublicationsPage'
import InboxV2Page from '@/pages/InboxV2Page'
import CandidateProfilePage from '@/pages/CandidateProfilePage'
import EmployerProfilePage from '@/pages/EmployerProfilePage'

// Public pages
import PublicHomePage from '@/pages/PublicHomePage'
import { PublicLaunchGate } from '@/components/public/PublicLaunchGate'
import PublicJobsPage from '@/pages/PublicJobsPage'
import PublicJobPage from '@/pages/PublicJobPage'
import PublicRoleJobsPage from '@/pages/PublicRoleJobsPage'
import PublicRegionJobsPage from '@/pages/PublicRegionJobsPage'
import UnderConstructionPage from '@/pages/UnderConstructionPage'
import NotFoundPage from '@/pages/NotFoundPage'
import JoinTalentPoolPage from '@/pages/JoinTalentPoolPage'
import EmployersPage from '@/pages/EmployersPage'
import EmployersDiscreetPage from '@/pages/EmployersDiscreetPage'
import EmployersBrandingPage from '@/pages/EmployersBrandingPage'
import RecruitmentRequestPage from '@/pages/RecruitmentRequestPage'
import DentalShopPage from '@/pages/DentalShopPage'
import DentalAssetsPage from '@/pages/DentalAssetsPage'
import ClassDentalPage from '@/pages/ClassDentalPage'
import ContactPage from '@/pages/ContactPage'


// Catch-all לכתובות שורש ישנות: קוד משרה → מפת הפניות → תוכן בהקמה → 404.
// אף פעם לא נופל אוטומטית ל-/jobs (כלל מהמסמך).
function LegacyCatchAll() {
  const { legacyJobCode } = useParams()
  const decoded = decodeURIComponent(legacyJobCode ?? '')

  // 1. טופס הצטרפות למאגר (כתובת עברית ייעודית)
  if (decoded === 'הצטרפות-למאגר-הדנטלי') return <JoinTalentPoolPage />

  // 2. קוד משרה תקין → /jobs/{UPPER}
  const code = decoded.trim().toUpperCase()
  if (/^[A-Z]{2,5}\d{1,5}$/.test(code)) {
    return <Navigate to={`/jobs/${code}`} replace />
  }

  // 3. מפת הפניות ישנות (יעד קבוע או "תוכן בהקמה")
  const target = resolveLegacyPath(decoded)
  if (target === 'construction') return <UnderConstructionPage />
  if (target) return <Navigate to={target} replace />

  // 4. אחרת — 404 מסודר
  return <NotFoundPage />
}

// Redirects from old /jobs/role/:role pattern to clean /jobs/:slug
function RoleSlugRedirect() {
  const { role } = useParams<{ role: string }>()
  return <Navigate to={`/jobs/${role}`} replace />
}

// Dispatch לפי סוג ה-slug: תפקיד → אזור → קוד משרה → 404.
function JobsSlugDispatch() {
  const { slug } = useParams<{ slug: string }>()
  const decoded = slug ? decodeURIComponent(slug) : ''

  if (decoded && (ALL_ROLE_SLUGS as readonly string[]).includes(decoded)) {
    return <PublicRoleJobsPage />
  }
  if (decoded && isRegionSlug(decoded)) {
    return <PublicRegionJobsPage />
  }
  const code = decoded.trim().toUpperCase()
  if (/^[A-Z]{2,5}\d{1,5}$/.test(code)) {
    return <PublicJobPage />
  }
  return <NotFoundPage />
}


export default function App() {
  return (
    <AuthProvider>
    <CvViewerDialog />
    <PublicLaunchGate>
    <Routes>
      {/* ─── Public routes (with PublicLayout) ─── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicHomePage />} />

        {/* Jobs */}
        <Route path="/jobs" element={<PublicJobsPage />} />
        <Route path="/jobs/role/:role" element={<RoleSlugRedirect />} />
        <Route path="/jobs/:slug" element={<JobsSlugDispatch />} />

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
      <Route path="/employer-profile/:id" element={<AuthGuard><EmployerProfilePage /></AuthGuard>} />

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
        <Route path="fix-publications" element={<AdminFixPublicationsPage />} />
      </Route>

      {/* ─── Legacy multi-segment technical URL ─── */}
      <Route path="/site/f6084fc5/home" element={<Navigate to="/" replace />} />

      {/* ─── Legacy root URLs (single source of truth: legacyRedirects.ts) ─── */}
      {/* קוד משרה / קטגוריות / כתובות עבריות / תוכן בהקמה — הכול דרך LegacyCatchAll */}
      <Route path="/:legacyJobCode" element={<LegacyCatchAll />} />

      {/* ─── 404 — כתובות רב-מקטעיות לא מזוהות ─── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </PublicLaunchGate>
    </AuthProvider>
  )
}
