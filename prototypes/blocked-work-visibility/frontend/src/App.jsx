import { useState, useEffect } from 'react'

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
  const [updateInputs, setUpdateInputs] = useState({})

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
    const note = updateInputs[id]
    if (!note) return

    try {
      await fetch(`${API_URL}/${id}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      })
      setUpdateInputs(prev => ({ ...prev, [id]: '' }))
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
    <div className="max-w-4xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Blocked Work Visibility</h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-600' },
          { label: 'Blocked', value: stats.blocked, color: 'text-red-600' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-amber-600' },
          { label: 'Resolved', value: stats.resolved, color: 'text-emerald-600' }
        ].map(stat => (
          <div key={stat.label} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-center">
            <span className={`block text-3xl font-bold ${stat.color}`}>{stat.value}</span>
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-4">Log New Blocker</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold mb-1">Title</label>
            <input
              type="text"
              id="title"
              required
              placeholder="Brief title of the blocker"
              className="w-full p-2 border border-slate-300 rounded-md"
              value={formData.title}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-semibold mb-1">Description</label>
            <textarea
              id="description"
              required
              placeholder="Detailed description of what is blocked..."
              className="w-full p-2 border border-slate-300 rounded-md h-24"
              value={formData.description}
              onChange={handleInputChange}
            ></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="waiting_on" className="block text-sm font-semibold mb-1">Waiting On</label>
              <input
                type="text"
                id="waiting_on"
                required
                placeholder="Person, team, or resource"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={formData.waiting_on}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label htmlFor="owner" className="block text-sm font-semibold mb-1">Internal Owner</label>
              <input
                type="text"
                id="owner"
                required
                placeholder="Who is tracking this?"
                className="w-full p-2 border border-slate-300 rounded-md"
                value={formData.owner}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-700 transition-colors">
            Log Blocker
          </button>
        </form>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Current Blockers</h2>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-1 border border-slate-300 rounded bg-white text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="blocked">Blocked</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-1 border border-slate-300 rounded bg-white text-sm"
          >
            <option value="created_at_desc">Newest First</option>
            <option value="created_at_asc">Oldest First</option>
            <option value="days_blocked_desc">Longest Blocked</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredItems.map(item => (
          <div
            key={item.id}
            className={`bg-white p-4 rounded-lg border-l-4 shadow-sm border ${item.is_overdue ? 'border-l-red-500' : item.is_stale ? 'border-l-amber-500' : 'border-l-slate-200'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                item.status === 'blocked' ? 'bg-red-100 text-red-700' :
                item.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {item.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-700 mb-4">{item.description}</p>
            <div className="flex gap-4 text-[11px] text-slate-500 mb-4">
              <span><strong>Waiting on:</strong> {item.waiting_on}</span>
              <span><strong>Owner:</strong> {item.owner}</span>
              <span><strong>Age:</strong> {item.age_display}</span>
            </div>

            {item.update_notes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed border-slate-200 space-y-2">
                {item.update_notes.map((n, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="text-slate-400">{new Date(n.timestamp).toLocaleString()}</span>: {n.text}
                  </div>
                ))}
              </div>
            )}

            {item.status !== 'resolved' && (
              <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Add an update..."
                  className="flex-1 p-1.5 border border-slate-300 rounded text-sm"
                  value={updateInputs[item.id] || ''}
                  onChange={(e) => setUpdateInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addUpdate(item.id)
                    }
                  }}
                />
                <button
                  onClick={() => addUpdate(item.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"
                >
                  Update
                </button>
                {item.status === 'blocked' && (
                  <button onClick={() => updateStatus(item.id, 'in_progress')} className="px-3 py-1 bg-amber-500 text-white rounded text-xs font-bold hover:bg-amber-600">In Progress</button>
                )}
                {item.status === 'in_progress' && (
                  <button onClick={() => updateStatus(item.id, 'blocked')} className="px-3 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600">Block</button>
                )}
                <button onClick={() => updateStatus(item.id, 'resolved')} className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700">Resolve</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
