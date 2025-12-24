import React, { useCallback, useState, useMemo } from 'react';
import { BlockManager, BasicType, JsonToMjml } from 'easy-email-core';
import type { IBlockData } from 'easy-email-core';
import { EmailEditor, EmailEditorProvider } from 'easy-email-editor';
import { SimpleLayout } from 'easy-email-extensions';
import { useForm, useFormState } from 'react-final-form';
import mjml2html from 'mjml-browser';
import type { FormApi } from 'final-form';
import AssetPicker from './AssetPicker';
import type { EmailTemplate } from './TemplateDashboard';

import 'easy-email-editor/lib/style.css';
import 'easy-email-extensions/lib/style.css';
import '@arco-themes/react-easy-email-theme/css/arco.css';

// Define the email template interface
interface IEmailTemplate {
    subject: string;
    subTitle: string;
    content: IBlockData;
}

interface EmailBuilderProps {
    template?: EmailTemplate | null;
    onBack: () => void;
    onSave: (template: EmailTemplate) => void;
}

// Merge tags configuration
const mergeTags = {
    User: {
        Name: '{{name}}',
        Email: '{{email}}',
        Phone: '{{phone}}',
        ID: '{{user_id}}',
    },
    Company: {
        'Company Name': '{{company_name}}',
        'Address': '{{company_address}}',
        'Website': '{{company_website}}',
    },
    Date: {
        'Current Date': '{{date}}',
        'Current Year': '{{year}}',
    },
};

// Inner toolbar component to access form context
const EditorToolbar: React.FC<{
    onBack: () => void;
    templateName: string;
    setTemplateName: (name: string) => void;
    onOpenAssets: () => void;
    isSaving: boolean;
}> = ({ onBack, templateName, setTemplateName, onOpenAssets, isSaving }) => {
    const form = useForm();
    const { dirty } = useFormState({ subscription: { dirty: true } });
    const [isNameEditing, setIsNameEditing] = useState(false);
    const [showMergeTags, setShowMergeTags] = useState(false);

    // Warn on tab close/refresh
    React.useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (dirty) {
                e.preventDefault();
                e.returnValue = ''; // Chrome requires this to be set
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [dirty]);

    const handleSave = () => {
        form.submit();
    };

    const handleCopyHtml = () => {
        try {
            const values = form.getState().values;
            // 1. Convert to MJML
            const mjml = JsonToMjml({
                data: values.content,
                mode: 'production',
                context: values.content,
            });

            // 2. Convert MJML to HTML
            const { html, errors } = mjml2html(mjml);

            if (errors && errors.length > 0) {
                console.warn('MJML compilation errors:', errors);
            }

            navigator.clipboard.writeText(html);
            alert('SUCCESS: Copied full HTML to clipboard!');
        } catch (e) {
            console.error('Failed to generate HTML:', e);
            alert('Failed to generate HTML. Check console for details.');
        }
    };

    const handleBack = () => {
        if (dirty) {
            if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                onBack();
            }
        } else {
            onBack();
        }
    };

    const handleMergeTagClick = (value: string) => {
        // Try to insert at cursor position
        if (document.activeElement?.getAttribute('contenteditable') === 'true' ||
            document.activeElement?.tagName === 'TEXTAREA' ||
            document.activeElement?.tagName === 'INPUT') {
            const success = document.execCommand('insertText', false, value);
            if (success) {
                setShowMergeTags(false);
                return;
            }
        }
        navigator.clipboard.writeText(value);
        alert(`Copied ${value} to clipboard! (Click inside a text block to insert directly)`);
        setShowMergeTags(false);
    };

    return (
        <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
                <button style={styles.backButton} onClick={handleBack}>
                    ← Back
                </button>
                <div style={styles.nameContainer}>
                    {isNameEditing ? (
                        <input
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            onBlur={() => setIsNameEditing(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setIsNameEditing(false)}
                            style={styles.nameInput}
                            autoFocus
                        />
                    ) : (
                        <h2 style={styles.templateTitle} onClick={() => setIsNameEditing(true)}>
                            {templateName}
                            {dirty && <span style={styles.unsavedIndicator} title="Unsaved changes">•</span>}
                            <span style={styles.editIcon}>✏️</span>
                        </h2>
                    )}
                </div>
            </div>
            <div style={styles.toolbarRight}>
                <button style={styles.secondaryButton} onClick={handleCopyHtml}>
                    {`</>`} Copy HTML
                </button>
                <div style={{ position: 'relative' }}>
                    <button
                        style={styles.secondaryButton}
                        onClick={() => setShowMergeTags(!showMergeTags)}
                    >
                        {'{ }'} Dynamic Values
                    </button>
                    {showMergeTags && (
                        <div style={styles.dropdownMenu}>
                            {Object.entries(mergeTags).map(([category, tags]) => (
                                <div key={category} style={styles.dropdownCategory}>
                                    <div style={styles.categoryTitle}>{category}</div>
                                    {Object.entries(tags).map(([label, value]) => (
                                        <div
                                            key={label}
                                            style={styles.dropdownItem}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleMergeTagClick(value)}
                                        >
                                            <span>{label}</span>
                                            <code style={styles.tagCode}>{value}</code>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button style={styles.assetButton} onClick={onOpenAssets}>
                    📁 Assets
                </button>
                <button
                    style={styles.saveButton}
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : '💾 Save Template'}
                </button>
            </div>
        </div>
    );
};

const EmailBuilder: React.FC<EmailBuilderProps> = ({ template, onBack, onSave }) => {
    const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
    const [imageResolve, setImageResolve] = useState<((url: string) => void) | null>(null);
    const [templateName, setTemplateName] = useState(template?.name || 'Untitled Template');
    const [isSaving, setIsSaving] = useState(false);

    // Initial template data
    const initialValues: IEmailTemplate = useMemo(() => {
        if (template) {
            return {
                subject: template.subject,
                subTitle: template.subTitle,
                content: template.content,
            };
        }
        return {
            subject: 'Welcome to Easy-email',
            subTitle: 'Nice to meet you!',
            content: BlockManager.getBlockByType(BasicType.PAGE)!.create({}),
        };
    }, [template]);

    // Handle form submission (save template)
    const onSubmit = useCallback(
        async (
            values: IEmailTemplate,
            _form: FormApi<IEmailTemplate, Partial<IEmailTemplate>>
        ) => {
            setIsSaving(true);
            try {
                const now = new Date().toISOString();
                const savedTemplate: EmailTemplate = {
                    id: template?.id || `template-${Date.now()}`,
                    name: templateName,
                    subject: values.subject,
                    subTitle: values.subTitle,
                    content: values.content,
                    createdAt: template?.createdAt || now,
                    updatedAt: now,
                };

                // Save to localStorage
                const stored = localStorage.getItem('emailTemplates');
                const templates: EmailTemplate[] = stored ? JSON.parse(stored) : [];

                const existingIndex = templates.findIndex((t) => t.id === savedTemplate.id);
                if (existingIndex >= 0) {
                    templates[existingIndex] = savedTemplate;
                } else {
                    templates.push(savedTemplate);
                }

                localStorage.setItem('emailTemplates', JSON.stringify(templates));

                onSave(savedTemplate);

                // Small delay to show feedback if needed
                await new Promise(resolve => setTimeout(resolve, 500));
                alert('Template saved successfully!');
            } catch (error) {
                console.error('Failed to save template:', error);
                alert('Failed to save template. Please try again.');
            } finally {
                setIsSaving(false);
            }
        },
        [template, templateName, onSave]
    );

    // Handle image upload
    const onUploadImage = useCallback(async (blob: Blob): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                // Store the uploaded image
                const stored = localStorage.getItem('uploadedAssets');
                const uploadedAssets = stored ? JSON.parse(stored) : [];
                const newAsset = {
                    id: `uploaded-${Date.now()}`,
                    name: `Uploaded Image ${uploadedAssets.length + 1}`,
                    url: base64,
                    thumbnail: base64,
                    category: 'Uploaded',
                };
                uploadedAssets.push(newAsset);
                localStorage.setItem('uploadedAssets', JSON.stringify(uploadedAssets));
                resolve(base64);
            };
            reader.readAsDataURL(blob);
        });
    }, []);

    // Open asset picker
    const openAssetPicker = useCallback(() => {
        return new Promise<string>((resolve) => {
            setImageResolve(() => resolve);
            setIsAssetPickerOpen(true);
        });
    }, []);

    // Handle asset selection
    const handleAssetSelect = useCallback(
        (imageUrl: string) => {
            if (imageResolve) {
                imageResolve(imageUrl);
                setImageResolve(null);
            }
        },
        [imageResolve]
    );

    // Close asset picker
    const handleAssetPickerClose = useCallback(() => {
        setIsAssetPickerOpen(false);
        if (imageResolve) {
            imageResolve('');
            setImageResolve(null);
        }
    }, [imageResolve]);

    const handleOpenAssets = () => {
        openAssetPicker().then((url) => {
            if (url) {
                navigator.clipboard.writeText(url);
                alert('Image URL copied to clipboard! Paste it in an image block.');
            }
        });
    };

    return (
        <>
            <EmailEditorProvider
                data={initialValues}
                height={'calc(100vh - 56px)'}
                autoComplete
                dashed={false}
                mergeTags={mergeTags}
                onSubmit={onSubmit}
                onUploadImage={onUploadImage}
            >
                {({ values: _values }) => {
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <EditorToolbar
                                onBack={onBack}
                                templateName={templateName}
                                setTemplateName={setTemplateName}
                                onOpenAssets={handleOpenAssets}
                                isSaving={isSaving}
                            />
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <SimpleLayout showSourceCode={true}>
                                    <EmailEditor />
                                </SimpleLayout>
                            </div>
                        </div>
                    );
                }}
            </EmailEditorProvider>

            {/* Asset Picker Modal */}
            <AssetPicker
                isOpen={isAssetPickerOpen}
                onClose={handleAssetPickerClose}
                onSelect={handleAssetSelect}
            />
        </>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    toolbar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        backgroundColor: '#1e293b',
        color: '#fff',
        height: '56px',
        minHeight: '56px',
        boxSizing: 'border-box',
        borderBottom: '1px solid #334155',
        position: 'relative', // Ensure it stacks correctly
        zIndex: 1000,         // Force it above editor content
        flexShrink: 0,        // Prevent shrinking
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)', // Add shadow for separation
    },
    toolbarLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    toolbarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: 'transparent',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: '8px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    nameContainer: {
        display: 'flex',
        alignItems: 'center',
    },
    templateTitle: {
        margin: 0,
        fontSize: '16px',
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    editIcon: {
        fontSize: '12px',
        opacity: 0.6,
    },
    nameInput: {
        padding: '6px 12px',
        fontSize: '16px',
        fontWeight: 500,
        border: '1px solid #667eea',
        borderRadius: '6px',
        outline: 'none',
        backgroundColor: '#fff',
        color: '#1e293b',
        minWidth: '200px',
    },
    assetButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#3b82f6',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
    },
    saveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#10b981',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    secondaryButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: '#475569',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    dropdownMenu: {
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '8px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        width: '280px',
        maxHeight: '400px',
        overflowY: 'auto',
        zIndex: 2000,
        border: '1px solid #e2e8f0',
        color: '#1e293b',
        padding: '8px 0',
    },
    dropdownCategory: {
        borderBottom: '1px solid #f1f5f9',
    },
    categoryTitle: {
        padding: '8px 16px',
        fontSize: '12px',
        fontWeight: 600,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        backgroundColor: '#f8fafc',
    },
    dropdownItem: {
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background-color 0.1s',
    },
    tagCode: {
        fontSize: '12px',
        fontFamily: 'monospace',
        backgroundColor: '#f1f5f9',
        padding: '2px 6px',
        borderRadius: '4px',
        color: '#667eea',
    },
};

export default EmailBuilder;
