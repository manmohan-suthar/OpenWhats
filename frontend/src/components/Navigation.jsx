import { Link, useNavigate } from 'react-router-dom';

export default function Navigation() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!token) return null;

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <Link to="/dashboard" style={styles.logo}>WhatsApp Campaign</Link>
        <div style={styles.links}>
          <Link to="/dashboard" style={styles.link}>Sessions</Link>
          <Link to="/campaigns" style={styles.link}>Campaigns</Link>
          <button onClick={handleLogout} style={styles.button}>Logout</button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    padding: '12px 0'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#075e54',
    textDecoration: 'none'
  },
  links: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center'
  },
  link: {
    color: '#555',
    textDecoration: 'none',
    fontSize: '14px'
  },
  button: {
    background: 'none',
    border: 'none',
    color: '#f44336',
    cursor: 'pointer',
    fontSize: '14px'
  }
};