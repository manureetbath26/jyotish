"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count: { charts: number };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("user");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated" && session?.user?.role !== "admin") router.push("/");
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Forbidden");
      setUsers(await res.json());
    } catch {
      setError("You do not have permission to access this page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchUsers();
    }
  }, [status, session]);

  const openAddModal = () => {
    setEditUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("user");
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (user: UserRow) => {
    setEditUser(user);
    setFormName(user.name || "");
    setFormEmail(user.email);
    setFormPassword("");
    setFormRole(user.role);
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      if (editUser) {
        // Update existing user
        const body: Record<string, string> = { id: editUser.id, name: formName, email: formEmail, role: formRole };
        if (formPassword) body.password = formPassword;
        const res = await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Update failed");
        }
      } else {
        // Create new user
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName, email: formEmail, password: formPassword, role: formRole }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Creation failed");
        }
      }
      setShowModal(false);
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (user: UserRow) => {
    if (!confirm(`Delete user "${user.email}"? This will also delete all their saved charts.`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Delete failed");
        return;
      }
      await fetchUsers();
    } catch {
      alert("Failed to delete user");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Admin — User Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            {users.length} registered {users.length === 1 ? "user" : "users"}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
        >
          + Add User
        </button>
      </div>

      {/* Users table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Charts</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-200">{user.name || "—"}</td>
                  <td className="px-4 py-3 text-slate-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      user.role === "admin"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-slate-700/50 text-slate-400 border border-slate-700"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{user._count.charts}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
                      >
                        Edit
                      </button>
                      {user.id !== session?.user?.id && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-amber-400">
                {editUser ? "Edit User" : "Add User"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                &#10005;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  required
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Password {editUser && <span className="normal-case text-slate-600">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  {...(!editUser ? { required: true, minLength: 8 } : {})}
                  placeholder={editUser ? "Unchanged" : "Min 8 characters"}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Role</label>
                <select
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                {formLoading
                  ? (editUser ? "Updating..." : "Creating...")
                  : (editUser ? "Update User" : "Create User")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
