import { useState, useEffect } from 'react';
import './App.css';

const FingerprintService = {
    captureTemplate: () => new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() > 0.1) resolve('MOCK-TEMPLATE-DATA-12345');
            else reject(new Error('Scanner error. Wipe sensor and try again.'));
        }, 2000);
    }),
    matchTemplates: (scannedTemplate, registeredTemplate) => new Promise((resolve) => {
        setTimeout(() => {
            resolve(scannedTemplate === registeredTemplate);
        }, 500);
    })
};

const DEFAULT_USERS = [
    { id: 1, username: 'admin', password: 'admin123', name: 'System Admin', role: 'Admin', fingerprintTemplate: 'MOCK-TEMPLATE-DATA-12345' },
    { id: 2, username: 'Ag', password: 'pass123', name: 'Abdulganiyu ahmad balele', role: 'NJFP', fingerprintTemplate: 'MOCK-TEMPLATE-DATA-12345' },
    { id: 3, username: 'Abdullahi murtala', password: 'pass123', name: 'Abdullahi murtala', role: 'NJFP', fingerprintTemplate: 'MOCK-TEMPLATE-DATA-12345' }
];

export default function App() {
    const [usersDb, setUsersDb] = useState(() => {
        const saved = localStorage.getItem('users_db');
        return saved ? JSON.parse(saved) : DEFAULT_USERS;
    });

    const [attendanceDb, setAttendanceDb] = useState(() => {
        const saved = localStorage.getItem('attendance_db');
        return saved ? JSON.parse(saved) : [];
    });

    const [leavesDb, setLeavesDb] = useState(() => {
        const saved = localStorage.getItem('leaves_db');
        return saved ? JSON.parse(saved) : [];
    });

    const [currentUser, setCurrentUser] = useState(null);
    const [authView, setAuthView] = useState('login'); // 'login' | 'signup'
    const [currentView, setCurrentView] = useState('dashboard');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [fpModal, setFpModal] = useState({ show: false, type: null, status: 'idle', message: '' });

    // Live Clock & Date
    const [currentTime, setCurrentTime] = useState(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Persist to local storage
    useEffect(() => { localStorage.setItem('users_db', JSON.stringify(usersDb)); }, [usersDb]);
    useEffect(() => { localStorage.setItem('attendance_db', JSON.stringify(attendanceDb)); }, [attendanceDb]);
    useEffect(() => { localStorage.setItem('leaves_db', JSON.stringify(leavesDb)); }, [leavesDb]);

    const showToastMsg = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    // --- AUTHENTICATION ---
    const handleLogin = (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        const user = usersDb.find(u => u.username === username && u.password === password);
        
        if (user) {
            setCurrentUser(user);
            setCurrentView('dashboard');
            showToastMsg(`Welcome back, ${user.name}!`);
        } else {
            showToastMsg('Invalid credentials. Try again.', 'error');
        }
    };

    const handleRegister = (e) => {
        e.preventDefault();
        const name = e.target.regName.value;
        const username = e.target.regUser.value;
        const password = e.target.regPass.value;
        const role = e.target.regRole.value;

        if (!name || !username || !password) {
            showToastMsg('Please fill all fields', 'error');
            return;
        }

        if (usersDb.find(u => u.username === username)) {
            showToastMsg('Username already taken', 'error');
            return;
        }

        setUsersDb([...usersDb, { id: Date.now(), username, password, name, role, fingerprintTemplate: 'MOCK-TEMPLATE-DATA-12345' }]);
        showToastMsg('Account created! Please Sign In.');
        setAuthView('login');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentView('dashboard');
    };

    // --- RENDER HELPERS ---
    const renderToast = () => (
        <div id="toast" className={`toast ${toast.show ? 'show' : ''}`} style={{ borderLeftColor: toast.type === 'error' ? 'var(--danger)' : 'var(--primary)' }}>
            <span>{toast.message}</span>
        </div>
    );

    const handleFingerprintScan = async (type) => {
        setFpModal({ show: true, type, status: 'scanning', message: 'Place finger on the hardware scanner...' });
        
        try {
            const scannedTemplate = await FingerprintService.captureTemplate();
            setFpModal(prev => ({ ...prev, status: 'matching', message: 'Matching template...' }));
            
            const isMatch = await FingerprintService.matchTemplates(scannedTemplate, currentUser.fingerprintTemplate);
            
            if (isMatch) {
                setFpModal(prev => ({ ...prev, status: 'success', message: 'Identity verified!' }));
                
                setTimeout(() => {
                    const record = {
                        userId: currentUser.id,
                        type,
                        date: currentTime.toLocaleDateString(),
                        time: currentTime.toLocaleTimeString(),
                        timestamp: currentTime.getTime()
                    };
                    setAttendanceDb(prev => [...prev, record]);
                    showToastMsg(`${type} Recorded Successfully`);
                    setFpModal({ show: false, type: null, status: 'idle', message: '' });
                }, 1000);
            } else {
                setFpModal(prev => ({ ...prev, status: 'error', message: 'Fingerprint mismatch. Try again.' }));
                setTimeout(() => setFpModal({ show: false, type: null, status: 'idle', message: '' }), 2000);
            }
        } catch (err) {
            setFpModal(prev => ({ ...prev, status: 'error', message: err.message }));
            setTimeout(() => setFpModal({ show: false, type: null, status: 'idle', message: '' }), 2000);
        }
    };

    const renderFingerprintModal = () => {
        if (!fpModal.show) return null;
        
        let iconColor = 'var(--primary)';
        if (fpModal.status === 'success') iconColor = '#10b981';
        if (fpModal.status === 'error') iconColor = '#ef4444';

        return (
            <div className={`modal-overlay ${fpModal.show ? 'show' : ''}`}>
                <div className="modal-content">
                    <div className={`fingerprint-icon ${fpModal.status === 'scanning' ? 'scanning' : ''}`} style={{ color: iconColor }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12Z" strokeDasharray="2 4"/><path d="M9 8C9 8 10.5 7 12 7C13.5 7 15 8 15 8" /><path d="M8 11C8 11 10 9.5 12 9.5C14 9.5 16 11 16 11" /><path d="M7.5 14C7.5 14 9.5 12 12 12C14.5 12 16.5 14 16.5 14" /><path d="M8 17C8 17 10 15 12 15C14 15 16 17 16 17" /></svg>
                    </div>
                    <h3 className="modal-title">{fpModal.type} Authentication</h3>
                    <p className="modal-text">{fpModal.message}</p>
                    <button className="btn btn-secondary mt-4" onClick={() => setFpModal({ show: false, type: null, status: 'idle', message: '' })}>Cancel</button>
                </div>
            </div>
        );
    };

    const renderAuthPage = () => (
        <div id="authPage" className="login-wrapper">
            {authView === 'login' ? (
                <div className="auth-card">
                    <div className="brand-logo">
                        <img src="/lumilab.png" alt="Lumilab Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                        LUMILAB
                    </div>
                    <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600 }}>Sign In</h3>
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>Username</label>
                            <input type="text" name="username" placeholder="username" required />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" name="password" placeholder="••••••••" required />
                        </div>
                        <button type="submit" className="btn btn-primary">Sign In</button>
                    </form>
                    <div className="auth-switch">
                        Don't have an account? <span onClick={() => setAuthView('signup')}>Sign Up</span>
                    </div>
                </div>
            ) : (
                <div className="auth-card">
                    <div className="brand-logo">
                        <img src="/lumilab.png" alt="Lumilab Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                        LUMILAB
                    </div>
                    <h3 style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600 }}>Create Account</h3>
                    <form onSubmit={handleRegister}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" name="regName" placeholder="Full name" required />
                        </div>
                        <div className="form-group">
                            <label>Username</label>
                            <input type="text" name="regUser" placeholder="Username" required />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <input type="password" name="regPass" placeholder="••••••••" required />
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <select name="regRole">
                                <option value="NJFP">NJFP</option>
                                <option value="Employee">Employee</option>
                                <option value="Intern">Intern</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary">Create Account</button>
                    </form>
                    <div className="auth-switch">
                        Already have an account? <span onClick={() => setAuthView('login')}>Sign In</span>
                    </div>
                </div>
            )}
        </div>
    );

    // --- MAIN APP SECTIONS ---
    const renderDashboard = () => {
        const myAttendance = attendanceDb.filter(a => a.userId === currentUser.id);
        const uniqueDates = [...new Set(myAttendance.map(a => a.date))];
        const presentDays = uniqueDates.length;
        const approvedLeaves = leavesDb.filter(l => l.userId === currentUser.id && l.status === 'Approved').length;
        const recent = [...myAttendance].reverse().slice(0, 5);

        return (
            <div className="view-section">
                <div className="header">
                    <h2>Dashboard</h2>
                    <p>Welcome back, here's your activity overview.</p>
                </div>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-header">
                            <div>
                                <div className="stat-value">{presentDays}</div>
                                <div className="stat-label">Total Days</div>
                            </div>
                            <div className="stat-icon">📅</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-header">
                            <div>
                                <div className="stat-value" style={{ color: '#34d399' }}>{presentDays}</div>
                                <div className="stat-label">Present</div>
                            </div>
                            <div className="stat-icon" style={{ color: '#34d399', background: 'rgba(16, 185, 129, 0.1)' }}>✅</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-header">
                            <div>
                                <div className="stat-value" style={{ color: '#fbbf24' }}>{15 - approvedLeaves}</div>
                                <div className="stat-label">Leave Balance</div>
                            </div>
                            <div className="stat-icon" style={{ color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)' }}>🏖️</div>
                        </div>
                    </div>
                </div>

                <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Recent Activity</h3>
                <div className="table-container mt-4">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No records found</td></tr>
                            ) : (
                                recent.map((r, idx) => (
                                    <tr key={idx}>
                                        <td>{r.date}</td>
                                        <td>{r.type}</td>
                                        <td>{r.time}</td>
                                        <td><span className="badge badge-success">Recorded</span></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderAttendance = () => {
        const todayLogs = attendanceDb.filter(a => a.userId === currentUser.id && a.date === currentTime.toLocaleDateString());

        const markAttendance = (type) => {
            handleFingerprintScan(type);
        };

        return (
            <div className="view-section">
                <div className="header">
                    <h2>Mark Attendance</h2>
                    <p>Record your daily check-ins and check-outs.</p>
                </div>
                <div className="action-card">
                    <div className="clock">{currentTime.toLocaleTimeString()}</div>
                    <div className="date">{currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div className="flex" style={{ gap: '1.5rem', justifyContent: 'center' }}>
                        <button className="btn" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', minWidth: '160px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }} onClick={() => markAttendance('Check In')}>Check In</button>
                        <button className="btn" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', minWidth: '160px', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }} onClick={() => markAttendance('Check Out')}>Check Out</button>
                    </div>
                </div>

                <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Today's Logs</h3>
                <div className="table-container mt-4">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Action</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {todayLogs.length === 0 ? (
                                <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No records for today</td></tr>
                            ) : (
                                todayLogs.map((l, i) => (
                                    <tr key={i}>
                                        <td>{l.time}</td>
                                        <td>{l.type}</td>
                                        <td><span className="badge badge-neutral">Logged</span></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderLeaves = () => {
        const myLeaves = leavesDb.filter(l => l.userId === currentUser.id);

        const submitLeave = (e) => {
            e.preventDefault();
            const leaveRequest = {
                id: Date.now(),
                userId: currentUser.id,
                type: e.target.leaveType.value,
                start: e.target.startDate.value,
                end: e.target.endDate.value,
                reason: e.target.leaveReason.value,
                status: 'Pending'
            };
            setLeavesDb([...leavesDb, leaveRequest]);
            showToastMsg('Leave Request Submitted');
            e.target.reset();
        };

        const cancelLeave = (id) => {
            setLeavesDb(leavesDb.filter(l => l.id !== id));
            showToastMsg('Leave request cancelled');
        };

        return (
            <div className="view-section">
                <div className="header">
                    <h2>Leave Management</h2>
                    <p>Apply for new leaves or manage existing requests.</p>
                </div>
                <div className="glass-panel">
                    <form onSubmit={submitLeave}>
                        <div className="flex" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group w-full" style={{ marginBottom: 0 }}>
                                <label>Leave Type</label>
                                <select name="leaveType" required>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Annual Leave">Annual Leave</option>
                                </select>
                            </div>
                            <div className="form-group w-full" style={{ marginBottom: 0 }}>
                                <label>Start Date</label>
                                <input type="date" name="startDate" required />
                            </div>
                            <div className="form-group w-full" style={{ marginBottom: 0 }}>
                                <label>End Date</label>
                                <input type="date" name="endDate" required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Reason</label>
                            <textarea name="leaveReason" rows="3" required placeholder="Describe your reason..."></textarea>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Submit Request</button>
                    </form>
                </div>

                <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>My Leave History</h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Dates</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {myLeaves.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No leave requests found</td></tr>
                            ) : (
                                myLeaves.map(l => {
                                    let statusClass = 'badge-neutral';
                                    if (l.status === 'Approved') statusClass = 'badge-success';
                                    if (l.status === 'Rejected') statusClass = 'badge-danger';
                                    if (l.status === 'Pending') statusClass = 'badge-warning';

                                    return (
                                        <tr key={l.id}>
                                            <td>{l.type}</td>
                                            <td>{l.start} to {l.end}</td>
                                            <td>{l.reason}</td>
                                            <td><span className={`badge ${statusClass}`}>{l.status}</span></td>
                                            <td>
                                                {l.status === 'Pending' ? (
                                                    <button onClick={() => cancelLeave(l.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderReports = () => {
        const myAttendance = attendanceDb.filter(a => a.userId === currentUser.id);
        const grouped = {};
        myAttendance.forEach(a => {
            if (!grouped[a.date]) grouped[a.date] = { checkIns: [], checkOuts: [] };
            if (a.type === 'Check In') grouped[a.date].checkIns.push(a.time);
            else grouped[a.date].checkOuts.push(a.time);
        });

        return (
            <div className="view-section">
                <div className="header">
                    <h2>Reports</h2>
                    <p>View monthly attendance summaries.</p>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>First Check In</th>
                                <th>Last Check Out</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(grouped).length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No reports available</td></tr>
                            ) : (
                                Object.keys(grouped).map(date => {
                                    const day = grouped[date];
                                    const firstIn = day.checkIns.length > 0 ? day.checkIns[0] : '-';
                                    const lastOut = day.checkOuts.length > 0 ? day.checkOuts[day.checkOuts.length - 1] : '-';
                                    return (
                                        <tr key={date}>
                                            <td>{date}</td>
                                            <td>{firstIn}</td>
                                            <td>{lastOut}</td>
                                            <td><span className="badge badge-success">Present</span></td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderAdmin = () => {
        if (currentUser.role !== 'Admin') return null;

        const sortedActivities = [...attendanceDb].sort((a, b) => b.timestamp - a.timestamp);
        const sortedLeaves = [...leavesDb].sort((a, b) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return b.id - a.id;
        });

        const processLeave = (id, status) => {
            setLeavesDb(leavesDb.map(l => l.id === id ? { ...l, status } : l));
            showToastMsg(`Leave request ${status}`);
        };

        return (
            <div className="view-section">
                <div className="header">
                    <h2>Admin Panel</h2>
                    <p>Overview of organization activities and requests.</p>
                </div>

                <h3 className="mb-4" style={{ fontWeight: 600 }}>Manage Leave Requests</h3>
                <div className="table-container mb-4">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Leave Details</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedLeaves.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No leave requests found</td></tr>
                            ) : (
                                sortedLeaves.map(leave => {
                                    const user = usersDb.find(u => u.id === leave.userId);
                                    let statusClass = 'badge-neutral';
                                    if(leave.status === 'Approved') statusClass = 'badge-success';
                                    if(leave.status === 'Rejected') statusClass = 'badge-danger';
                                    if(leave.status === 'Pending') statusClass = 'badge-warning';

                                    return (
                                        <tr key={leave.id}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user ? user.name : 'Unknown'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {leave.userId}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{leave.type}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{leave.start} to {leave.end}</div>
                                            </td>
                                            <td>{leave.reason}</td>
                                            <td><span className={`badge ${statusClass}`}>{leave.status}</span></td>
                                            <td>
                                                {leave.status === 'Pending' ? (
                                                    <div className="flex" style={{ gap: '10px' }}>
                                                        <button className="badge badge-success" style={{ border: 'none', cursor: 'pointer' }} onClick={() => processLeave(leave.id, 'Approved')}>Accept</button>
                                                        <button className="badge badge-danger" style={{ border: 'none', cursor: 'pointer' }} onClick={() => processLeave(leave.id, 'Rejected')}>Reject</button>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <h3 className="mb-4 mt-4" style={{ fontWeight: 600 }}>Employee Activity Logs</h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Role</th>
                                <th>Date</th>
                                <th>Action</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedActivities.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No activities found</td></tr>
                            ) : (
                                sortedActivities.map((act, i) => {
                                    const user = usersDb.find(u => u.id === act.userId);
                                    return (
                                        <tr key={i}>
                                            <td><div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user ? user.name : 'Unknown'}</div></td>
                                            <td><span className="badge badge-neutral">{user ? user.role : '-'}</span></td>
                                            <td>{act.date}</td>
                                            <td><span className={`badge ${act.type === 'Check In' ? 'badge-primary' : 'badge-warning'}`}>{act.type}</span></td>
                                            <td>{act.time}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderToast()}
            {renderFingerprintModal()}
            {!currentUser ? (
                renderAuthPage()
            ) : (
                <div id="appContainer" className="app-container">
                    <aside className="sidebar">
                        <div className="brand-logo" style={{ flexDirection: 'row', justifyContent: 'flex-start', fontSize: '1.2rem', gap: '15px' }}>
                            <img src="/lumilab.png" alt="Lumilab Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                            <span>LUMILAB</span>
                        </div>
                        <ul className="nav-menu">
                            <li className="nav-item">
                                <a href="#" className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('dashboard'); }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                    Dashboard
                                </a>
                            </li>
                            <li className="nav-item">
                                <a href="#" className={`nav-link ${currentView === 'attendance' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('attendance'); }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    Attendance
                                </a>
                            </li>
                            <li className="nav-item">
                                <a href="#" className={`nav-link ${currentView === 'leaves' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('leaves'); }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                    Leaves
                                </a>
                            </li>
                            <li className="nav-item">
                                <a href="#" className={`nav-link ${currentView === 'reports' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('reports'); }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                                    Reports
                                </a>
                            </li>
                            {currentUser.role === 'Admin' && (
                                <li className="nav-item">
                                    <a href="#" className={`nav-link ${currentView === 'admin' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('admin'); }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                        Admin Panel
                                    </a>
                                </li>
                            )}
                        </ul>
                        <div className="user-profile">
                            <div className="avatar">{currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{currentUser.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser.role}</div>
                            </div>
                            <button className="btn" style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', color: '#ef4444' }} onClick={handleLogout} title="Logout">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            </button>
                        </div>
                    </aside>
                    <main className="main-content">
                        {currentView === 'dashboard' && renderDashboard()}
                        {currentView === 'attendance' && renderAttendance()}
                        {currentView === 'leaves' && renderLeaves()}
                        {currentView === 'reports' && renderReports()}
                        {currentView === 'admin' && renderAdmin()}
                    </main>
                </div>
            )}
        </>
    );
}