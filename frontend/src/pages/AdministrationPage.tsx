import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { User, Invitation } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, UserPlus, Pencil, X, Check, Copy, Share2, LinkIcon } from "lucide-react";

const roleOptions = [
  { value: "doctor", label: "Doctor" },
  { value: "assistant", label: "Assistant" },
];

export function AdministrationPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState({ email: "", password: "", full_name: "", role: "doctor", phone: "" });
  const [showUserForm, setShowUserForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "", phone: "" });
  const [inviteRole, setInviteRole] = useState("assistant");
  const [generatedInvitation, setGeneratedInvitation] = useState<Invitation | null>(null);
  const [generating, setGenerating] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await api.get<User[]>("/users/");
      setUsers(u);
    } catch { /* ignore */ }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const user = await api.post<User>("/users/", userForm);
      setUsers([user, ...users]);
      setShowUserForm(false);
      setUserForm({ email: "", password: "", full_name: "", role: "doctor", phone: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || "",
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (userId: number) => {
    setError("");
    try {
      const updated = await api.put<User>(`/users/${userId}`, {
        full_name: editForm.full_name,
        role: editForm.role,
        phone: editForm.phone || null,
      });
      setUsers(users.map((u) => (u.id === userId ? updated : u)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const generateLink = async () => {
    setGenerating(true);
    setError("");
    try {
      const inv = await api.post<Invitation>("/invitations/", { role: inviteRole });
      setGeneratedInvitation(inv);
      setLinkCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invitation");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const buildInviteLink = (inv: Invitation) =>
    `${window.location.origin}/signup?token=${inv.token}`;

  const copySentLink = async () => {
    if (!generatedInvitation) return;
    await copyToClipboard(buildInviteLink(generatedInvitation));
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-h1 text-h1 text-foreground">Administration</h1>
        <p className="text-body-lg text-outline mt-1">Manage users and invitations</p>
      </div>

      {error && (
        <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>
      )}

      {/* Invitation Link Generator */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <h3 className="font-h3 text-h3">Invitation Link</h3>
        </div>
        <div className="flex gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-label-sm text-outline uppercase tracking-wider">Role</Label>
            <Select options={roleOptions} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-28" />
          </div>
          <Button onClick={generateLink} disabled={generating}>
            <LinkIcon className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Generate Link"}
          </Button>
        </div>

        {generatedInvitation && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 p-2">
            <div className="flex-1 min-w-0">
              <Input
                readOnly
                value={buildInviteLink(generatedInvitation)}
                className="text-sm flex-1 border-0 bg-transparent focus-visible:ring-0 px-2 font-mono"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
            <Button size="sm" variant="default" className="shrink-0" onClick={copySentLink}>
              {linkCopied ? (
                <><Check className="h-4 w-4 mr-1" /> Copied</>
              ) : (
                <><Copy className="h-4 w-4 mr-1" /> Copy</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Staff Accounts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-h3 text-h3 text-foreground">Staff Accounts</h2>
            <p className="text-body-sm text-outline mt-0.5">{users.length} team members</p>
          </div>
          <Button size="sm" onClick={() => setShowUserForm(!showUserForm)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {showUserForm && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h3 className="font-label-md text-foreground mb-4">New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-label-sm text-outline uppercase tracking-wider">Full Name</Label>
                  <Input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-label-sm text-outline uppercase tracking-wider">Email</Label>
                  <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-label-sm text-outline uppercase tracking-wider">Password</Label>
                  <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-label-sm text-outline uppercase tracking-wider">Role</Label>
                  <Select options={roleOptions} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-label-sm text-outline uppercase tracking-wider">Phone</Label>
                  <Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowUserForm(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={saving}>
                  <Save className="h-3 w-3 mr-1" />
                  {saving ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 font-label-sm text-outline uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 font-label-sm text-outline uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 font-label-sm text-outline uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 font-label-sm text-outline uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50/30 transition-colors group">
                    {editingId === u.id ? (
                      <td colSpan={4} className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Input className="w-40 h-8 text-sm" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                          <Input className="w-36 h-8 text-sm" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone" />
                          <Select className="w-28 h-8 text-sm" options={roleOptions} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} />
                          <Button size="sm" variant="ghost" onClick={() => saveEdit(u.id)}><Check className="h-4 w-4 text-green-600" /></Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold text-xs">
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <p className="font-label-md text-foreground">{u.full_name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-body-md text-outline">{u.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="capitalize">{u.role}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(u)} className="text-primary hover:bg-primary-fixed">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="px-6 py-8 text-center text-body-md text-outline">No users found</div>
          )}
        </div>
      </div>
    </div>
  );
}
