"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  _count: { charts: number };
}

interface PaymentRow {
  id: string;
  userId: string;
  amount: number;
  method: string;
  upiTransactionId: string | null;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}

interface PaymentStats {
  total: number;
  monthlyTotal: number;
  count: number;
}

interface CatalogEntry {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  adminOnly: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CouponRow {
  id: string;
  code: string;
  type: string;
  value: number | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface ChatTier {
  id: string;
  name: string;
  questionCount: number;
  price: number;
  isMostPopular: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type AdminTab = "users" | "payments" | "coupons" | "reports" | "chat-pricing";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("users");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("user");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Payments
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({ total: 0, monthlyTotal: 0, count: 0 });
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Report Catalog
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [editingCatalog, setEditingCatalog] = useState<CatalogEntry | null>(null);
  const [catalogName, setCatalogName] = useState("");
  const [catalogDesc, setCatalogDesc] = useState("");
  const [catalogPrice, setCatalogPrice] = useState("");
  const [catalogSaving, setCatalogSaving] = useState(false);

  // Coupons
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editCoupon, setEditCoupon] = useState<CouponRow | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState("unlimited");
  const [couponValue, setCouponValue] = useState("");
  const [couponMaxUses, setCouponMaxUses] = useState("");
  const [couponActive, setCouponActive] = useState(true);
  const [couponExpires, setCouponExpires] = useState("");
  const [couponFormLoading, setCouponFormLoading] = useState(false);
  const [couponFormError, setCouponFormError] = useState<string | null>(null);

  // Chat Pricing
  const [chatTiers, setChatTiers] = useState<ChatTier[]>([]);
  const [chatTiersLoading, setChatTiersLoading] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [editTier, setEditTier] = useState<ChatTier | null>(null);
  const [tierName, setTierName] = useState("");
  const [tierQuestions, setTierQuestions] = useState("");
  const [tierPrice, setTierPrice] = useState("");
  const [tierMostPopular, setTierMostPopular] = useState(false);
  const [tierActive, setTierActive] = useState(true);
  const [tierSortOrder, setTierSortOrder] = useState("0");
  const [tierFormLoading, setTierFormLoading] = useState(false);
  const [tierFormError, setTierFormError] = useState<string | null>(null);

  // ── Auth guard ──
  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated" && session?.user?.role !== "admin") router.push("/");
  }, [status, session, router]);

  // ── Fetch users ──
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

  // ── Fetch payments ──
  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const res = await fetch("/api/admin/payments");
      if (!res.ok) return;
      const data = await res.json();
      setPayments(data.payments);
      setPaymentStats(data.stats);
    } catch { /* ignore */ } finally {
      setPaymentsLoading(false);
    }
  };

  // ── Fetch report catalog ──
  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/admin/report-catalog");
      if (!res.ok) return;
      setCatalog(await res.json());
    } catch { /* ignore */ } finally {
      setCatalogLoading(false);
    }
  };

  const handleToggleCatalog = async (entry: CatalogEntry) => {
    const res = await fetch("/api/admin/report-catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, active: !entry.active }),
    });
    if (!res.ok) { alert("Toggle failed"); return; }
    await fetchCatalog();
  };

  const handleToggleAdminOnly = async (entry: CatalogEntry) => {
    const res = await fetch("/api/admin/report-catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, adminOnly: !entry.adminOnly }),
    });
    if (!res.ok) { alert("Toggle failed"); return; }
    await fetchCatalog();
  };

  const openEditCatalog = (entry: CatalogEntry) => {
    setEditingCatalog(entry);
    setCatalogName(entry.name);
    setCatalogDesc(entry.description || "");
    setCatalogPrice((entry.price / 100).toString());
  };

  const handleSaveCatalog = async () => {
    if (!editingCatalog) return;
    setCatalogSaving(true);
    const res = await fetch("/api/admin/report-catalog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingCatalog.id,
        name: catalogName,
        description: catalogDesc,
        price: Math.round(parseFloat(catalogPrice) * 100),
      }),
    });
    setCatalogSaving(false);
    if (!res.ok) { alert("Save failed"); return; }
    setEditingCatalog(null);
    await fetchCatalog();
  };

  const handleDeleteCatalog = async (entry: CatalogEntry) => {
    if (!confirm(`Delete report "${entry.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/report-catalog?id=${entry.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Delete failed"); return; }
    await fetchCatalog();
  };

  // ── Fetch coupons ──
  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) return;
      setCoupons(await res.json());
    } catch { /* ignore */ } finally {
      setCouponsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      fetchUsers();
    }
  }, [status, session]);

  // ── Chat pricing CRUD ──
  const fetchChatTiers = async () => {
    setChatTiersLoading(true);
    try {
      const res = await fetch("/api/admin/chat-pricing");
      if (!res.ok) return;
      setChatTiers(await res.json());
    } catch { /* ignore */ } finally {
      setChatTiersLoading(false);
    }
  };

  const openAddTier = () => {
    setEditTier(null); setTierName(""); setTierQuestions(""); setTierPrice(""); setTierMostPopular(false); setTierActive(true); setTierSortOrder("0"); setTierFormError(null); setShowTierModal(true);
  };
  const openEditTier = (t: ChatTier) => {
    setEditTier(t); setTierName(t.name); setTierQuestions(t.questionCount.toString()); setTierPrice((t.price / 100).toString()); setTierMostPopular(t.isMostPopular); setTierActive(t.active); setTierSortOrder(t.sortOrder.toString()); setTierFormError(null); setShowTierModal(true);
  };

  const handleTierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTierFormLoading(true);
    setTierFormError(null);
    const payload: Record<string, unknown> = {
      name: tierName,
      questionCount: parseInt(tierQuestions),
      price: Math.round(parseFloat(tierPrice) * 100),
      isMostPopular: tierMostPopular,
      active: tierActive,
      sortOrder: parseInt(tierSortOrder) || 0,
    };
    if (editTier) payload.id = editTier.id;
    try {
      const res = await fetch("/api/admin/chat-pricing", {
        method: editTier ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      setShowTierModal(false);
      await fetchChatTiers();
    } catch (err) {
      setTierFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setTierFormLoading(false);
    }
  };

  const handleToggleTierActive = async (t: ChatTier) => {
    await fetch("/api/admin/chat-pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, active: !t.active }),
    });
    await fetchChatTiers();
  };

  const handleToggleTierPopular = async (t: ChatTier) => {
    await fetch("/api/admin/chat-pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, isMostPopular: !t.isMostPopular }),
    });
    await fetchChatTiers();
  };

  const handleDeleteTier = async (t: ChatTier) => {
    if (!confirm(`Delete tier "${t.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/chat-pricing?id=${t.id}`, { method: "DELETE" });
    await fetchChatTiers();
  };

  useEffect(() => {
    if (tab === "payments" && payments.length === 0) fetchPayments();
    if (tab === "reports" && catalog.length === 0) fetchCatalog();
    if (tab === "coupons" && coupons.length === 0) fetchCoupons();
    if (tab === "chat-pricing" && chatTiers.length === 0) fetchChatTiers();
  }, [tab]);

  // ── User modal ──
  const openAddUser = () => {
    setEditUser(null); setFormName(""); setFormEmail(""); setFormPassword(""); setFormRole("user"); setFormError(null); setShowUserModal(true);
  };
  const openEditUser = (u: UserRow) => {
    setEditUser(u); setFormName(u.name || ""); setFormEmail(u.email); setFormPassword(""); setFormRole(u.role); setFormError(null); setShowUserModal(true);
  };
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormLoading(true); setFormError(null);
    try {
      if (editUser) {
        const body: Record<string, string> = { id: editUser.id, name: formName, email: formEmail, role: formRole };
        if (formPassword) body.password = formPassword;
        const res = await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      } else {
        const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formName, email: formEmail, password: formPassword, role: formRole }) });
        if (!res.ok) throw new Error((await res.json()).error || "Creation failed");
      }
      setShowUserModal(false); await fetchUsers();
    } catch (err) { setFormError(err instanceof Error ? err.message : "Failed"); } finally { setFormLoading(false); }
  };
  const handleDeleteUser = async (u: UserRow) => {
    if (!confirm(`Delete user "${u.email}"? This deletes all their data.`)) return;
    const res = await fetch(`/api/admin/users?id=${u.id}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json()).error || "Delete failed"); return; }
    await fetchUsers();
  };

  // ── Coupon modal ──
  const openAddCoupon = () => {
    setEditCoupon(null); setCouponCode(""); setCouponType("unlimited"); setCouponValue(""); setCouponMaxUses(""); setCouponActive(true); setCouponExpires(""); setCouponFormError(null); setShowCouponModal(true);
  };
  const openEditCoupon = (c: CouponRow) => {
    setEditCoupon(c); setCouponCode(c.code); setCouponType(c.type); setCouponValue(c.value?.toString() || ""); setCouponMaxUses(c.maxUses?.toString() || ""); setCouponActive(c.active); setCouponExpires(c.expiresAt ? c.expiresAt.split("T")[0] : ""); setCouponFormError(null); setShowCouponModal(true);
  };
  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setCouponFormLoading(true); setCouponFormError(null);
    const body: Record<string, unknown> = {
      code: couponCode.toUpperCase(),
      type: couponType,
      value: couponValue ? parseInt(couponValue) : null,
      maxUses: couponMaxUses ? parseInt(couponMaxUses) : null,
      active: couponActive,
      expiresAt: couponExpires || null,
    };
    try {
      if (editCoupon) {
        body.id = editCoupon.id;
        const res = await fetch("/api/admin/coupons", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      } else {
        const res = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json()).error || "Creation failed");
      }
      setShowCouponModal(false); await fetchCoupons();
    } catch (err) { setCouponFormError(err instanceof Error ? err.message : "Failed"); } finally { setCouponFormLoading(false); }
  };
  const handleDeleteCoupon = async (c: CouponRow) => {
    if (!confirm(`Delete coupon "${c.code}"?`)) return;
    const res = await fetch(`/api/admin/coupons?id=${c.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Delete failed"); return; }
    await fetchCoupons();
  };

  // ── Loading / Error ──
  if (status === "loading" || loading) {
    return <div className="flex items-center justify-center h-48 text-slate-500"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (error) {
    return <div className="max-w-2xl mx-auto pt-16 text-center"><p className="text-red-400">{error}</p></div>;
  }

  // ── Render ──
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-amber-400">Admin Panel</h1>
        <div className="flex items-center gap-2 text-xs">
          <a
            href="/admin/house-significations"
            className="text-slate-400 hover:text-amber-400 border border-slate-700 hover:border-amber-500/40 px-3 py-1.5 rounded-lg transition-colors"
          >
            {"\u{1F3E0}"} House Significations
          </a>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-800">
        {([
          { id: "users" as AdminTab, label: "Users" },
          { id: "payments" as AdminTab, label: "Payments" },
          { id: "reports" as AdminTab, label: "Reports" },
          { id: "coupons" as AdminTab, label: "Coupons" },
          { id: "chat-pricing" as AdminTab, label: "Chat Pricing" },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
              tab === t.id ? "border-amber-500 text-amber-400 font-medium" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ USERS TAB ═══════════════ */}
      {tab === "users" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">{users.length} registered {users.length === 1 ? "user" : "users"}</p>
            <button onClick={openAddUser} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors text-sm">+ Add User</button>
          </div>
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
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-200">{u.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${u.role === "admin" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-700/50 text-slate-400 border border-slate-700"}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{u._count.charts}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditUser(u)} className="text-xs text-slate-400 hover:text-amber-400 transition-colors">Edit</button>
                          {u.id !== session?.user?.id && (
                            <button onClick={() => handleDeleteUser(u)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ PAYMENTS TAB ═══════════════ */}
      {tab === "payments" && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Revenue</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{formatINR(paymentStats.total)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">This Month</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{formatINR(paymentStats.monthlyTotal)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Payments</p>
              <p className="text-2xl font-bold text-slate-200 mt-1">{paymentStats.count}</p>
            </div>
          </div>

          {paymentsLoading ? (
            <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-2xl">No payments recorded yet.</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">User</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Amount</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Method</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Transaction ID</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-slate-200 text-sm">{p.user.name || "—"}</p>
                          <p className="text-slate-500 text-xs">{p.user.email}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-200 font-medium">{formatINR(p.amount)}</td>
                        <td className="px-4 py-3 text-slate-400 uppercase text-xs">{p.method}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono">{p.upiTransactionId || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            p.status === "verified" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                            p.status === "rejected" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                            "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          }`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ REPORTS TAB ═══════════════ */}
      {tab === "reports" && (
        <>
          <p className="text-slate-500 text-sm">Manage which reports are available for purchase and their pricing.</p>

          {catalogLoading ? (
            <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : catalog.length === 0 ? (
            <div className="text-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-2xl">No reports in catalog.</div>
          ) : (
            <div className="space-y-4">
              {catalog.map(entry => (
                <div key={entry.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  {editingCatalog?.id === entry.id ? (
                    /* Editing mode */
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wide">Name</label>
                        <input
                          value={catalogName}
                          onChange={e => setCatalogName(e.target.value)}
                          className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wide">Description</label>
                        <textarea
                          value={catalogDesc}
                          onChange={e => setCatalogDesc(e.target.value)}
                          rows={2}
                          className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 uppercase tracking-wide">Price (INR)</label>
                        <input
                          type="number"
                          value={catalogPrice}
                          onChange={e => setCatalogPrice(e.target.value)}
                          className="mt-1 w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleSaveCatalog}
                          disabled={catalogSaving}
                          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                          {catalogSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingCatalog(null)}
                          className="text-slate-400 hover:text-slate-200 px-4 py-1.5 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-slate-200">{entry.name}</h3>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            entry.active
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                          }`}>
                            {entry.active ? "Active" : "Paused"}
                          </span>
                          {entry.adminOnly && (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Admin Only
                            </span>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-0.5 font-mono">{entry.slug}</p>
                        {entry.description && (
                          <p className="text-slate-400 text-sm mt-2">{entry.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-amber-400">{formatINR(entry.price)}</p>
                      </div>
                    </div>
                  )}

                  {editingCatalog?.id !== entry.id && (
                    <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800">
                      <button
                        onClick={() => openEditCatalog(entry)}
                        className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleCatalog(entry)}
                        className={`text-xs transition-colors ${
                          entry.active ? "text-slate-400 hover:text-red-400" : "text-slate-400 hover:text-emerald-400"
                        }`}
                      >
                        {entry.active ? "Pause Sales" : "Resume Sales"}
                      </button>
                      <button
                        onClick={() => handleToggleAdminOnly(entry)}
                        className={`text-xs transition-colors ${
                          entry.adminOnly ? "text-blue-400 hover:text-slate-400" : "text-slate-400 hover:text-blue-400"
                        }`}
                      >
                        {entry.adminOnly ? "Make Public" : "Admin Only"}
                      </button>
                      <button
                        onClick={() => handleDeleteCatalog(entry)}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════ COUPONS TAB ═══════════════ */}
      {tab === "coupons" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">{coupons.length} {coupons.length === 1 ? "coupon" : "coupons"}</p>
            <button onClick={openAddCoupon} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors text-sm">+ Add Coupon</button>
          </div>

          {couponsLoading ? (
            <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-2xl">No coupons created yet.</div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Code</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Uses</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Expires</th>
                      <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {coupons.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-amber-400 font-medium">{c.code}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs capitalize">{c.type}{c.value != null ? ` (${c.type === "percentage" ? `${c.value}%` : formatINR(c.value)})` : ""}</td>
                        <td className="px-4 py-3 text-slate-400">{c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : " / ∞"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${c.active ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                            {c.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{c.expiresAt ? formatDate(c.expiresAt) : "Never"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditCoupon(c)} className="text-xs text-slate-400 hover:text-amber-400 transition-colors">Edit</button>
                            <button onClick={() => handleDeleteCoupon(c)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ CHAT PRICING TAB ═══════════════ */}
      {tab === "chat-pricing" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-sm">Manage chat question pricing tiers.</p>
            <button onClick={openAddTier} className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors text-sm">+ Add Tier</button>
          </div>

          {chatTiersLoading ? (
            <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : chatTiers.length === 0 ? (
            <div className="text-center py-12 text-slate-600 border border-dashed border-slate-800 rounded-2xl">No pricing tiers. Click &quot;+ Add Tier&quot; to create one.</div>
          ) : (
            <div className="space-y-4">
              {chatTiers.map(tier => (
                <div key={tier.id} className={`bg-slate-900 border rounded-2xl p-5 ${tier.isMostPopular ? "border-amber-500/50" : "border-slate-800"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-200">{tier.name}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          tier.active
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}>
                          {tier.active ? "Active" : "Paused"}
                        </span>
                        {tier.isMostPopular && (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-amber-500 text-black">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm mt-1">
                        {tier.questionCount} questions • Sort order: {tier.sortOrder}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-amber-400">{formatINR(tier.price)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800">
                    <button onClick={() => openEditTier(tier)} className="text-xs text-slate-400 hover:text-amber-400 transition-colors">Edit</button>
                    <button
                      onClick={() => handleToggleTierActive(tier)}
                      className={`text-xs transition-colors ${tier.active ? "text-slate-400 hover:text-red-400" : "text-slate-400 hover:text-emerald-400"}`}
                    >
                      {tier.active ? "Pause" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleToggleTierPopular(tier)}
                      className={`text-xs transition-colors ${tier.isMostPopular ? "text-amber-400 hover:text-slate-400" : "text-slate-400 hover:text-amber-400"}`}
                    >
                      {tier.isMostPopular ? "Remove Badge" : "Mark Popular"}
                    </button>
                    <button onClick={() => handleDeleteTier(tier)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════ USER MODAL ═══════════════ */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-amber-400">{editUser ? "Edit User" : "Add User"}</h2>
              <button onClick={() => setShowUserModal(false)} className="text-slate-500 hover:text-slate-300">&#10005;</button>
            </div>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</label>
                <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} required className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Password {editUser && <span className="normal-case text-slate-600">(leave blank to keep)</span>}</label>
                <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} {...(!editUser ? { required: true, minLength: 8 } : {})} placeholder={editUser ? "Unchanged" : "Min 8 characters"} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Role</label>
                <select value={formRole} onChange={e => setFormRole(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              <button type="submit" disabled={formLoading} className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm">
                {formLoading ? (editUser ? "Updating..." : "Creating...") : (editUser ? "Update User" : "Create User")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ CHAT TIER MODAL ═══════════════ */}
      {showTierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-amber-400">{editTier ? "Edit Tier" : "Add Pricing Tier"}</h2>
              <button onClick={() => setShowTierModal(false)} className="text-slate-500 hover:text-slate-300">&#10005;</button>
            </div>
            <form onSubmit={handleTierSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tier Name</label>
                <input type="text" value={tierName} onChange={e => setTierName(e.target.value)} required placeholder="e.g. Starter, Popular, Pro" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Questions</label>
                  <input type="number" value={tierQuestions} onChange={e => setTierQuestions(e.target.value)} required min="1" placeholder="e.g. 16" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Price (INR)</label>
                  <input type="number" value={tierPrice} onChange={e => setTierPrice(e.target.value)} required min="0" step="1" placeholder="e.g. 169" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Sort Order</label>
                <input type="number" value={tierSortOrder} onChange={e => setTierSortOrder(e.target.value)} placeholder="0" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 w-24" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tierActive" checked={tierActive} onChange={e => setTierActive(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500" />
                  <label htmlFor="tierActive" className="text-sm text-slate-300">Active</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="tierPopular" checked={tierMostPopular} onChange={e => setTierMostPopular(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500" />
                  <label htmlFor="tierPopular" className="text-sm text-slate-300">Most Popular badge</label>
                </div>
              </div>
              {tierFormError && <p className="text-red-400 text-sm">{tierFormError}</p>}
              <button type="submit" disabled={tierFormLoading} className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm">
                {tierFormLoading ? (editTier ? "Updating..." : "Creating...") : (editTier ? "Update Tier" : "Create Tier")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ COUPON MODAL ═══════════════ */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-amber-400">{editCoupon ? "Edit Coupon" : "Add Coupon"}</h2>
              <button onClick={() => setShowCouponModal(false)} className="text-slate-500 hover:text-slate-300">&#10005;</button>
            </div>
            <form onSubmit={handleCouponSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Coupon Code</label>
                <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} required placeholder="e.g. DIWALI2026" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Type</label>
                  <select value={couponType} onChange={e => setCouponType(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="unlimited">Unlimited (Free)</option>
                    <option value="percentage">Percentage Off</option>
                    <option value="fixed">Fixed Discount</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Value {couponType === "unlimited" && <span className="normal-case text-slate-600">(N/A)</span>}</label>
                  <input type="number" value={couponValue} onChange={e => setCouponValue(e.target.value)} disabled={couponType === "unlimited"} placeholder={couponType === "percentage" ? "e.g. 50" : "paise"} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Max Uses <span className="normal-case text-slate-600">(blank = unlimited)</span></label>
                  <input type="number" value={couponMaxUses} onChange={e => setCouponMaxUses(e.target.value)} placeholder="Unlimited" className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Expires</label>
                  <input type="date" value={couponExpires} onChange={e => setCouponExpires(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="couponActive" checked={couponActive} onChange={e => setCouponActive(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500" />
                <label htmlFor="couponActive" className="text-sm text-slate-300">Active</label>
              </div>
              {couponFormError && <p className="text-red-400 text-sm">{couponFormError}</p>}
              <button type="submit" disabled={couponFormLoading} className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm">
                {couponFormLoading ? (editCoupon ? "Updating..." : "Creating...") : (editCoupon ? "Update Coupon" : "Create Coupon")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
