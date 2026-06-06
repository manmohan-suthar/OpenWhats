import { useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Trash2, Edit2, Copy, Eye, Clock, MessageSquare, Users, Zap, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const TEMPLATE_TYPES = [
  { id: 'message', label: 'Message Template', icon: MessageSquare, color: 'blue', description: 'Pre-written messages for campaigns' },
  { id: 'campaign', label: 'Campaign Template', icon: Zap, color: 'purple', description: 'Complete campaign setup' },
  { id: 'contact-list', label: 'Contact List', icon: Users, color: 'green', description: 'Pre-configured contact groups' },
];

export default function Templates() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState([
    {
      id: 't1',
      name: 'Welcome Message',
      type: 'message',
      description: 'Welcome template for new contacts',
      content: 'Hi! Welcome to our service. How can we help you?',
      created: new Date('2026-04-10'),
      modified: new Date('2026-04-15'),
      usage: 45,
      tags: ['welcome', 'greeting'],
    },
    {
      id: 't2',
      name: 'Promotional Campaign',
      type: 'campaign',
      description: 'Spring sale campaign template',
      content: { subject: 'Special Offer', message: 'Get 50% off on all products!' },
      created: new Date('2026-04-05'),
      modified: new Date('2026-04-16'),
      usage: 12,
      tags: ['promotion', 'sale'],
    },
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  const filtered = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                       t.description.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || t.type === filterType;
    return matchSearch && matchType;
  });

  const stats = {
    total: templates.length,
    messages: templates.filter(t => t.type === 'message').length,
    campaigns: templates.filter(t => t.type === 'campaign').length,
    totalUsage: templates.reduce((sum, t) => sum + t.usage, 0),
  };

  const handleDeleteTemplate = (id) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleDuplicateTemplate = (template) => {
    const newTemplate = {
      ...template,
      id: `t${Date.now()}`,
      name: `${template.name} (Copy)`,
      created: new Date(),
      modified: new Date(),
      usage: 0,
    };
    setTemplates(prev => [newTemplate, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Templates</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create and manage reusable templates for your campaigns</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2">
              <Plus size={18} /> Create Template
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Zap} label="Total Templates" value={stats.total} color="blue" />
          <StatCard icon={MessageSquare} label="Message Templates" value={stats.messages} color="green" />
          <StatCard icon={Zap} label="Campaign Templates" value={stats.campaigns} color="purple" />
          <StatCard icon={Clock} label="Total Usage" value={stats.totalUsage} color="orange" />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                {TEMPLATE_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {viewMode === 'grid' ? '📋' : '⊞'}
              </button>
            </div>
          </div>
        </div>

        {/* Templates Grid/List */}
        {filtered.length === 0 ? (
          <EmptyState createTemplate={() => setShowCreateModal(true)} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => setEditingTemplate(template)}
                onDuplicate={() => handleDuplicateTemplate(template)}
                onDelete={() => handleDeleteTemplate(template.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Modified</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Usage</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(template => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    onEdit={() => setEditingTemplate(template)}
                    onDuplicate={() => handleDuplicateTemplate(template)}
                    onDelete={() => handleDeleteTemplate(template.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          template={editingTemplate}
          onSave={(template) => {
            if (editingTemplate) {
              setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
            } else {
              setTemplates(prev => [{ ...template, id: `t${Date.now()}` }, ...prev]);
            }
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// Stats Card Component
function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    purple: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
    orange: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

// Template Card Component
function TemplateCard({ template, onEdit, onDuplicate, onDelete }) {
  const typeConfig = TEMPLATE_TYPES.find(t => t.id === template.type);
  const Icon = typeConfig?.icon;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {Icon && <Icon size={20} className="text-slate-600 dark:text-slate-400 flex-shrink-0" />}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">{template.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{typeConfig?.label}</p>
            </div>
          </div>
          <DropdownMenu onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">{template.description}</p>

        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {template.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-200 dark:border-slate-700 pt-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Used</p>
            <p className="font-semibold text-slate-900 dark:text-white">{template.usage}x</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Created</p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{template.created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Modified</p>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{template.modified.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template Row Component
function TemplateRow({ template, onEdit, onDuplicate, onDelete }) {
  const typeConfig = TEMPLATE_TYPES.find(t => t.id === template.type);

  return (
    <tr className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{template.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full">
          {typeConfig?.label}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
        {template.modified.toLocaleDateString()}
      </td>
      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
        {template.usage}x
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button onClick={onEdit} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Edit">
            <Edit2 size={16} className="text-slate-600 dark:text-slate-400" />
          </button>
          <button onClick={onDuplicate} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Duplicate">
            <Copy size={16} className="text-slate-600 dark:text-slate-400" />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Dropdown Menu Component
function DropdownMenu({ onEdit, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
        <MoreVertical size={16} className="text-slate-600 dark:text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10">
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={() => { onDuplicate(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
            <Copy size={14} /> Duplicate
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 border-t border-slate-200 dark:border-slate-700">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Empty State Component
function EmptyState({ createTemplate }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <MessageSquare size={32} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No templates yet</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Create your first template to get started</p>
      <button onClick={createTemplate} className="btn-primary gap-2">
        <Plus size={18} /> Create Template
      </button>
    </div>
  );
}

// Create Template Modal Component
function CreateTemplateModal({ onClose, template, onSave }) {
  const [formData, setFormData] = useState(template || {
    name: '',
    type: 'message',
    description: '',
    content: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.description.trim() || !formData.content.trim()) {
      alert('Please fill in all fields');
      return;
    }
    onSave({
      ...formData,
      created: template?.created || new Date(),
      modified: new Date(),
      usage: template?.usage || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {template ? 'Edit Template' : 'Create New Template'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Template Type</label>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATE_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    formData.type === type.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">{type.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Template Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Welcome Message"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What is this template for?"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter template content..."
              rows="6"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Tags</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag..."
                className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
              <button onClick={handleAddTag} className="btn-secondary btn-sm">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <div key={tag} className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <span className="text-sm text-slate-700 dark:text-slate-300">#{tag}</span>
                  <button onClick={() => handleRemoveTag(tag)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleSave} className="btn-primary btn-sm">
            {template ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
}
