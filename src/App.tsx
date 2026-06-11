import { Routes, Route, Navigate } from 'react-router-dom'

// Layouts
import AdminLayout from '@/components/layout/AdminLayout'

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
import PublicJobsPage from '@/pages/PublicJobsPage'
import PublicJobPage from '@/pages/PublicJobPage'

export default function App() {
  return (
    <Routes>
      {/* redirect from root to public jobs */}
      <Route path="/" element={<Navigate to="/jobs" replace />} />

      {/* ─── Public routes (no sidebar) ─── */}
      <Route path="/jobs" element={<PublicJobsPage />} />
      <Route path="/jobs/:jobCode" element={<PublicJobPage />} />
      <Route path="/candidate/:contactId" element={<CandidateProfilePage />} />
      <Route path="/profile/:token" element={<CandidateProfilePage />} />
      <Route path="/employer-profile/:id" element={<EmployerProfilePage />} />

      {/* ─── Admin routes (with AppSidebar) ─── */}
      <Route path="/admin" element={<AdminLayout />}>
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
    </Routes>
  )
}