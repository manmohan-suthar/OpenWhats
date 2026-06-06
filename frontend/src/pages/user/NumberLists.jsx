import { useState, useRef, useEffect, useMemo } from 'react';
import {
  List, Plus, Upload, Copy, GitMerge, Filter, Trash2,
  Search, MoreVertical, Download, CheckSquare, X,
  FileText, Phone, Loader, AlertCircle, RefreshCw,
  Eye, ChevronLeft, ChevronRight, UserMinus, CheckCircle2,
  LayoutList, Hash, Award, BarChart2, CalendarDays, Tag,
  PhoneCall, Layers, TrendingUp, Braces, Table, AlertTriangle,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../services/api';
import { LimitExceededModal, LockedButton, parseLimitError } from '../../components/ui/LimitExceeded';

// ── CSV Parser ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 1) return { headers: [], rows: [] };

  const parseRow = (line) => {
    const result = [];
    let inQuote = false;
    let cell = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQuote) { inQuote = true; continue; }
      if (ch === '"' && inQuote) {
        if (line[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = false;
        continue;
      }
      if (ch === ',' && !inQuote) { result.push(cell.trim()); cell = ''; continue; }
      cell += ch;
    }
    result.push(cell.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
  if (headers.length === 0 || (headers.length === 1 && !headers[0])) return { headers: [], rows: [] };

  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const cells = parseRow(l);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  });

  return { headers, rows };
}

function detectNumberColumn(headers) {
  const phoneKeywords = ['phone', 'number', 'mobile', 'contact', 'cell', 'tel', 'whatsapp', 'no', 'num'];
  for (const kw of phoneKeywords) {
    const found = headers.find(h => h.toLowerCase().includes(kw));
    if (found) return found;
  }
  return headers[0];
}

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 10 && !digits.startsWith('91')) return `+91${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

// ── Demo CSV ───────────────────────────────────────────────────────────────────
const DEMO_CSV_CONTENT = `name,number,city,offer
Rahul Sharma,+919876543210,Delhi,20% OFF
Priya Singh,+919765432109,Mumbai,Free Delivery
Amit Kumar,9834567890,Bangalore,Buy 1 Get 1
Sneha Patel,+919923456789,Pune,30% OFF
Rohit Verma,+918765432190,Chennai,Flat 100 OFF`;

function downloadDemoCSV() {
  const blob = new Blob([DEMO_CSV_CONTENT], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_contacts.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── ListMenu ───────────────────────────────────────────────────────────────────
function ListMenu({ list, onDuplicate, onDelete, onFilter, onView }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="btn-ghost btn-sm p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreVertical size={14} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-dropdown z-20 py-1 animate-fade-in">
          <button
            onClick={(e) => { e.stopPropagation(); onView(list); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Eye size={13} /> View Contacts
          </button>
          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(list); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Copy size={13} /> Duplicate List
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onFilter(list); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Filter size={13} /> Filter Numbers
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleExportListCSV(list); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download size={13} /> Export CSV
          </button>
          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(list.id); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 size={13} /> Delete List
          </button>
        </div>
      )}
    </div>
  );
}

function handleExportListCSV(list) {
  let csv;
  if (list.contactData?.length && list.variables?.length) {
    csv = list.variables.join(',') + '\n' +
      list.contactData.map(row => list.variables.map(v => `"${(row[v] || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  } else {
    csv = 'phone\n' + (list.numbers || []).join('\n');
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${list?.name || 'numbers'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── analyzeIndianNumbers (for paste/manual tabs) ───────────────────────────────
function analyzeIndianNumbers(raw) {
  const lines = raw.split(/[\n,;]+/).map(n => n.trim()).filter(Boolean);
  const valid = [], fixable = [], invalid = [];
  lines.forEach(n => {
    const digits = n.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) { valid.push(n); return; }
    if (digits.length === 10 && !digits.startsWith('91')) { fixable.push({ original: n, fixed: `+91${digits}` }); return; }
    if (digits.startsWith('91') && digits.length !== 12) { invalid.push({ n, reason: `Incomplete — ${digits.length} digits (need 12)` }); return; }
    invalid.push({ n, reason: digits.length < 10 ? `Too short (${digits.length} digits)` : `Invalid format` });
  });
  return { valid, fixable, invalid, total: lines.length };
}

// ── CreateListModal ────────────────────────────────────────────────────────────
function CreateListModal({ open, onClose, onSave, saving }) {
  const [tab, setTab] = useState('csv');
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');

  // Paste tab
  const [numbers, setNumbers] = useState('');
  const [autoFix, setAutoFix] = useState(true);

  // Manual tab
  const [manualInput, setManualInput] = useState('');
  const [manualNumbers, setManualNumbers] = useState([]);

  // CSV tab
  const [csvState, setCsvState] = useState(null); // { headers, rows, numCol, validRows, invalidCount, variables, contactData }
  const [csvDrag, setCsvDrag] = useState(false);
  const [csvError, setCsvError] = useState('');
  const fileRef = useRef(null);

  const isValidIndian = (n) => { const d = n.replace(/\D/g, ''); return d.length === 12 && d.startsWith('91'); };
  const isFixable = (n) => { const d = n.replace(/\D/g, ''); return d.length === 10 && !d.startsWith('91'); };

  const addManual = () => {
    const n = manualInput.trim();
    if (!n) return;
    const digits = n.replace(/\D/g, '');
    let toAdd = null;
    if (isValidIndian(n)) toAdd = `+${digits}`;
    else if (isFixable(n)) toAdd = `+91${digits}`;
    if (toAdd && !manualNumbers.includes(toAdd)) setManualNumbers(p => [...p, toAdd]);
    setManualInput('');
  };

  const processCSVText = (text) => {
    setCsvError('');
    const { headers, rows } = parseCSV(text);
    if (!headers.length) { setCsvError('Could not parse CSV. Make sure it has a header row.'); return; }
    const numCol = detectNumberColumn(headers);
    const variables = headers; // all columns are variables

    const validRows = [];
    let invalidCount = 0;
    rows.forEach(row => {
      const phone = normalizePhone(row[numCol]);
      if (phone) {
        validRows.push({ ...row, [numCol]: phone });
      } else {
        invalidCount++;
      }
    });

    const contactData = validRows;
    const extractedNumbers = validRows.map(r => r[numCol]);

    setCsvState({ headers, rows, numCol, validRows, invalidCount, variables, contactData, extractedNumbers });
  };

  const handleCSVFileDrop = (e) => {
    e.preventDefault();
    setCsvDrag(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => processCSVText(ev.target.result);
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const pasteAnalysis = useMemo(() => numbers ? analyzeIndianNumbers(numbers) : null, [numbers]);

  const getNumbersAndData = () => {
    if (tab === 'csv' && csvState) {
      return {
        numbers: csvState.extractedNumbers,
        variables: csvState.variables,
        contactData: csvState.contactData,
      };
    }
    if (tab === 'manual') return { numbers: manualNumbers, variables: [], contactData: [] };
    if (tab === 'paste' && pasteAnalysis) {
      const nums = autoFix
        ? [...pasteAnalysis.valid, ...pasteAnalysis.fixable.map(f => f.fixed)]
        : pasteAnalysis.valid;
      return { numbers: nums, variables: [], contactData: [] };
    }
    return { numbers: [], variables: [], contactData: [] };
  };

  const handleSave = () => {
    const { numbers, variables, contactData } = getNumbersAndData();
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    onSave({ name: name || 'Untitled List', numbers, tags: tagList, variables, contactData });
  };

  const handleClose = () => {
    setName(''); setNumbers(''); setManualInput(''); setManualNumbers([]);
    setTags(''); setCsvState(null); setCsvError(''); setAutoFix(true);
    onClose();
  };

  const { numbers: finalNums } = getNumbersAndData();
  const finalCount = finalNums.length;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Number List"
      size="lg"
      footer={
        <>
          <button onClick={handleClose} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name || finalCount === 0} className="btn-primary btn-sm gap-2 disabled:opacity-50">
            {saving ? <Loader size={13} className="animate-spin" /> : <List size={13} />}
            Create List {finalCount > 0 && `(${finalCount.toLocaleString()})`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">List Name *</label>
          <input className="input" placeholder="e.g. Leads March 2026" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {[['csv', 'CSV Import'], ['manual', 'Add One by One'], ['paste', 'Paste Numbers']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${tab === v ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >{l}</button>
          ))}
        </div>

        {/* ── CSV Import Tab ── */}
        {tab === 'csv' && (
          <div className="space-y-3">
            {/* Demo CSV download */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">CSV format: must include a <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">number</code> column</p>
                <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">Other columns become variables: <span className="font-mono">{'{{name}}'}</span>, <span className="font-mono">{'{{city}}'}</span>, etc.</p>
              </div>
              <button
                onClick={downloadDemoCSV}
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 rounded-lg transition-colors ml-3"
              >
                <Download size={11} /> Demo CSV
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setCsvDrag(true); }}
              onDragLeave={() => setCsvDrag(false)}
              onDrop={handleCSVFileDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${csvDrag ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/10' : 'border-slate-300 dark:border-slate-600 hover:border-primary-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVFileDrop} />
              <Upload size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Drop CSV file here or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">name, number, city, offer … any columns you need</p>
            </div>

            {csvError && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">{csvError}</p>
              </div>
            )}

            {/* CSV preview after upload */}
            {csvState && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Table size={11} /> {csvState.rows.length} rows detected · Phone column: <span className="font-mono text-primary-600 dark:text-primary-400">"{csvState.numCol}"</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-600">{csvState.validRows.length} valid</span>
                    {csvState.invalidCount > 0 && <span className="text-[11px] text-red-500">{csvState.invalidCount} skipped</span>}
                  </div>
                </div>

                {/* Variables / columns */}
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Braces size={10} /> Detected Variables (use in campaign message)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {csvState.variables.map(v => (
                      <span key={v} className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${v === csvState.numCol ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300' : 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300'}`}>
                        {v === csvState.numCol ? `📞 ${v}` : `{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preview table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        {csvState.headers.map(h => (
                          <th key={h} className="text-left font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {csvState.validRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          {csvState.headers.map(h => (
                            <td key={h} className={`px-3 py-2 ${h === csvState.numCol ? 'font-mono text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {row[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvState.validRows.length > 5 && (
                    <p className="text-[10px] text-slate-400 text-center py-2">
                      +{(csvState.validRows.length - 5).toLocaleString()} more rows not shown
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Manual Tab ── */}
        {tab === 'manual' && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Add Numbers One by One</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="+91 98765 43210 or 9876543210"
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addManual()}
              />
              <button onClick={addManual} className="btn-primary btn-sm gap-1.5"><Plus size={13} /> Add</button>
            </div>
            {manualNumbers.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1.5 mt-2">
                {manualNumbers.map((n, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🇮🇳</span>
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{n}</span>
                    </div>
                    <button onClick={() => setManualNumbers(p => p.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-400">{manualNumbers.length} numbers added</p>
          </div>
        )}

        {/* ── Paste Tab ── */}
        {tab === 'paste' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Paste Numbers
                <span className="text-slate-400 font-normal ml-1">(one per line, comma or semicolon)</span>
              </label>
              <textarea
                className="input min-h-[130px] resize-none font-mono text-xs"
                placeholder={"+919876543210\n919876543210\n9876543210"}
                value={numbers}
                onChange={e => setNumbers(e.target.value)}
              />
            </div>

            {pasteAnalysis && pasteAnalysis.total > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Filter size={11} /> Analysis — {pasteAnalysis.total} numbers entered
                  </span>
                  <span className="text-[11px] text-slate-400">🇮🇳 Indian numbers only</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                      </span>
                      <div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Valid Indian Numbers</p>
                        <p className="text-[10px] text-slate-400">+91XXXXXXXXXX · exactly 12 digits</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">{pasteAnalysis.valid.length}</span>
                  </div>
                  {pasteAnalysis.fixable.length > 0 && (
                    <div className="px-4 py-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                            <Layers size={11} className="text-amber-600" />
                          </span>
                          <div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">10-Digit Local Numbers</p>
                            <p className="text-[10px] text-slate-400">Missing +91 — can be auto-fixed</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-amber-600">{pasteAnalysis.fixable.length}</span>
                      </div>
                      <div className="flex items-center justify-between pl-7 pr-1 py-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div>
                          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Add +91 prefix automatically</p>
                          <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70">
                            e.g. <span className="font-mono">9876543210</span> → <span className="font-mono">+919876543210</span>
                          </p>
                        </div>
                        <button
                          onClick={() => setAutoFix(v => !v)}
                          className={`relative inline-flex w-9 h-5 rounded-full transition-colors flex-shrink-0 ${autoFix ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoFix ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  )}
                  {pasteAnalysis.invalid.length > 0 && (
                    <div className="px-4 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                            <X size={11} className="text-red-500" />
                          </span>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Invalid — Will be skipped</p>
                        </div>
                        <span className="text-sm font-bold text-red-500">{pasteAnalysis.invalid.length}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="px-4 py-2.5 bg-primary-50 dark:bg-primary-900/20 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Hash size={11} className="text-primary-600" />
                    Numbers to be saved
                  </span>
                  <span className="text-sm font-bold text-primary-600">
                    {(pasteAnalysis.valid.length + (autoFix ? pasteAnalysis.fixable.length : 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tags <span className="text-slate-400">(optional)</span></label>
          <input className="input" placeholder="leads, customers, vip  (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

// ── Page size ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

function getFlag(num) {
  const code = num.replace(/\D/g, '');
  if (code.startsWith('880')) return '🇧🇩';
  if (code.startsWith('971')) return '🇦🇪';
  if (code.startsWith('92')) return '🇵🇰';
  if (code.startsWith('91')) return '🇮🇳';
  if (code.startsWith('44')) return '🇬🇧';
  if (code.startsWith('1')) return '🇺🇸';
  return '🌐';
}

// ── ViewListModal ──────────────────────────────────────────────────────────────
function ViewListModal({ open, onClose, list, onAddNumber, onRemoveNumber, saving }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState('');

  const numbers = list?.numbers || [];
  const hasContactData = list?.contactData?.length > 0 && list?.variables?.length > 0;
  const variables = list?.variables || [];
  const contactData = list?.contactData || [];

  const isValidNumber = (n) => {
    const digits = n.replace(/\D/g, '');
    const intl = n.trim().startsWith('+');
    return intl ? digits.length >= 11 && digits.length <= 15 : digits.length >= 10 && digits.length <= 15;
  };

  // Build searchable rows
  const rows = useMemo(() => {
    if (hasContactData) {
      return contactData.map((row, i) => ({ ...row, _phone: numbers[i] || row[variables[0]] || '' }));
    }
    return numbers.map(n => ({ _phone: n }));
  }, [hasContactData, contactData, numbers, variables]);

  const filtered = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  }, [rows, query]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [query]);
  useEffect(() => { if (open) { setQuery(''); setPage(1); setAddInput(''); setAddError(''); } }, [open]);

  const handleAdd = () => {
    const n = addInput.trim();
    if (!n) return;
    if (!isValidNumber(n)) { setAddError(n.startsWith('+') ? 'International number needs 11–15 digits' : 'Local number needs 10–15 digits'); return; }
    if (numbers.includes(n)) { setAddError('Number already in this list'); return; }
    setAddError('');
    onAddNumber(n);
    setAddInput('');
  };

  const handleExportCSV = () => handleExportListCSV(list);

  if (!open || !list) return null;

  // Display columns: non-phone variables first, then phone
  const numCol = variables.find(v => ['phone','number','mobile','contact','no','num','tel','whatsapp'].some(k => v.toLowerCase().includes(k))) || variables[0];
  const displayCols = hasContactData ? variables : ['_phone'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className={`w-9 h-9 rounded-xl ${list.color} flex items-center justify-center flex-shrink-0`}>
            <List size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{list.name}</p>
            <p className="text-[11px] text-slate-400">{numbers.length.toLocaleString()} contacts · Created {list.created}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Download size={12} /> Export CSV
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Variables row */}
        {hasContactData && (
          <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-violet-50/50 dark:bg-violet-900/10">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Braces size={10} /> Variables
            </p>
            <div className="flex flex-wrap gap-1.5">
              {variables.map(v => (
                <span key={v} className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${v === numCol ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300' : 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300'}`}>
                  {v === numCol ? `📞 ${v}` : `{{${v}}}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags row */}
        {list.tags?.length > 0 && (
          <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-800 flex gap-1.5 flex-wrap">
            {list.tags.map(t => (
              <span key={t} className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">{t}</span>
            ))}
          </div>
        )}

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9 py-2 text-sm w-full"
              placeholder="Search contacts…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>
          {query && (
            <p className="text-[11px] text-slate-400 mt-1.5">
              {filtered.length.toLocaleString()} result{filtered.length !== 1 ? 's' : ''} for "{query}"
            </p>
          )}
        </div>

        {/* Data table */}
        <div className="flex-1 overflow-auto">
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <Phone size={32} className="text-slate-200 dark:text-slate-700 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-slate-500">{query ? 'No contacts match your search' : 'No contacts in this list'}</p>
            </div>
          ) : (
            <table className="w-full text-sm min-w-max">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-10">#</th>
                  {hasContactData ? (
                    variables.map(v => (
                      <th key={v} className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">
                        {v === numCol ? `📞 ${v}` : v}
                      </th>
                    ))
                  ) : (
                    <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2.5">Phone Number</th>
                  )}
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {paginated.map((row, idx) => {
                  const globalIdx = (page - 1) * PAGE_SIZE + idx + 1;
                  const phone = row._phone || row[numCol] || '';
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 group transition-colors">
                      <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{globalIdx}</td>
                      {hasContactData ? (
                        variables.map(v => (
                          <td key={v} className={`px-3 py-2.5 ${v === numCol ? 'font-mono text-primary-600 dark:text-primary-400 text-sm' : 'text-xs text-slate-700 dark:text-slate-300'}`}>
                            {v === numCol ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-base leading-none">{getFlag(row[v] || '')}</span>
                                <span>{row[v]}</span>
                              </div>
                            ) : row[v]}
                          </td>
                        ))
                      ) : (
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none">{getFlag(phone)}</span>
                            <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">{phone}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-2 py-2.5 text-right">
                        <button
                          onClick={() => onRemoveNumber(phone)}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-slate-300 hover:text-red-500"
                          title="Remove"
                        >
                          <UserMinus size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={15} className="text-slate-500" />
              </button>
              <span className="text-xs text-slate-500 px-2 font-medium">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={15} className="text-slate-500" />
              </button>
            </div>
          </div>
        )}

        {/* Add number footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  className={`input flex-1 text-sm font-mono ${addError ? 'border-red-300 dark:border-red-700' : ''}`}
                  placeholder="+91 98765 43210"
                  value={addInput}
                  onChange={e => { setAddInput(e.target.value); setAddError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <button onClick={handleAdd} disabled={saving || !addInput.trim()} className="btn-primary btn-sm gap-1.5 disabled:opacity-50">
                  {saving ? <Loader size={13} className="animate-spin" /> : <Plus size={13} />}
                  Add
                </button>
              </div>
              {addError && <p className="text-[11px] text-red-500 mt-1">{addError}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MergeModal ─────────────────────────────────────────────────────────────────
function MergeModal({ open, onClose, lists, onMerge, saving }) {
  const [selected, setSelected] = useState([]);
  const [newName, setNewName] = useState('');
  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const total = lists.filter(l => selected.includes(l.id)).reduce((s, l) => s + l.count, 0);
  const handleClose = () => { setSelected([]); setNewName(''); onClose(); };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Merge Lists"
      size="sm"
      footer={
        <>
          <button onClick={handleClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            disabled={selected.length < 2 || saving}
            onClick={() => onMerge(newName, selected, total)}
            className="btn-primary btn-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader size={13} className="animate-spin" /> : <GitMerge size={13} />}
            Merge ({selected.length})
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Select 2 or more lists to merge into a new combined list.</p>
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {lists.map(l => (
            <label key={l.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selected.includes(l.id) ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
              <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
              <div className={`w-6 h-6 rounded-md ${l.color} flex-shrink-0`} />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{l.name}</p>
                <p className="text-[10px] text-slate-400">{l.count.toLocaleString()} numbers</p>
              </div>
            </label>
          ))}
        </div>
        {selected.length >= 2 && (
          <>
            <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
              Will merge ~{total.toLocaleString()} numbers (duplicates removed)
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">New List Name</label>
              <input className="input" placeholder="Merged List" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── FilterModal ────────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { label: '🇮🇳 India',      code: '+91',  digits: '91'  },
  { label: '🇵🇰 Pakistan',   code: '+92',  digits: '92'  },
  { label: '🇧🇩 Bangladesh', code: '+880', digits: '880' },
  { label: '🇦🇪 UAE',        code: '+971', digits: '971' },
  { label: '🇺🇸 USA',        code: '+1',   digits: '1'   },
  { label: '🇬🇧 UK',         code: '+44',  digits: '44'  },
];

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function FilterModal({ open, onClose, list, onFilter, saving }) {
  const [filterCode, setFilterCode]         = useState('');
  const [numberFormat, setNumberFormat]     = useState('');
  const [removeDupes, setRemoveDupes]       = useState(false);
  const [addCountryCode, setAddCountryCode] = useState('');
  const [addToMissing, setAddToMissing]     = useState(false);
  const [saveName, setSaveName]             = useState('');

  useEffect(() => { if (list) setSaveName(`Filtered — ${list.name}`); }, [list]);
  const selectedCountry = COUNTRY_CODES.find(c => c.code === addCountryCode);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Filter — ${list?.name || ''}`}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            onClick={() => onFilter({ countryCode: filterCode, numberFormat, removeDupes, addCountryCode, addToMissing, saveName })}
            disabled={saving}
            className="btn-primary btn-sm gap-2 disabled:opacity-50"
          >
            {saving ? <Loader size={13} className="animate-spin" /> : <Filter size={13} />}
            Apply Filter
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Plus size={11} className="text-primary-600" /> Add Country Code
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Prepend country code to numbers missing it</p>
          </div>
          <div className="p-3.5 space-y-3">
            <select className="input text-sm" value={addCountryCode} onChange={e => { setAddCountryCode(e.target.value); setAddToMissing(!!e.target.value); }}>
              <option value="">— Select country code —</option>
              {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
            </select>
            {addCountryCode && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Add to numbers without this code</p>
                    <p className="text-[10px] text-slate-400">Only numbers missing the prefix will be updated</p>
                  </div>
                  <Toggle value={addToMissing} onChange={setAddToMissing} />
                </div>
                {addToMissing && (
                  <div className="px-3 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                    <p className="text-[11px] text-primary-700 dark:text-primary-300 font-medium">Preview</p>
                    <p className="text-[11px] text-primary-600 dark:text-primary-400 font-mono mt-0.5">
                      <span className="text-slate-500">9876543210</span>{' → '}<span className="font-semibold">{addCountryCode}9876543210</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Numbers already starting with {selectedCountry?.digits} are kept as-is</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Filter size={11} className="text-amber-600" /> Filter by Country Code
            </p>
          </div>
          <div className="p-3.5 space-y-3">
            <select className="input text-sm" value={filterCode} onChange={e => setFilterCode(e.target.value)}>
              <option value="">All countries (no filter)</option>
              {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
            </select>
            <select className="input text-sm" value={numberFormat} onChange={e => setNumberFormat(e.target.value)}>
              <option value="">All formats</option>
              <option value="international">International only (+XX…)</option>
              <option value="local">Local format only</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Trash2 size={11} className="text-red-500" /> Cleanup
            </p>
          </div>
          <div className="p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Remove Duplicates</p>
                <p className="text-[10px] text-slate-400">Keep only unique numbers</p>
              </div>
              <Toggle value={removeDupes} onChange={setRemoveDupes} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Save result as</label>
          <input className="input text-sm" placeholder={`Filtered — ${list?.name || ''}`} value={saveName} onChange={e => setSaveName(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function NumberLists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [limitError, setLimitError] = useState(null);
  const [filterList, setFilterList] = useState(null);
  const [viewList, setViewList] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadLists(); }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getNumberLists();
      if (data.error) throw new Error(data.error);
      setLists(data.lists || []);
    } catch (err) {
      setError(err.message || 'Failed to load lists');
    } finally {
      setLoading(false);
    }
  };

  const filtered = lists.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async ({ name, numbers, tags, variables, contactData }) => {
    try {
      setSaving(true);
      const data = await api.createNumberList({ name, numbers, tags, variables, contactData });
      const limitErr = parseLimitError(data);
      if (limitErr) { setShowCreate(false); setLimitError(limitErr); return; }
      if (data.error) throw new Error(data.error);
      setLists(p => [data.list, ...p]);
      setShowCreate(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (list) => {
    try {
      const data = await api.duplicateNumberList(list.id);
      if (data.error) throw new Error(data.error);
      setLists(p => [data.list, ...p]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const data = await api.deleteNumberList(id);
      if (data.error) throw new Error(data.error);
      setLists(p => p.filter(l => l.id !== id));
      setSelectedIds(p => p.filter(x => x !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMerge = async (newName, ids) => {
    try {
      setSaving(true);
      const data = await api.mergeNumberLists({ name: newName, listIds: ids });
      if (data.error) throw new Error(data.error);
      setLists(p => [data.list, ...p]);
      setSelectedIds([]);
      setShowMerge(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFilter = async (opts) => {
    if (!filterList) return;
    try {
      setSaving(true);
      const data = await api.filterNumberList(filterList.id, opts);
      if (data.error) throw new Error(data.error);
      setLists(p => [data.list, ...p]);
      setFilterList(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNumberToList = async (num) => {
    if (!viewList) return;
    try {
      setSaving(true);
      const updatedNumbers = [...(viewList.numbers || []), num];
      const data = await api.updateNumberList(viewList.id, { numbers: updatedNumbers });
      if (data.error) throw new Error(data.error);
      setLists(p => p.map(l => l.id === data.list.id ? data.list : l));
      setViewList(data.list);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveNumberFromList = async (num) => {
    if (!viewList) return;
    try {
      setSaving(true);
      const updatedNumbers = (viewList.numbers || []).filter(n => n !== num);
      // Also remove from contactData if present
      const numCol = viewList.variables?.find(v => ['phone','number','mobile','contact','no','num','tel','whatsapp'].some(k => v.toLowerCase().includes(k)));
      const updatedContactData = numCol
        ? (viewList.contactData || []).filter(r => r[numCol] !== num)
        : viewList.contactData;
      const data = await api.updateNumberList(viewList.id, { numbers: updatedNumbers, contactData: updatedContactData });
      if (data.error) throw new Error(data.error);
      setLists(p => p.map(l => l.id === data.list.id ? data.list : l));
      setViewList(data.list);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openView = async (list) => {
    try {
      const data = await api.getNumberList(list.id);
      setViewList(data.error ? list : data.list);
    } catch {
      setViewList(list);
    }
  };

  const toggleSelect = (id) => setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const totalSelected = lists.filter(l => selectedIds.includes(l.id)).reduce((s, l) => s + l.count, 0);

  return (
    <div className="page space-y-5">
      {limitError && (
        <LimitExceededModal
          resource={limitError.resource}
          used={limitError.used}
          limit={limitError.limit}
          onClose={() => setLimitError(null)}
        />
      )}

      <PageHeader
        title="Number Lists"
        subtitle={`${lists.length} lists · ${lists.reduce((s, l) => s + l.count, 0).toLocaleString()} total numbers`}
      >
        <div className="flex items-center gap-2">
          <button onClick={loadLists} className="btn-ghost btn-sm p-2" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {selectedIds.length >= 2 && (
            <button onClick={() => setShowMerge(true)} className="btn-secondary btn-sm gap-1.5">
              <GitMerge size={14} /> Merge ({selectedIds.length})
            </button>
          )}
          {limitError ? (
            <LockedButton label="New List" onClick={() => setLimitError(limitError)} />
          ) : (
            <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
              <Plus size={15} /> New List
            </button>
          )}
        </div>
      </PageHeader>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X size={13} /></button>
        </div>
      )}

      {/* Summary cards */}
      {!loading && lists.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Lists',   value: lists.length,                                                                             icon: LayoutList,  iconBg: 'bg-blue-100 dark:bg-blue-900/30',    iconColor: 'text-blue-600',    valueColor: 'text-blue-600' },
            { label: 'Total Numbers', value: lists.reduce((s, l) => s + l.count, 0).toLocaleString(),                                 icon: Hash,        iconBg: 'bg-primary-100 dark:bg-primary-900/30', iconColor: 'text-primary-600', valueColor: 'text-primary-600' },
            { label: 'Largest List',  value: lists.length ? Math.max(...lists.map(l => l.count)).toLocaleString() : 0,                icon: Award,       iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600',  valueColor: 'text-violet-600' },
            { label: 'Avg. Size',     value: lists.length ? Math.round(lists.reduce((s, l) => s + l.count, 0) / lists.length).toLocaleString() : 0, icon: BarChart2, iconBg: 'bg-amber-100 dark:bg-amber-900/30',  iconColor: 'text-amber-600',   valueColor: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
                <s.icon size={18} className={s.iconColor} />
              </div>
              <div>
                <p className={`text-xl font-bold leading-tight ${s.valueColor}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + bulk actions */}
      {!loading && lists.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9 py-2 text-sm" placeholder="Search lists…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
              <CheckSquare size={14} className="text-primary-600" />
              <span>{selectedIds.length} selected · {totalSelected.toLocaleString()} numbers</span>
              <button onClick={() => setSelectedIds([])} className="text-slate-400 hover:text-red-500 ml-1"><X size={13} /></button>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader size={24} className="animate-spin text-primary-500" />
          <span className="ml-3 text-sm text-slate-500">Loading lists…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={List}
          title={search ? 'No lists match your search' : 'No number lists yet'}
          description={search ? 'Try a different search term.' : 'Create your first number list to start sending campaigns.'}
          action={!search && (
            limitError ? (
              <LockedButton label="Create List" onClick={() => setLimitError(limitError)} />
            ) : (
              <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
                <Plus size={14} /> Create List
              </button>
            )
          )}
        />
      )}

      {/* List grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(list => (
            <div
              key={list.id}
              onClick={() => toggleSelect(list.id)}
              className={`card p-5 group cursor-pointer transition-all ${selectedIds.includes(list.id) ? 'ring-2 ring-primary-500 border-primary-300 dark:border-primary-700' : ''}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl ${list.color} flex items-center justify-center transition-opacity ${selectedIds.includes(list.id) ? 'opacity-30' : 'group-hover:opacity-50'}`}>
                      <List size={18} className="text-white" />
                    </div>
                    {selectedIds.includes(list.id) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckSquare size={20} className="text-primary-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{list.name}</p>
                    <p className="text-[11px] text-slate-400">Created {list.created}</p>
                  </div>
                </div>
                <ListMenu list={list} onDuplicate={handleDuplicate} onDelete={handleDelete} onFilter={setFilterList} onView={openView} />
              </div>

              {/* Variables (CSV columns) */}
              {list.variables?.length > 0 && (
                <div className="flex items-start gap-1.5 mb-3">
                  <Braces size={11} className="text-violet-400 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {list.variables.slice(0, 4).map(v => {
                      const isPhone = ['phone','number','mobile','contact','no','num','tel','whatsapp'].some(k => v.toLowerCase().includes(k));
                      return (
                        <span key={v} className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${isPhone ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400' : 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400'}`}>
                          {isPhone ? v : `{{${v}}}`}
                        </span>
                      );
                    })}
                    {list.variables.length > 4 && (
                      <span className="text-[10px] text-slate-400 font-medium self-center">+{list.variables.length - 4} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {list.tags?.length > 0 && (
                <div className="flex items-center gap-1.5 mb-3">
                  <Tag size={11} className="text-slate-400 flex-shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {list.tags.map(t => (
                      <span key={t} className="badge badge-slate text-[10px]">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Count + progress */}
              <div className="mb-3">
                <div className="flex items-end justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={14} className="text-slate-400" />
                    <div>
                      <p className="text-2xl font-bold leading-tight text-slate-900 dark:text-white">{list.count.toLocaleString()}</p>
                      <p className="text-[11px] text-slate-400">{list.variables?.length > 0 ? 'contacts' : 'phone numbers'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                      <TrendingUp size={10} />
                      {lists.length > 1 ? `${Math.round((list.count / Math.max(...lists.map(l => l.count), 1)) * 100)}% of largest` : 'Only list'}
                    </p>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${list.color} rounded-full opacity-70 transition-all`}
                    style={{ width: `${Math.min((list.count / Math.max(...lists.map(l => l.count), 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Meta row + action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <CalendarDays size={11} />
                  <span>{list.created}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); openView(list); }}
                    className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 text-slate-400 transition-colors"
                    title="View Contacts"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDuplicate(list); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setFilterList(list); }}
                    className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-400 hover:text-amber-600 transition-colors"
                    title="Filter"
                  >
                    <Filter size={13} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(list.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => setShowCreate(true)}
            className="card p-5 flex flex-col items-center justify-center gap-3 border-dashed border-2 border-slate-200 dark:border-slate-700 hover:border-primary-400 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all min-h-[200px] cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 flex items-center justify-center transition-colors">
              <Plus size={22} className="text-slate-400 group-hover:text-primary-600 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-500 group-hover:text-primary-600 transition-colors">New List</p>
              <p className="text-[11px] text-slate-400 mt-0.5">CSV with variables, paste or manual</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><Upload size={10} /> CSV</span>
              <span className="flex items-center gap-1"><FileText size={10} /> Paste</span>
              <span className="flex items-center gap-1"><Plus size={10} /> Manual</span>
            </div>
          </button>
        </div>
      )}

      <CreateListModal open={showCreate} onClose={() => setShowCreate(false)} onSave={handleSave} saving={saving} />
      <MergeModal
        open={showMerge}
        onClose={() => { setShowMerge(false); setSelectedIds([]); }}
        lists={lists}
        onMerge={handleMerge}
        saving={saving}
      />
      {filterList && (
        <FilterModal
          open={!!filterList}
          onClose={() => setFilterList(null)}
          list={filterList}
          onFilter={handleFilter}
          saving={saving}
        />
      )}

      <ViewListModal
        open={!!viewList}
        onClose={() => setViewList(null)}
        list={viewList}
        onAddNumber={handleAddNumberToList}
        onRemoveNumber={handleRemoveNumberFromList}
        saving={saving}
      />
    </div>
  );
}
