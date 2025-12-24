import { useState, useCallback } from 'react';
import TemplateDashboard from './components/TemplateDashboard';
import EmailBuilder from './components/EmailBuilder';
import type { EmailTemplate } from './components/TemplateDashboard';
import './App.css';

type View = 'dashboard' | 'editor';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Handle creating a new template
  const handleCreateNew = useCallback(() => {
    setEditingTemplate(null);
    setCurrentView('editor');
  }, []);

  // Handle editing an existing template
  const handleEditTemplate = useCallback((template: EmailTemplate) => {
    setEditingTemplate(template);
    setCurrentView('editor');
  }, []);

  // Handle going back to dashboard
  const handleBack = useCallback(() => {
    setEditingTemplate(null);
    setCurrentView('dashboard');
  }, []);

  // Handle saving template
  const handleSave = useCallback((template: EmailTemplate) => {
    setEditingTemplate(template);
  }, []);

  return (
    <div className="app-container">
      {currentView === 'dashboard' ? (
        <TemplateDashboard
          onCreateNew={handleCreateNew}
          onEditTemplate={handleEditTemplate}
        />
      ) : (
        <EmailBuilder
          template={editingTemplate}
          onBack={handleBack}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default App;
