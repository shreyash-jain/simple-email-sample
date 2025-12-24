import React, { useState, useEffect, useCallback } from 'react';
import { JsonToMjml } from 'easy-email-core';
import type { IBlockData } from 'easy-email-core';

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    subTitle: string;
    content: IBlockData;
    thumbnail?: string;
    createdAt: string;
    updatedAt: string;
}

interface TemplateDashboardProps {
    onCreateNew: () => void;
    onEditTemplate: (template: EmailTemplate) => void;
}

const TemplateDashboard: React.FC<TemplateDashboardProps> = ({
    onCreateNew,
    onEditTemplate,
}) => {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

    // Load templates from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('emailTemplates');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setTemplates(parsed);
            } catch (e) {
                console.error('Failed to parse stored templates:', e);
            }
        }
    }, []);

    // Filter templates based on search
    const filteredTemplates = templates.filter(
        (template) =>
            template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle template deletion
    const handleDeleteClick = useCallback((template: EmailTemplate, e: React.MouseEvent) => {
        e.stopPropagation();
        setTemplateToDelete(template);
        setIsDeleteModalOpen(true);
    }, []);

    const confirmDelete = useCallback(() => {
        if (templateToDelete) {
            const updated = templates.filter((t) => t.id !== templateToDelete.id);
            setTemplates(updated);
            localStorage.setItem('emailTemplates', JSON.stringify(updated));
            setIsDeleteModalOpen(false);
            setTemplateToDelete(null);
        }
    }, [templateToDelete, templates]);

    // Handle template duplication
    const handleDuplicate = useCallback(
        (template: EmailTemplate, e: React.MouseEvent) => {
            e.stopPropagation();
            const duplicated: EmailTemplate = {
                ...template,
                id: `template-${Date.now()}`,
                name: `${template.name} (Copy)`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            const updated = [...templates, duplicated];
            setTemplates(updated);
            localStorage.setItem('emailTemplates', JSON.stringify(updated));
        },
        [templates]
    );

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div>
                        <h1 style={styles.title}>📧 Email Template Builder</h1>
                        <p style={styles.subtitle}>Create and manage beautiful email templates</p>
                    </div>
                    <button style={styles.createButton} onClick={onCreateNew}>
                        ✨ Create New Template
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={styles.main}>
                {/* Search Bar */}
                <div style={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="🔍 Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                    <div style={styles.templateCount}>
                        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Templates Grid */}
                {filteredTemplates.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📭</div>
                        <h2 style={styles.emptyTitle}>
                            {templates.length === 0 ? 'No templates yet' : 'No templates found'}
                        </h2>
                        <p style={styles.emptyText}>
                            {templates.length === 0
                                ? 'Get started by creating your first email template'
                                : 'Try adjusting your search query'}
                        </p>
                        {templates.length === 0 && (
                            <button style={styles.emptyButton} onClick={onCreateNew}>
                                Create Your First Template
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={styles.templatesGrid}>
                        {filteredTemplates.map((template) => (
                            <div
                                key={template.id}
                                style={styles.templateCard}
                                onClick={() => onEditTemplate(template)}
                            >
                                {/* Thumbnail */}
                                <div style={styles.thumbnailContainer}>
                                    {template.thumbnail ? (
                                        <img
                                            src={template.thumbnail}
                                            alt={template.name}
                                            style={styles.thumbnail}
                                        />
                                    ) : (
                                        <div style={styles.placeholderThumbnail}>
                                            <span style={styles.placeholderIcon}>✉️</span>
                                        </div>
                                    )}
                                    {/* Overlay with actions */}
                                    <div style={styles.cardOverlay}>
                                        <button
                                            style={styles.overlayButton}
                                            onClick={(e) => handleDuplicate(template, e)}
                                            title="Duplicate"
                                        >
                                            📋
                                        </button>
                                        <button
                                            style={{ ...styles.overlayButton, ...styles.deleteOverlayButton }}
                                            onClick={(e) => handleDeleteClick(template, e)}
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                {/* Card Content */}
                                <div style={styles.cardContent}>
                                    <h3 style={styles.templateName}>{template.name}</h3>
                                    <p style={styles.templateSubject}>{template.subject}</p>
                                    <div style={styles.templateMeta}>
                                        <span>Updated {formatDate(template.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && templateToDelete && (
                <div style={styles.modalOverlay} onClick={() => setIsDeleteModalOpen(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Delete Template?</h3>
                        <p style={styles.modalText}>
                            Are you sure you want to delete "{templateToDelete.name}"? This action cannot be
                            undone.
                        </p>
                        <div style={styles.modalActions}>
                            <button
                                style={styles.cancelButton}
                                onClick={() => setIsDeleteModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button style={styles.deleteButton} onClick={confirmDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
    },
    header: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 0',
        color: '#fff',
    },
    headerContent: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
    },
    title: {
        margin: 0,
        fontSize: '32px',
        fontWeight: 700,
    },
    subtitle: {
        margin: '8px 0 0',
        fontSize: '16px',
        opacity: 0.9,
    },
    createButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '14px 28px',
        backgroundColor: '#fff',
        color: '#667eea',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    main: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px',
    },
    searchContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px',
    },
    searchInput: {
        flex: 1,
        minWidth: '280px',
        maxWidth: '400px',
        padding: '14px 20px',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        fontSize: '15px',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    templateCount: {
        fontSize: '14px',
        color: '#64748b',
        fontWeight: 500,
    },
    templatesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '24px',
    },
    templateCard: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid #e2e8f0',
    },
    thumbnailContainer: {
        position: 'relative',
        height: '180px',
        backgroundColor: '#f1f5f9',
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    placeholderThumbnail: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #fce7f3 100%)',
    },
    placeholderIcon: {
        fontSize: '48px',
        opacity: 0.6,
    },
    cardOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        opacity: 0,
        transition: 'opacity 0.2s',
    },
    overlayButton: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: '#fff',
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s',
    },
    deleteOverlayButton: {
        backgroundColor: '#fee2e2',
    },
    cardContent: {
        padding: '20px',
    },
    templateName: {
        margin: 0,
        fontSize: '18px',
        fontWeight: 600,
        color: '#1e293b',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    templateSubject: {
        margin: '8px 0 0',
        fontSize: '14px',
        color: '#64748b',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    templateMeta: {
        marginTop: '12px',
        fontSize: '12px',
        color: '#94a3b8',
    },
    emptyState: {
        textAlign: 'center',
        padding: '80px 20px',
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '24px',
    },
    emptyTitle: {
        margin: 0,
        fontSize: '24px',
        fontWeight: 600,
        color: '#1e293b',
    },
    emptyText: {
        margin: '12px 0 0',
        fontSize: '16px',
        color: '#64748b',
    },
    emptyButton: {
        marginTop: '32px',
        padding: '14px 32px',
        backgroundColor: '#667eea',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    },
    modalTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: 600,
        color: '#1e293b',
    },
    modalText: {
        margin: '16px 0 0',
        fontSize: '15px',
        color: '#64748b',
        lineHeight: 1.6,
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '28px',
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#f1f5f9',
        color: '#64748b',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
    },
    deleteButton: {
        padding: '10px 20px',
        backgroundColor: '#ef4444',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
    },
};

export default TemplateDashboard;
