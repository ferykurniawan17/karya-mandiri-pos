'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  name: string
  role: string
  createdAt: Date
}

interface UserManagementProps {
  initialUsers: User[]
}

export default function UserManagement({ initialUsers }: UserManagementProps) {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'cashier',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Gagal membuat pengguna')
        setLoading(false)
        return
      }

      setUsers([data.user, ...users])
      setFormData({ username: '', password: '', name: '', role: 'cashier' })
      setShowForm(false)
      setLoading(false)
      router.refresh()
    } catch (err) {
      setError('Terjadi kesalahan')
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Daftar Pengguna</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          {showForm ? 'Batal' : 'Tambah Pengguna'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Tambah Pengguna Baru</h3>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                    {user.role}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

