import { useEffect, useState } from 'react'
import { useAdminAuth } from '../context/AdminAuth.jsx'
import { changeAdminPassword, getAdminUsers, createAdminUser, deleteAdminUser } from '../api.js'

export default function AdminUsersPanel() {
  const { username } = useAdminAuth()
  const [users, setUsers] = useState([])
  const [loadError, setLoadError] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const [newUser, setNewUser] = useState('')
  const [newUserPw, setNewUserPw] = useState('')
  const [userMsg, setUserMsg] = useState('')
  const [userBusy, setUserBusy] = useState(false)

  const loadUsers = () => {
    getAdminUsers()
      .then((d) => { setUsers(Array.isArray(d?.rows) ? d.rows : []); setLoadError(false) })
      .catch(() => setLoadError(true))
  }

  useEffect(() => { loadUsers() }, [])

  const submitChangePassword = async (e) => {
    e.preventDefault()
    setPwBusy(true)
    setPwMsg('')
    try {
      await changeAdminPassword(currentPw, newPw)
      setPwMsg('เปลี่ยนรหัสผ่านแล้วครับ')
      setCurrentPw('')
      setNewPw('')
    } catch {
      setPwMsg('เปลี่ยนไม่สำเร็จ รหัสผ่านเดิมอาจไม่ถูกต้อง')
    } finally {
      setPwBusy(false)
    }
  }

  const submitNewUser = async (e) => {
    e.preventDefault()
    setUserBusy(true)
    setUserMsg('')
    try {
      await createAdminUser(newUser.trim(), newUserPw)
      setUserMsg('เพิ่มผู้ใช้แล้วครับ')
      setNewUser('')
      setNewUserPw('')
      loadUsers()
    } catch {
      setUserMsg('เพิ่มผู้ใช้ไม่สำเร็จ (อาจมีชื่อนี้อยู่แล้ว)')
    } finally {
      setUserBusy(false)
    }
  }

  const removeUser = async (u) => {
    if (!confirm(`ลบผู้ใช้ "${u}" ใช่ไหม?`)) return
    try {
      await deleteAdminUser(u)
      loadUsers()
    } catch {
      alert('ลบไม่สำเร็จ')
    }
  }

  return (
    <>
      <div className="settings-section">
        <div className="settings-label">เปลี่ยนรหัสผ่านของฉัน ({username})</div>
        <form className="pig-form" onSubmit={submitChangePassword}>
          <div className="pig-form-row">
            <label className="pig-form-field">
              <span>รหัสผ่านเดิม</span>
              <input
                type="password"
                className="chat-input"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
              />
            </label>
            <label className="pig-form-field">
              <span>รหัสผ่านใหม่</span>
              <input
                type="password"
                className="chat-input"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={4}
              />
            </label>
          </div>
          <div className="pig-form-actions">
            <button className="ask-btn" type="submit" disabled={pwBusy}>
              {pwBusy ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
            </button>
            {pwMsg && <span className="pig-form-msg">{pwMsg}</span>}
          </div>
        </form>
      </div>

      <div className="settings-section">
        <div className="settings-label">จัดการผู้ใช้ Admin</div>

        <form className="pig-form" onSubmit={submitNewUser}>
          <div className="pig-form-row">
            <label className="pig-form-field">
              <span>ชื่อผู้ใช้ใหม่</span>
              <input
                type="text"
                className="chat-input"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                required
              />
            </label>
            <label className="pig-form-field">
              <span>รหัสผ่าน</span>
              <input
                type="password"
                className="chat-input"
                value={newUserPw}
                onChange={(e) => setNewUserPw(e.target.value)}
                required
                minLength={4}
              />
            </label>
          </div>
          <div className="pig-form-actions">
            <button className="ask-btn" type="submit" disabled={userBusy}>
              {userBusy ? 'กำลังเพิ่ม…' : 'เพิ่มผู้ใช้'}
            </button>
            {userMsg && <span className="pig-form-msg">{userMsg}</span>}
          </div>
        </form>

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ชื่อผู้ใช้</th>
                <th>สร้างเมื่อ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="3" className="td-empty">
                    {loadError ? 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ' : 'ไม่มีผู้ใช้'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}{u.username === username ? ' (ฉัน)' : ''}</td>
                    <td>{u.created_at?.slice(0, 10) ?? '--'}</td>
                    <td>
                      {u.username !== username && (
                        <button className="pager-btn" onClick={() => removeUser(u.username)}>
                          <i className="ti ti-trash" aria-hidden="true" /> ลบ
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
