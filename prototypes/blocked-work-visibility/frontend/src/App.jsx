import { useState, useEffect } from 'react'
import './App.css'

const API_URL = '/api/blocked'

function App() {
  const [items, setItems] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    waiting_on: '',
    owner: ''
  })
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('created_at_desc')

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const res = await fetch(API_URL)
      const data = await res.json()
      setItems(data)
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      setFormData({
        title: '',
        description: '',
        waiting_on: '',
        owner: ''
      })
      fetchItems()
    } catch (err) {
      console.error('Failed to create item:', err)
    }
  }

  const updateStatus = async (id, status) => {
    const reason = prompt(`Reason for moving to ${status.replace('_', ' ')}?`)
    if (reason === null) return

    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status, reason: reason || `Moved to ${status}` })
      })
      fetchItems()
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const addUpdate = async (id) => {
    const noteInput = document.getElementById(`note-${id}`)
    const note = noteInput.value
    if (!note) return

    try {
      await fetch(`${API_URL}/${id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      })
      noteInput.value = ''
      fetchItems()
    } catch (err) {
      console.error('Failed to add update:', err)
    }
  }

  const stats = {
    total: items.length,
    blocked: items.filter(i => i.status === 'blocked').length,
    in_progress: items.filter(i => i.status === 'in_progress').length,
    resolved: items.filter(i => i.status === 'resolved').length
  }

  let filteredItems = [...items]
  if (filterStatus !== 'all') {
    filteredItems = filteredItems.filter(i => i.status === filterStatus)
  }

  filteredItems.sort((a, b) => {
    if (sortBy === 'created_at_desc') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'created_at_asc') return new Date(a.created_at) - new Date(b.created_at)
    if (sortBy === 'days_blocked_desc') return b.days_blocked - a.days_blocked
    return 0
  })

  return (
    <div className="container">
      <header>
        <h1>Blocked Work Visibility</h1>
      </header>

      <div className="dashboard">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.blocked}</span>
          <span className="stat-label" style={{ color: 'var(--danger)' }}>Blocked</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.in_progress}</span>
          <span className="stat-label" style={{ color: 'var(--warning)' }}>In Progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.resolved}</span>
          <span className="stat-label" style={{ color: 'var(--success)' }}>Resolved</span>
        </div>
      </div>

      <div className="card">
        <h2>Log New Blocker</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              required
              placeholder="Brief title of the blocker"
              value={formData.title}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              required
              placeholder="Detailed description of what is blocked..."
              value={formData.description}
              onChange={handleInputChange}
            ></textarea>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="waiting_on">Waiting On</label>
              <input
                type="text"
                id="waiting_on"
                required
                placeholder="Person, team, or resource"
                value={formData.waiting_on}
                onChange={handleInputChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="owner">Internal Owner</label>
              <input
                type="text"
                id="owner"
                required
                placeholder="Who is tracking this?"
                value={formData.owner}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <button type="submit">Log Blocker</button>
        </form>
      </div>

      <div className="controls">
        <h2>Current Blockers</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="blocked">Blocked</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="created_at_desc">Newest First</option>
            <option value="created_at_asc">Oldest First</option>
            <option value="days_blocked_desc">Longest Blocked</option>
          </select>
        </div>
      </div>

      <div className="item-list">
        {filteredItems.map(item => (
          <div key={item.id} className={`item ${item.is_overdue ? 'overdue' : ''} ${item.is_stale ? 'stale' : ''}`}>
            <div className="item-header">
              <h3>{item.title}</h3>
              <span className={`badge status-${item.status}`}>{item.status.replace('_', ' ')}</span>
            </div>
            <div className="meta">
              <p>{item.description}</p>
            </div>
            <div className="meta">
              <span><strong>Waiting on:</strong> {item.waiting_on}</span>
              <span><strong>Owner:</strong> {item.owner}</span>
              <span><strong>Age:</strong> {item.age_display}</span>
            </div>

            {item.update_notes.length > 0 && (
              <div className="notes">
                {item.update_notes.map((n, idx) => (
                  <div key={idx} className="note">
                    <span className="note-time">{new Date(n.timestamp).toLocaleString()}</span>: {n.text}
                  </div>
                ))}
              </div>
            )}

            {item.status !== 'resolved' && (
              <div className="actions">
                <input type="text" id={`note-${item.id}`} placeholder="Add an update..." />
                <button onClick={() => addUpdate(item.id)}>Update</button>
                {item.status === 'blocked' && (
                  <button className="btn-in-progress" onClick={() => updateStatus(item.id, 'in_progress')}>In Progress</button>
                )}
                {item.status === 'in_progress' && (
                  <button className="btn-block" onClick={() => updateStatus(item.id, 'blocked')}>Block</button>
                )}
                <button className="btn-resolve" onClick={() => updateStatus(item.id, 'resolved')}>Resolve</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
