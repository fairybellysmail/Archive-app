import React, { useState, useEffect } from 'react';
import { User, Case, DashboardStats } from './types/judicial.js';
import { api } from './services/api.js';
import { Navigation, NavTab } from './components/Navigation.js';
import { OfficerSwitcherModal } from './components/OfficerSwitcherModal.js';
import { DashboardView } from './components/DashboardView.js';
import { CaseRegistryView } from './components/CaseRegistryView.js';
import { CaseDetailView } from './components/CaseDetailView.js';
import { AuditLedgerView } from './components/AuditLedgerView.js';
import { ProceedingsView } from './components/ProceedingsView.js';
import { SchemaInspectorView } from './components/SchemaInspectorView.js';
import { EventsView } from './components/EventsView.js';
import { CreateCaseModal } from './components/CreateCaseModal.js';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [isAuditChainValid, setIsAuditChainValid] = useState(true);

  // Initialize Users and Active Officer
  const initUsers = async () => {
    try {
      const { users, currentUserId } = await api.getUsers();
      setAllUsers(users);
      const active = users.find(u => u.id === currentUserId) || users[0];
      if (active) {
        setCurrentUser(active);
        api.setActiveUserId(active.id);
      }
    } catch (err) {
      console.error('Failed to load judicial users', err);
    }
  };

  // Load Dashboard Stats
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
      setIsAuditChainValid(data.audit_chain_valid);
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load All Cases
  const loadCases = async () => {
    setLoadingCases(true);
    try {
      const data = await api.getCases();
      setCases(data.cases);
    } catch (err) {
      console.error('Failed to load cases', err);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    initUsers();
    loadStats();
    loadCases();
  }, []);

  // Handle Officer Switch
  const handleSelectOfficer = (user: User) => {
    setCurrentUser(user);
    api.setActiveUserId(user.id);
    // Reload state according to new officer permissions
    loadStats();
    loadCases();
    if (selectedCaseId) {
      // Re-trigger case details reload under new user
      setSelectedCaseId(selectedCaseId);
    }
  };

  // Handle Tab Switch
  const handleTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
    if (selectedCaseId && tab !== 'cases') {
      setSelectedCaseId(null);
    }
  };

  // Handle Case Selection
  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCurrentTab('cases');
  };

  // Handle New Case Creation
  const handleCreateCase = async (caseData: any) => {
    const res = await api.createCase(caseData);
    await loadCases();
    await loadStats();
    if (res.case?.id) {
      setSelectedCaseId(res.case.id);
      setCurrentTab('cases');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Navigation
        currentTab={currentTab}
        onTabChange={handleTabChange}
        currentUser={currentUser}
        onOpenOfficerSwitcher={() => setIsOfficerModalOpen(true)}
        isAuditChainValid={isAuditChainValid}
      />

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            loading={loadingStats}
            currentUser={currentUser}
            onNavigate={handleTabChange}
            onSelectCase={handleSelectCase}
            onOpenCreateCase={() => setIsCreateCaseModalOpen(true)}
            onVerifyAuditChain={async () => {
              await api.verifyAuditChain();
              await loadStats();
              handleTabChange('audit');
            }}
          />
        )}

        {currentTab === 'cases' && (
          selectedCaseId ? (
            <CaseDetailView
              caseId={selectedCaseId}
              currentUser={currentUser}
              onBack={() => setSelectedCaseId(null)}
              onRefreshStats={() => {
                loadStats();
                loadCases();
              }}
            />
          ) : (
            <CaseRegistryView
              cases={cases}
              loading={loadingCases}
              currentUser={currentUser}
              onSelectCase={handleSelectCase}
              onOpenCreateCase={() => setIsCreateCaseModalOpen(true)}
              onRefresh={() => {
                loadCases();
                loadStats();
              }}
            />
          )
        )}

        {currentTab === 'proceedings' && (
          <ProceedingsView
            currentUser={currentUser}
            onSelectCase={handleSelectCase}
            onRefreshStats={() => {
              loadStats();
              loadCases();
            }}
          />
        )}

        {currentTab === 'audit' && (
          <AuditLedgerView
            currentUser={currentUser}
            onRefreshStats={loadStats}
          />
        )}

        {currentTab === 'schema' && (
          <SchemaInspectorView />
        )}

        {currentTab === 'events' && (
          <EventsView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-850 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400 font-judicial-display">FEDERAL HIGH COURT OF JUSTICE</span>
          <span>• Electronic Case Filing & Certified Document Registry</span>
        </div>
        <div className="flex items-center gap-3 font-mono-code text-[11px] text-slate-500">
          <span>Node/Express Engine</span>
          <span>•</span>
          <span>PostgreSQL DDL Relational Model</span>
          <span>•</span>
          <span>SHA-256 Chained Ledger</span>
        </div>
      </footer>

      {/* Officer Switcher Modal */}
      <OfficerSwitcherModal
        isOpen={isOfficerModalOpen}
        onClose={() => setIsOfficerModalOpen(false)}
        users={allUsers}
        currentUser={currentUser}
        onSelectUser={handleSelectOfficer}
      />

      {/* Create Case Modal */}
      <CreateCaseModal
        isOpen={isCreateCaseModalOpen}
        onClose={() => setIsCreateCaseModalOpen(false)}
        onSubmit={handleCreateCase}
      />
    </div>
  );
}
