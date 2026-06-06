import { useState, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socket';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    sessionId: '',
    name: '',
    message: '',
    numbers: '',
    delaySeconds: 10
  });
  const [sendingStatus, setSendingStatus] = useState('');
  const [activeCampaign, setActiveCampaign] = useState(null);

  useEffect(() => {
    loadData();
    socketService.connect();

    socketService.on('campaign:started', (data) => {
      setActiveCampaign(data.campaignId);
      setSendingStatus('running');
    });

    socketService.on('message:sent', () => {
      setSendingStatus('processing');
    });

    socketService.on('campaign:completed', (data) => {
      setSendingStatus('completed');
      loadCampaigns();
      setActiveCampaign(null);
    });

    socketService.on('campaign:cancelled', () => {
      setSendingStatus('cancelled');
      loadCampaigns();
      setActiveCampaign(null);
    });

    return () => {
      socketService.off('campaign:started');
      socketService.off('message:sent');
      socketService.off('campaign:completed');
      socketService.off('campaign:cancelled');
    };
  }, []);

  const loadData = async () => {
    try {
      const [campaignsRes, sessionsRes] = await Promise.all([
        api.getCampaigns(),
        api.getSessions()
      ]);
      setCampaigns(Array.isArray(campaignsRes.data) ? campaignsRes.data : []);
      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    const result = await api.getCampaigns();
    setCampaigns(Array.isArray(result.data) ? result.data : []);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    
    if (!form.sessionId || !form.name || !form.message || !form.numbers) {
      return;
    }

    const numbers = form.numbers.split(/[\n,]/).map(n => n.trim()).filter(n => n);

    if (numbers.length === 0) {
      return;
    }

    setSendingStatus('creating');

    try {
      const result = await api.createCampaign(
        form.sessionId,
        form.name,
        form.message,
        numbers,
        form.delaySeconds
      );

      if (result.campaignId) {
        setSendingStatus('created');
        setShowCreateModal(false);
        loadCampaigns();
        setForm({ sessionId: '', name: '', message: '', numbers: '', delaySeconds: 10 });
      } else {
        setSendingStatus('error');
      }
    } catch (err) {
      setSendingStatus('error');
    }
  };

  const handleStartCampaign = async (campaignId) => {
    try {
      await api.startCampaign(campaignId);
    } catch (err) {
      console.error('Failed to start campaign:', err);
    }
  };

  const handleCancelCampaign = async (campaignId) => {
    try {
      await api.cancelCampaign(campaignId);
    } catch (err) {
      console.error('Failed to cancel campaign:', err);
    }
  };

  const connectedSessions = sessions.filter(s => s.status === 'connected');

  const getStatusBadge = (status) => {
    const colors = {
      draft: { bg: '#999', text: '#fff' },
      running: { bg: '#2196f3', text: '#fff' },
      completed: { bg: '#4caf50', text: '#fff' },
      cancelled: { bg: '#f44336', text: '#fff' }
    };
    const color = colors[status] || { bg: '#999', text: '#fff' };
    return (
      <span style={{ ...styles.badge, background: color.bg, color: color.text }}>
        {status}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Campaigns</h1>
        <button 
          onClick={() => setShowCreateModal(true)} 
          style={styles.primaryButton}
          disabled={connectedSessions.length === 0}
        >
          + New Campaign
        </button>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : campaigns.length === 0 ? (
        <div style={styles.empty}>
          <p>No campaigns yet. Create one to get started.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {campaigns.map(campaign => (
            <div key={campaign.campaignId} style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>{campaign.name}</h3>
                {getStatusBadge(campaign.status)}
              </div>
              <div style={styles.stats}>
                <span>Total: {campaign.totalNumbers}</span>
                <span>Sent: {campaign.sentCount}</span>
                <span>Failed: {campaign.failedCount}</span>
              </div>
              <div style={styles.cardActions}>
                {campaign.status === 'draft' && (
                  <button 
                    onClick={() => handleStartCampaign(campaign.campaignId)}
                    style={styles.actionButton}
                  >
                    Start
                  </button>
                )}
                {campaign.status === 'running' && (
                  <button 
                    onClick={() => handleCancelCampaign(campaign.campaignId)}
                    style={styles.deleteButton}
                  >
                    Cancel
                  </button>
                )}
                <button 
                  onClick={() => loadCampaigns()}
                  style={styles.refreshButton}
                >
                  Refresh
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Create Campaign</h2>
            
            <form onSubmit={handleCreateCampaign} style={styles.form}>
              <select
                value={form.sessionId}
                onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
                style={styles.input}
                required
              >
                <option value="">Select session</option>
                {connectedSessions.map(s => (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.name} ({s.phoneNumber})
                  </option>
                ))}
              </select>
              
              <input
                type="text"
                placeholder="Campaign name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                style={styles.input}
                required
              />
              
              <textarea
                placeholder="Message to send"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                style={styles.textarea}
                required
              />
              
              <textarea
                placeholder="Phone numbers (one per line or comma separated)"
                value={form.numbers}
                onChange={(e) => setForm({ ...form, numbers: e.target.value })}
                style={styles.textarea}
                required
              />
              
              <select
                value={form.delaySeconds}
                onChange={(e) => setForm({ ...form, delaySeconds: parseInt(e.target.value) })}
                style={styles.input}
              >
                <option value="5">5 seconds delay</option>
                <option value="10">10 seconds delay</option>
                <option value="15">15 seconds delay</option>
              </select>
              
              {sendingStatus === 'error' && (
                <p style={styles.error}>Failed to create campaign</p>
              )}
              
              <button type="submit" style={styles.primaryButton}>
                Create Campaign
              </button>
              <button onClick={() => {
                setShowCreateModal(false);
                setSendingStatus('');
              }} style={styles.cancelButton}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '600'
  },
  primaryButton: {
    background: '#075e54',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  cancelButton: {
    background: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    marginLeft: '10px'
  },
  loading: {
    textAlign: 'center',
    color: '#666',
    padding: '40px'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    background: '#fff',
    borderRadius: '8px'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600'
  },
  stats: {
    display: 'flex',
    gap: '20px',
    color: '#666',
    fontSize: '14px',
    marginBottom: '16px'
  },
  cardActions: {
    display: 'flex',
    gap: '10px'
  },
  actionButton: {
    background: '#4caf50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  deleteButton: {
    background: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  refreshButton: {
    background: '#f5f6f8',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    textTransform: 'capitalize'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalContent: {
    background: '#fff',
    borderRadius: '8px',
    padding: '24px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  input: {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px'
  },
  textarea: {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical'
  },
  error: {
    color: '#f44336',
    fontSize: '14px'
  }
};