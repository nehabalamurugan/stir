"use client"

import { useState, useEffect } from "react"
import { Check, LogOut, Copy, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MemberAvatar } from "@/components/member-avatar"
import { useAuth } from "@/components/auth-provider"
import { toast } from "sonner"

const AVATAR_COLORS = [
  "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
]

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()

  // Profile edit state
  const [name, setName] = useState(user?.name ?? "")
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? AVATAR_COLORS[2])
  const [savingProfile, setSavingProfile] = useState(false)

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Invite link
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setAvatarColor(user.avatarColor)
    }
  }, [user])

  useEffect(() => {
    // Fetch invite link from the server
    fetch("/api/auth/invite-link")
      .then((r) => r.json())
      .then((d) => { if (d.link) setInviteLink(d.link) })
      .catch(() => {})
  }, [])

  async function saveProfile() {
    if (!name.trim()) return
    setSavingProfile(true)
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), avatarColor }),
      })
      if (res.ok) {
        await refreshUser()
        toast.success("Profile updated!")
      } else {
        toast.error("Failed to update profile")
      }
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) return
    if (newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return }
    setSavingPassword(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        setCurrentPassword("")
        setNewPassword("")
        toast.success("Password changed!")
      } else {
        const d = await res.json()
        toast.error(d.error || "Failed to change password")
      }
    } finally {
      setSavingPassword(false)
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success("Invite link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  const profileChanged = name.trim() !== user?.name || avatarColor !== user?.avatarColor

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account</p>
      </div>

      {/* Your account */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Account</h2>

        {/* Avatar preview */}
        <div className="flex items-center gap-3">
          <MemberAvatar member={{ name: name || user?.name || "?", avatarColor }} size="md" />
          <div>
            <p className="font-medium text-sm">{name || user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl"
            placeholder="Your name"
          />
        </div>

        {/* Avatar color */}
        <div className="space-y-2">
          <Label>Avatar color</Label>
          <div className="flex gap-2 flex-wrap">
            {AVATAR_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setAvatarColor(color)}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              >
                {avatarColor === color && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} readOnly className="rounded-xl bg-muted text-muted-foreground" />
        </div>

        <Button
          onClick={saveProfile}
          disabled={!profileChanged || savingProfile || !name.trim()}
          className="rounded-xl"
        >
          {savingProfile ? "Saving…" : "Save changes"}
        </Button>
      </section>

      {/* Change password */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Change Password</h2>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="current-pw">Current password</Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrentPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="rounded-xl pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pw">New password</Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl pr-10"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={changePassword}
            disabled={!currentPassword || !newPassword || savingPassword}
            variant="outline"
            className="rounded-xl"
          >
            {savingPassword ? "Updating…" : "Update password"}
          </Button>
        </div>
      </section>

      {/* Invite a friend */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Invite a Friend</h2>
        <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
          <p className="text-sm text-muted-foreground">
            Share this link with anyone you want to invite. They can create their own account.
          </p>
          {inviteLink ? (
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="rounded-xl text-xs bg-muted text-muted-foreground flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl shrink-0 gap-1.5"
                onClick={copyInviteLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Invite link not available</p>
          )}
        </div>
      </section>

      {/* Log out */}
      <section>
        <Button variant="outline" className="w-full rounded-xl gap-2 text-destructive hover:text-destructive hover:border-destructive" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </section>
    </div>
  )
}
