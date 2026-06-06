/**
 * CampaignWizard — 5-step campaign creation modal
 * Steps: Details → Audience → Message → Schedule → Review
 */
import { useState, useRef } from 'react';
import {
  ChevronRight, ChevronLeft, Check, Megaphone, Users, MessageSquare,
  Clock, Eye, Upload, Image, FileText, X, Plus, Paperclip,
  Calendar, Globe, Repeat, AlertTriangle, Shuffle, Timer, Send,
  Smartphone, Sun, Moon, Sliders,
} from 'lucide-react';
import Modal from './ui/Modal';

// ── Shared helpers ─────────────────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors flex-shrink-0 focus:outline-none ${on ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

const STEPS = [
  { id: 1, label: 'Details',   icon: Megaphone  },
  { id: 2, label: 'Audience',  icon: Users      },
  { id: 3, label: 'Message',   icon: MessageSquare },
  { id: 4, label: 'Schedule',  icon: Clock      },
  { id: 5, label: 'Review',    icon: Eye        },
];

const LISTS = [
  { id: 'l1', name: 'Leads Q1 2026',    count: 1240 },
  { id: 'l2', name: 'Active Customers', count: 3820 },
  { id: 'l3', name: 'Trial Users',      count: 540  },
  { id: 'l4', name: 'VIP Members',      count: 128  },
];

const SESSIONS = [
  { id: 'WA-001', name: 'Main Business',  phone: '+91 98765 43210' },
  { id: 'WA-002', name: 'Support Line',   phone: '+91 87654 32109' },
];

const TIMEZONES = [
  'Asia/Kolkata (IST)',
  'UTC',
  'Asia/Dubai (GST)',
  'America/New_York (EST)',
  'Europe/London (GMT)',
];

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── Step 1: Campaign Details ───────────────────────────────────────────────────
function StepDetails({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <Label required>Campaign Name</Label>
        <input className="input" placeholder="e.g. April Promo Blast"
          value={data.name} onChange={e => onChange('name', e.target.value)} />
      </div>
      <div>
        <Label>Description <span className="text-slate-400 font-normal">(optional)</span></Label>
        <textarea className="input resize-none" rows={2}
          placeholder="Briefly describe what this campaign is for…"
          value={data.desc} onChange={e => onChange('desc', e.target.value)} />
      </div>
      <div>
        <Label required>WhatsApp Session</Label>
        <select className="input" value={data.session} onChange={e => onChange('session', e.target.value)}>
          <option value="">— Select session —</option>
          {SESSIONS.map(s => (
            <option key={s.id} value={s.id}>{s.id} — {s.name} ({s.phone})</option>
          ))}
        </select>
      </div>
      <div>
        <Label>Campaign Type</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {[
            { value: 'promotional', label: 'Promotional', icon: Megaphone },
            { value: 'transactional', label: 'Transactional', icon: Send },
            { value: 'reminder',    label: 'Reminder',     icon: Timer },
          ].map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => onChange('type', value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors ${
                data.type === value
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Audience ───────────────────────────────────────────────────────────
function StepAudience({ data, onChange }) {
  const toggleList = (id) => {
    const cur = data.lists;
    onChange('lists', cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };
  const total = LISTS.filter(l => data.lists.includes(l.id)).reduce((s, l) => s + l.count, 0);

  return (
    <div className="space-y-4">
      <div>
        <Label required>Select Number Lists</Label>
        <div className="space-y-2">
          {LISTS.map(l => (
            <label key={l.id} onClick={() => toggleList(l.id)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                data.lists.includes(l.id)
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                data.lists.includes(l.id) ? 'bg-primary-600 border-primary-600' : 'border-slate-300 dark:border-slate-600'
              }`}>
                {data.lists.includes(l.id) && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{l.name}</p>
                <p className="text-xs text-slate-400">{l.count.toLocaleString()} numbers</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {total > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <Users size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              {total.toLocaleString()} recipients selected
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              from {data.lists.length} list{data.lists.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      <div className="pt-1">
        <Label>Deduplication</Label>
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-300">Remove duplicate numbers</p>
            <p className="text-xs text-slate-500">Ensures each recipient receives the message only once</p>
          </div>
          <Toggle on={data.dedupe} onChange={v => onChange('dedupe', v)} />
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Message ────────────────────────────────────────────────────────────
function StepMessage({ data, onChange }) {
  const fileRef = useRef(null);

  const mediaTypes = [
    { value: 'none',     label: 'Text Only',  icon: MessageSquare },
    { value: 'image',    label: 'Image',      icon: Image },
    { value: 'document', label: 'Document',   icon: FileText },
  ];

  const templates = [
    { name: 'Order Confirmation', text: 'Hello {{name}}, your order #{{order_id}} has been confirmed and will be delivered by {{date}}.' },
    { name: 'OTP',                text: 'Your OTP is {{otp}}. Valid for 10 minutes. Do not share with anyone.' },
    { name: 'Appointment',        text: 'Hi {{name}}, this is a reminder about your appointment on {{date}} at {{time}}.' },
    { name: 'Promo Offer',        text: 'Exclusive offer for you! Use code {{code}} to get {{discount}}% off. Valid till {{expiry}}.' },
  ];

  return (
    <div className="space-y-4">
      {/* Media type */}
      <div>
        <Label>Attach Media</Label>
        <div className="grid grid-cols-3 gap-2">
          {mediaTypes.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => onChange('mediaType', value)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-colors ${
                data.mediaType === value
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* File upload or gallery pick */}
      {data.mediaType !== 'none' && (
        <div className="space-y-2">
          <Label>Upload or Select from Gallery</Label>
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()}
              className="btn-secondary btn-sm flex-1 gap-2">
              <Upload size={13} /> Upload {data.mediaType === 'image' ? 'Image' : 'File'}
            </button>
            <button onClick={() => onChange('mediaFromGallery', true)}
              className="btn-secondary btn-sm flex-1 gap-2">
              <Image size={13} /> From Gallery
            </button>
          </div>
          <input ref={fileRef} type="file" className="hidden"
            accept={data.mediaType === 'image' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx'} />
          {data.mediaFile && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <Paperclip size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">{data.mediaFile}</span>
              <button onClick={() => onChange('mediaFile', '')} className="text-slate-400 hover:text-red-500"><X size={13} /></button>
            </div>
          )}
        </div>
      )}

      {/* Caption / message */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label required>Message Content</Label>
          <span className="text-[10px] text-slate-400">{data.message.length}/1000</span>
        </div>
        <textarea
          className="input resize-none min-h-[120px]"
          placeholder="Write your message here…&#10;&#10;Use {{variable}} for personalization: {{name}}, {{order_id}}, {{amount}}"
          value={data.message}
          onChange={e => onChange('message', e.target.value)}
          maxLength={1000}
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Tip: Use <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{'{{name}}'}</code> to personalize messages with data from your list.
        </p>
      </div>

      {/* Templates */}
      <div>
        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Quick Templates</p>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {templates.map((t, i) => (
            <button key={i} onClick={() => onChange('message', t.text)}
              className="w-full text-left group px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary-700 dark:group-hover:text-primary-400">{t.name}</p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Schedule ───────────────────────────────────────────────────────────
function StepSchedule({ data, onChange }) {
  const toggleDay = (d) => {
    const cur = data.days;
    onChange('days', cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]);
  };

  const sessionBlocks = [
    { value: 'morning', label: 'Morning',    icon: Sun,      time: '8 AM – 12 PM' },
    { value: 'evening', label: 'Evening',    icon: Moon,     time: '5 PM – 9 PM' },
    { value: 'custom',  label: 'Custom',     icon: Sliders,  time: 'Set manually' },
  ];

  return (
    <div className="space-y-5">
      {/* Sending Mode */}
      <div>
        <Label required>Sending Mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'instant',   label: 'Instant',   icon: Send,     desc: 'Send now' },
            { value: 'scheduled', label: 'Scheduled',  icon: Calendar, desc: 'Pick date & time' },
            { value: 'recurring', label: 'Recurring',  icon: Repeat,   desc: 'Repeat on schedule' },
          ].map(({ value, label, icon: Icon, desc }) => (
            <button key={value} onClick={() => onChange('mode', value)}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-medium transition-colors ${
                data.mode === value
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              <span className={`text-[10px] font-normal ${data.mode === value ? 'text-primary-500' : 'text-slate-400'}`}>{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date & Time (for scheduled/recurring) */}
      {data.mode !== 'instant' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Start Date</Label>
            <input type="date" className="input" value={data.startDate} onChange={e => onChange('startDate', e.target.value)} />
          </div>
          <div>
            <Label>Start Time</Label>
            <input type="time" className="input" value={data.startTime} onChange={e => onChange('startTime', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Timezone</Label>
            <select className="input" value={data.timezone} onChange={e => onChange('timezone', e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Delay between messages */}
      <div>
        <Label required>Delay Between Messages</Label>
        <div className="grid grid-cols-4 gap-2 mb-2">
          {[
            { value: '30s',    label: '30 sec' },
            { value: '1m',     label: '1 min' },
            { value: '2m',     label: '2 min' },
            { value: 'custom', label: 'Custom' },
          ].map(({ value, label }) => (
            <button key={value} onClick={() => onChange('delay', value)}
              className={`py-2 px-1 rounded-lg border text-xs font-medium transition-colors text-center ${
                data.delay === value
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >{label}</button>
          ))}
        </div>
        {data.delay === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="number" min={1} className="input w-24" placeholder="30"
              value={data.customDelay} onChange={e => onChange('customDelay', e.target.value)} />
            <select className="input flex-1" value={data.delayUnit} onChange={e => onChange('delayUnit', e.target.value)}>
              <option value="s">Seconds</option>
              <option value="m">Minutes</option>
              <option value="h">Hours</option>
            </select>
          </div>
        )}
      </div>

      {/* Random delay variation */}
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Shuffle size={14} className="text-slate-400" /> Random Delay Variation
          </p>
          <p className="text-xs text-slate-500">Add ±30% random variation to avoid spam detection</p>
        </div>
        <Toggle on={data.randomDelay} onChange={v => onChange('randomDelay', v)} />
      </div>

      {/* Day selection (recurring only) */}
      {data.mode === 'recurring' && (
        <div>
          <Label>Days to Send</Label>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map(d => (
              <button key={d} onClick={() => toggleDay(d)}
                className={`w-11 h-10 rounded-lg text-xs font-semibold border transition-colors ${
                  data.days.includes(d)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary-300 hover:text-primary-600'
                }`}
              >{d}</button>
            ))}
          </div>
        </div>
      )}

      {/* Session block */}
      <div>
        <Label>Sending Window (Session)</Label>
        <div className="grid grid-cols-3 gap-2">
          {sessionBlocks.map(({ value, label, icon: Icon, time }) => (
            <button key={value} onClick={() => onChange('sessionBlock', value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-colors ${
                data.sessionBlock === value
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
              <span className={`text-[10px] font-normal ${data.sessionBlock === value ? 'text-primary-500' : 'text-slate-400'}`}>{time}</span>
            </button>
          ))}
        </div>

        {/* Custom window */}
        {data.sessionBlock === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <Label>Window Start</Label>
              <input type="time" className="input" value={data.windowStart} onChange={e => onChange('windowStart', e.target.value)} />
            </div>
            <div>
              <Label>Window End</Label>
              <input type="time" className="input" value={data.windowEnd} onChange={e => onChange('windowEnd', e.target.value)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 5: Review ─────────────────────────────────────────────────────────────
function StepReview({ data }) {
  const selectedLists  = LISTS.filter(l => data.lists.includes(l.id));
  const totalRecips    = selectedLists.reduce((s, l) => s + l.count, 0);
  const session        = SESSIONS.find(s => s.id === data.session);
  const delayLabel     = data.delay === 'custom' ? `${data.customDelay}${data.delayUnit}` : data.delay;
  const daysLabel      = data.days.length === 7 ? 'Every day' : data.days.join(', ') || 'Not set';

  const estMinutes     = totalRecips * (data.delay === '30s' ? 0.5 : data.delay === '1m' ? 1 : data.delay === '2m' ? 2 : parseInt(data.customDelay || 1));
  const estHours       = (estMinutes / 60).toFixed(1);

  const Row = ({ label, value, highlight }) => (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 flex-shrink-0 w-32">{label}</span>
      <span className={`text-xs font-semibold text-right ${highlight ? 'text-primary-600 dark:text-primary-400' : 'text-slate-800 dark:text-slate-200'}`}>
        {value || <span className="text-slate-400 font-normal">—</span>}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
        <Check size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Ready to launch!</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">Review the settings below before sending.</p>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Campaign</p>
        <Row label="Name"       value={data.name} highlight />
        <Row label="Type"       value={data.type} />
        <Row label="Session"    value={session ? `${session.id} — ${session.name}` : ''} />
      </div>

      <div className="card p-4">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Audience</p>
        <Row label="Lists" value={selectedLists.map(l => l.name).join(', ')} />
        <Row label="Recipients" value={`${totalRecips.toLocaleString()} numbers`} highlight />
        <Row label="Deduplication" value={data.dedupe ? 'Enabled' : 'Disabled'} />
      </div>

      <div className="card p-4">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Message</p>
        <Row label="Media" value={data.mediaType === 'none' ? 'Text only' : data.mediaType} />
        <div className="py-2.5 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 mb-1">Content</p>
          <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap line-clamp-3">
            {data.message || <span className="text-slate-400 italic">No message set</span>}
          </p>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Schedule</p>
        <Row label="Mode"          value={data.mode} />
        {data.mode !== 'instant' && <Row label="Start"       value={`${data.startDate} ${data.startTime}`} />}
        {data.mode !== 'instant' && <Row label="Timezone"    value={data.timezone} />}
        <Row label="Delay"         value={delayLabel} />
        <Row label="Random Delay"  value={data.randomDelay ? 'Yes (±30%)' : 'No'} />
        {data.mode === 'recurring' && <Row label="Days"      value={daysLabel} />}
        <Row label="Time Window"   value={data.sessionBlock === 'custom' ? `${data.windowStart} – ${data.windowEnd}` : data.sessionBlock} />
        <Row label="Est. Duration" value={`~${estHours}h for all recipients`} highlight />
      </div>

      {!data.name && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">Campaign name is required before launching.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Wizard ────────────────────────────────────────────────────────────────
export default function CampaignWizard({ open, onClose, onLaunch }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    // Details
    name: '', desc: '', session: '', type: 'promotional',
    // Audience
    lists: [], dedupe: true,
    // Message
    message: '', mediaType: 'none', mediaFile: '',
    // Schedule
    mode: 'instant', startDate: '', startTime: '',
    timezone: TIMEZONES[0],
    delay: '30s', customDelay: '30', delayUnit: 's',
    randomDelay: true,
    days: ['Mon','Tue','Wed','Thu','Fri'],
    sessionBlock: 'morning',
    windowStart: '09:00', windowEnd: '18:00',
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const canNext = () => {
    if (step === 1) return !!form.name && !!form.session;
    if (step === 2) return form.lists.length > 0;
    if (step === 3) return !!form.message;
    return true;
  };

  const handleLaunch = () => {
    onLaunch(form);
    onClose();
    setStep(1);
    setForm(p => ({ ...p, name: '', desc: '', lists: [], message: '', mediaFile: '' }));
  };

  const handleClose = () => { onClose(); setStep(1); };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Campaign"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
            className="btn-secondary btn-sm gap-2 disabled:opacity-40">
            <ChevronLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-1">
            {STEPS.map(s => (
              <div key={s.id} className={`w-2 h-2 rounded-full transition-colors ${
                s.id < step ? 'bg-primary-600' : s.id === step ? 'bg-primary-400' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            ))}
          </div>
          {step < 5 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className="btn-primary btn-sm gap-2 disabled:opacity-40">
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleLaunch} disabled={!form.name}
              className="btn-primary btn-sm gap-2 disabled:opacity-40 bg-emerald-600 hover:bg-emerald-700">
              <Megaphone size={14} /> Launch Campaign
            </button>
          )}
        </div>
      }
    >
      {/* Step progress tabs */}
      <div className="flex items-center gap-1 mb-6 -mt-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <button onClick={() => done && setStep(s.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full justify-center transition-colors ${
                  active ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                  : done  ? 'text-primary-600 dark:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-400 cursor-default'
                }`}
              >
                {done
                  ? <Check size={14} className="text-primary-600" />
                  : <Icon size={14} strokeWidth={1.8} />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${step > s.id ? 'bg-primary-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="animate-fade-in">
        {step === 1 && <StepDetails   data={form} onChange={set} />}
        {step === 2 && <StepAudience  data={form} onChange={set} />}
        {step === 3 && <StepMessage   data={form} onChange={set} />}
        {step === 4 && <StepSchedule  data={form} onChange={set} />}
        {step === 5 && <StepReview    data={form} />}
      </div>
    </Modal>
  );
}
