import { useState } from "react";
import { Settings, ShieldCheck, Trash2, UserCog, UserPlus, X } from "lucide-react";
import { ROLE_OPTIONS, ROLES } from "../auth/authData.js";
import { getRoleTone } from "../auth/permissions.js";
import { Badge, Field, StatusBadge } from "./ui.jsx";

const emptyUserDraft = {
  name: "",
  username: "",
  email: "",
  password: "",
  title: "",
  department: "",
  actualRole: "",
  role: ROLES.EMPLOYEE,
  location: "",
};

export function UsersPage({
  users,
  currentUser,
  onUpdateUserRole,
  onAddUser,
  onRemoveUser,
}) {
  const isAdmin = [ROLES.ADMIN, ROLES.GM].includes(currentUser?.role);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userDraft, setUserDraft] = useState(emptyUserDraft);
  const [message, setMessage] = useState(null);
  const [pendingRemoval, setPendingRemoval] = useState(null);

  function updateDraft(key, value) {
    setUserDraft((current) => ({ ...current, [key]: value }));
  }

  function showResult(result) {
    setMessage({
      tone: result?.ok ? "success" : "error",
      text: result?.message || (result?.ok ? "Done." : "Action could not be completed."),
    });
  }

  function submitUser(event) {
    event.preventDefault();
    const result = onAddUser(userDraft);
    showResult(result);
    if (result?.ok) {
      setUserDraft(emptyUserDraft);
      setIsAddingUser(false);
    }
  }

  function changeRole(userId, role) {
    showResult(onUpdateUserRole(userId, role));
  }

  function requestRemove(user) {
    if (user.id === currentUser.id) {
      showResult({ ok: false, message: "You cannot remove the currently signed-in user." });
      return;
    }
    const remainingAdmins = users.filter((item) => item.role === ROLES.ADMIN && item.id !== user.id);
    if (user.role === ROLES.ADMIN && !remainingAdmins.length) {
      showResult({ ok: false, message: "At least one Admin account must remain." });
      return;
    }
    setPendingRemoval(user);
  }

  function confirmRemove() {
    if (!pendingRemoval) return;
    showResult(onRemoveUser(pendingRemoval.id));
    setPendingRemoval(null);
  }

  if (!isAdmin) {
    return (
      <section className="panel">
        <div className="section-title">
          <div>
            <UserCog size={20} aria-hidden="true" />
            <h2>Users & Roles</h2>
          </div>
          <p>Access restricted to Admin and GM users.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="section-title users-title-row">
        <div>
          <UserCog size={20} aria-hidden="true" />
          <h2>Users & Roles</h2>
        </div>
        <p>Admin and GM user management for employee, role-based, and monitoring GEOTECH 3D accounts.</p>
        <button className="primary-button" type="button" onClick={() => setIsAddingUser(true)}>
          <UserPlus size={17} aria-hidden="true" />
          Add User
        </button>
      </div>

      {message ? <div className={`management-message management-message-${message.tone}`}>{message.text}</div> : null}

      {isAddingUser ? (
        <div className="modal-backdrop" role="presentation">
          <form className="user-modal panel" onSubmit={submitUser}>
            <div className="modal-title-row">
              <div>
                <span className="eyebrow">Local Workspace Account</span>
                <h3>Add User</h3>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Cancel add user"
                onClick={() => {
                  setIsAddingUser(false);
                  setUserDraft(emptyUserDraft);
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="user-form-grid">
              <Field label="Full Name">
                <input value={userDraft.name} onChange={(event) => updateDraft("name", event.target.value)} required />
              </Field>
              <Field label="Username">
                <input value={userDraft.username} onChange={(event) => updateDraft("username", event.target.value)} required />
              </Field>
              <Field label="Email">
                <input type="email" value={userDraft.email} onChange={(event) => updateDraft("email", event.target.value)} required />
              </Field>
              <Field label="Password">
                <input type="password" value={userDraft.password} onChange={(event) => updateDraft("password", event.target.value)} required />
              </Field>
              <Field label="Title / Position">
                <input value={userDraft.title} onChange={(event) => updateDraft("title", event.target.value)} />
              </Field>
              <Field label="Department">
                <input value={userDraft.department} onChange={(event) => updateDraft("department", event.target.value)} />
              </Field>
              <Field label="Actual Role">
                <input value={userDraft.actualRole} onChange={(event) => updateDraft("actualRole", event.target.value)} />
              </Field>
              <Field label="System Role">
                <select value={userDraft.role} onChange={(event) => updateDraft("role", event.target.value)} required>
                  {ROLE_OPTIONS.map((role) => (
                    <option value={role} key={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location / Country">
                <input value={userDraft.location} onChange={(event) => updateDraft("location", event.target.value)} />
              </Field>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setIsAddingUser(false)}>
                Cancel
              </button>
              <button className="primary-button" type="submit">
                Save User
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {pendingRemoval ? (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal panel" role="dialog" aria-modal="true" aria-label="Confirm remove user">
            <div className="modal-title-row">
              <div>
                <span className="eyebrow">Confirm Remove</span>
                <h3>{pendingRemoval.name}</h3>
              </div>
              <button className="icon-button" type="button" aria-label="Cancel remove user" onClick={() => setPendingRemoval(null)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p>Are you sure you want to remove this user? This action cannot be undone in this local workspace.</p>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setPendingRemoval(null)}>
                Cancel
              </button>
              <button className="danger-button" type="button" onClick={confirmRemove}>
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="user-profile-grid">
        {users.map((user) => (
          <article className="user-profile-card" key={user.id}>
            <div>
              <strong>{user.name}</strong>
              <Badge tone={getRoleTone(user.role)}>{user.badge || user.role}</Badge>
            </div>
            <span>{user.title}</span>
            <small>{user.countryRegion || user.department}</small>
            <small>{user.email}</small>
            <small>{user.accessType}</small>
          </article>
        ))}
      </div>

      <div className="users-table-shell">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Account</th>
              <th>Position</th>
              <th>Actual Role</th>
              <th>Current Role</th>
              <th>Change Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                </td>
                <td>
                  <strong>{user.username}</strong>
                  <small>{user.email}</small>
                </td>
                <td>
                  <strong>{user.title}</strong>
                  <small>{user.department}</small>
                </td>
                <td>{user.actualRole}</td>
                <td>
                  <Badge tone={getRoleTone(user.role)}>{user.role}</Badge>
                </td>
                <td>
                  <select value={user.role} onChange={(event) => changeRole(user.id, event.target.value)}>
                    {ROLE_OPTIONS.map((role) => (
                      <option value={role} key={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {user.id === currentUser.id ? <small>Current session user</small> : null}
                </td>
                <td>
                  <button
                    className="delete-user-button"
                    type="button"
                    onClick={() => requestRemove(user)}
                    aria-label={`Remove ${user.name}`}
                    title={`Remove ${user.name}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SettingsPage() {
  return (
    <div className="stack">
      <section className="panel">
        <div className="section-title">
          <div>
            <Settings size={20} aria-hidden="true" />
            <h2>System Settings</h2>
          </div>
          <p>Admin-only controls reserved for production configuration.</p>
        </div>

        <div className="settings-grid">
          <div className="settings-card">
            <ShieldCheck size={22} aria-hidden="true" />
            <strong>Authentication Mode</strong>
            <span>Local employee account authentication</span>
            <StatusBadge value="Planning" />
          </div>
          <div className="settings-card">
            <ShieldCheck size={22} aria-hidden="true" />
            <strong>Session Storage</strong>
            <span>localStorage restore on refresh</span>
            <StatusBadge value="In Progress" />
          </div>
          <div className="settings-card">
            <ShieldCheck size={22} aria-hidden="true" />
            <strong>Role Policy</strong>
            <span>Admin, Manager, Employee, CEO, and monitoring access roles</span>
            <StatusBadge value="Completed" />
          </div>
        </div>
      </section>
    </div>
  );
}
