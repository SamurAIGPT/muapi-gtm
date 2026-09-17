import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import WorkbooksPage from './pages/WorkbooksPage';
import EditorPage from './pages/EditorPage';
import LeadsPage from './pages/LeadsPage';
import SignalsPage from './pages/SignalsPage';
import CampaignsPage from './pages/CampaignsPage';
import AutomationsPage from './pages/AutomationsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [currentTab, setCurrentTab] = useState('workbooks');
  const [activeWorkbookId, setActiveWorkbookId] = useState(null);

  const handleOpenWorkbook = (id) => {
    setActiveWorkbookId(id);
  };

  const handleBackToWorkbooks = () => {
    setActiveWorkbookId(null);
    setCurrentTab('workbooks');
  };

  return (
    <div className="app-container">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={activeWorkbookId ? 'workbooks' : currentTab}
        setCurrentTab={(tab) => {
          setActiveWorkbookId(null);
          setCurrentTab(tab);
        }}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeWorkbookId ? (
          <EditorPage
            workbookId={activeWorkbookId}
            onBack={handleBackToWorkbooks}
          />
        ) : (
          <>
            {currentTab === 'workbooks' && (
              <WorkbooksPage onOpenWorkbook={handleOpenWorkbook} />
            )}
            {currentTab === 'leads' && <LeadsPage />}
            {currentTab === 'signals' && <SignalsPage />}
            {currentTab === 'outreach' && <CampaignsPage />}
            {currentTab === 'automations' && <AutomationsPage />}
            {currentTab === 'settings' && <SettingsPage />}
          </>
        )}
      </main>
    </div>
  );
}
