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
  const [showLogForm, setShowLogForm] = useState(false)

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
      setShowLogForm(false)
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

  // Fiori Pattern: Worklist Floorplan
  // UI5 Elements emulated: ShellBar, DynamicPage, DynamicPageHeader, FilterBar, Table
  return (
    <div className="min-h-screen bg-[#f7f7f7] font-sans text-[#32363a]">
      {/* ShellBar (sap.m.ShellBar) */}
      <nav className="h-11 bg-[#354a5f] flex items-center px-4 shadow-md sticky top-0 z-50">
        <img
          src="https://www.c5mi.com/wp-content/uploads/2025/03/C5MI_Logo_Web_White.svg"
          alt="C5MI Logo"
          className="h-6 mr-4"
        />
        <div className="h-4 w-[1px] bg-slate-500 mx-2"></div>
        <span className="text-white font-semibold text-sm ml-2 tracking-wide">Blocked Work Visibility</span>
      </nav>

      {/* DynamicPage Header (sap.f.DynamicPageHeader) */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <nav className="text-[10px] uppercase font-bold text-[#6a6d70] mb-1 tracking-wider">Operations / Worklist</nav>
              <h1 className="text-2xl font-light text-[#32363a]">Blocker Worklist</h1>
            </div>
            <button
              onClick={() => setShowLogForm(!showLogForm)}
              className="bg-[#0854a0] text-white px-4 py-1.5 rounded-sm text-sm font-semibold hover:bg-[#0a6ed1] transition-colors shadow-sm"
            >
              {showLogForm ? 'Cancel' : 'Create Blocker'}
            </button>
          </div>

          <div className="flex gap-12 overflow-x-auto pb-2">
            {[
              { label: 'Total items', value: stats.total, color: 'text-[#32363a]' },
              { label: 'Currently Blocked', value: stats.blocked, color: 'text-[#bb0000]' },
              { label: 'In Progress', value: stats.in_progress, color: 'text-[#e69a00]' },
              { label: 'Resolved', value: stats.resolved, color: 'text-[#2b7d2b]' }
            ].map(stat => (
              <div key={stat.label} className="flex flex-col min-w-max">
                <span className="text-[11px] text-[#6a6d70] font-medium mb-1">{stat.label}</span>
                <span className={`text-2xl font-light ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Create Form (Dialog/Popover style) */}
        {showLogForm && (
          <div className="bg-white p-6 rounded-sm border border-slate-200 shadow-lg mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-semibold mb-4 text-[#32363a] border-b pb-2">New Blocker Information</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="title" className="block text-xs font-bold text-[#6a6d70] uppercase mb-1">Title</label>
                <input
                  type="text" id="title" required
                  className="w-full p-2 border border-[#bfbfbf] rounded-sm text-sm focus:border-[#0854a0] outline-none"
                  value={formData.title} onChange={handleInputChange}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-xs font-bold text-[#6a6d70] uppercase mb-1">Description</label>
                <textarea
                  id="description" required
                  className="w-full p-2 border border-[#bfbfbf] rounded-sm text-sm h-24 focus:border-[#0854a0] outline-none"
                  value={formData.description} onChange={handleInputChange}
                ></textarea>
              </div>
              <div>
                <label htmlFor="waiting_on" className="block text-xs font-bold text-[#6a6d70] uppercase mb-1">Waiting On</label>
                <input
                  type="text" id="waiting_on" required
                  className="w-full p-2 border border-[#bfbfbf] rounded-sm text-sm focus:border-[#0854a0] outline-none"
                  value={formData.waiting_on} onChange={handleInputChange}
                />
              </div>
              <div>
                <label htmlFor="owner" className="block text-xs font-bold text-[#6a6d70] uppercase mb-1">Internal Owner</label>
                <input
                  type="text" id="owner" required
                  className="w-full p-2 border border-[#bfbfbf] rounded-sm text-sm focus:border-[#0854a0] outline-none"
                  value={formData.owner} onChange={handleInputChange}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setShowLogForm(false)} className="px-4 py-1.5 border border-[#bfbfbf] text-[#32363a] rounded-sm text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="bg-[#0854a0] text-white px-6 py-1.5 rounded-sm text-sm font-semibold hover:bg-[#0a6ed1] transition-colors shadow-sm">Save</button>
              </div>
            </form>
          </div>
        )}

        {/* FilterBar (sap.ui.comp.filterbar.FilterBar) */}
        <div className="bg-white p-4 rounded-sm border border-slate-200 shadow-sm mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#6a6d70] uppercase">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-1 text-sm border-b border-[#bfbfbf] bg-transparent outline-none focus:border-[#0854a0]"
              >
                <option value="all">All Items</option>
                <option value="blocked">Blocked</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#6a6d70] uppercase">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-1 text-sm border-b border-[#bfbfbf] bg-transparent outline-none focus:border-[#0854a0]"
              >
                <option value="created_at_desc">Newest First</option>
                <option value="created_at_asc">Oldest First</option>
                <option value="days_blocked_desc">Duration</option>
              </select>
            </div>
          </div>
          <span className="text-xs text-[#6a6d70] italic">Showing {filteredItems.length} items</span>
        </div>

        {/* Worklist Table (sap.m.Table) */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f2f2f2] border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-bold text-[#6a6d70] uppercase tracking-wider">Blocker Details</th>
                <th className="p-4 text-xs font-bold text-[#6a6d70] uppercase tracking-wider hidden md:table-cell">Context</th>
                <th className="p-4 text-xs font-bold text-[#6a6d70] uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-[#6a6d70] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 align-top max-w-md">
                    <div className="flex items-center gap-2 mb-1">
                      {item.is_overdue && <span className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_4px_rgba(220,38,38,0.5)]" title="Overdue"></span>}
                      <h3 className="font-semibold text-[#0854a0] hover:underline cursor-pointer">{item.title}</h3>
                    </div>
                    <p className="text-sm text-[#32363a] line-clamp-2 mb-2">{item.description}</p>
                    <div className="text-[11px] text-[#6a6d70]">
                      <span className="font-medium">Created:</span> {new Date(item.created_at).toLocaleDateString()} ({item.age_display})
                    </div>
                  </td>
                  <td className="p-4 align-top hidden md:table-cell">
                    <div className="space-y-1 text-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-[#6a6d70]">Waiting On</span>
                        <span>{item.waiting_on}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-[#6a6d70]">Internal Owner</span>
                        <span>{item.owner}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    {/* ObjectStatus (sap.m.ObjectStatus) */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-bold uppercase ${
                      item.status === 'blocked' ? 'bg-[#ffebed] text-[#bb0000] border border-[#ffccd2]' :
                      item.status === 'in_progress' ? 'bg-[#fff4e5] text-[#e69a00] border border-[#ffe4bf]' :
                      'bg-[#eef7ee] text-[#2b7d2b] border border-[#d5ead5]'
                    }`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    {item.is_stale && item.status === 'blocked' && (
                      <div className="mt-1 text-[10px] text-[#e69a00] font-bold italic">Requires Update</div>
                    )}
                  </td>
                  <td className="p-4 align-top text-right">
                    <div className="flex flex-col items-end gap-2">
                      {item.status !== 'resolved' && (
                        <>
                          <div className="flex gap-1">
                            <input
                              type="text" placeholder="Add note..."
                              className="p-1 text-xs border border-[#bfbfbf] rounded-sm w-32 outline-none focus:border-[#0854a0]"
                              value={updateInputs[item.id] || ''}
                              onChange={(e) => setUpdateInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && addUpdate(item.id)}
                            />
                            <button onClick={() => addUpdate(item.id)} className="p-1 bg-slate-100 border border-[#bfbfbf] rounded-sm hover:bg-slate-200 transition-colors" title="Update">
                              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            </button>
                          </div>
                          <div className="flex gap-2">
                            {item.status === 'blocked' && (
                              <button onClick={() => updateStatus(item.id, 'in_progress')} className="text-[11px] font-bold text-[#0854a0] hover:text-[#0a6ed1]">Move to Progress</button>
                            )}
                            {item.status === 'in_progress' && (
                              <button onClick={() => updateStatus(item.id, 'blocked')} className="text-[11px] font-bold text-[#bb0000] hover:text-[#e30000]">Block Again</button>
                            )}
                            <button onClick={() => updateStatus(item.id, 'resolved')} className="text-[11px] font-bold text-[#2b7d2b] hover:text-[#359b35]">Resolve</button>
                          </div>
                        </>
                      )}
                      {item.status === 'resolved' && (
                        <span className="text-[11px] text-[#6a6d70]">Resolved on {new Date(item.resolved_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-[#6a6d70] italic bg-[#fafafa]">
                    No blockers found for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Footer / Info (sap.m.Bar) */}
      <footer className="mt-8 border-t border-slate-200 bg-white p-6 text-center text-[11px] text-[#6a6d70]">
        <p>© 2026 C5MI Insight LLC. All rights reserved. | Fiori Worklist Floorplan v1.0</p>
      </footer>
    </div>
  )
}

export default App
