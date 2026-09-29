'use client'

import { useRef, useState } from 'react'
import { User, Mail, Phone, Briefcase, Building2, MapPin, Hash, Camera, Save, X, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ApiError, apiFetch } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/shell/user-avatar'
import type { RoleUser } from '@/lib/rbac'

export function ProfileView() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '+250 788 123 456',
    jobTitle: user?.roleLabel || '',
    organization: 'Rwanda Mines, Petroleum and Gas Board',
    department: 'Mining Intelligence & Exploration',
    userRole: user?.role || '',
    employeeId: 'RMB-2024-' + Math.floor(Math.random() * 9999).toString().padStart(4, '0'),
    location: 'Kigali Operations Center, Rwanda',
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSaving(false)
    setIsEditing(false)
    // TODO: Implement actual save logic
  }

  const handleCancel = () => {
    // Reset form data
    setFormData({
      fullName: user?.name || '',
      email: user?.email || '',
      phone: '+250 788 123 456',
      jobTitle: user?.roleLabel || '',
      organization: 'Rwanda Mines, Petroleum and Gas Board',
      department: 'Mining Intelligence & Exploration',
      userRole: user?.role || '',
      employeeId: formData.employeeId,
      location: 'Kigali Operations Center, Rwanda',
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Account Information</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your personal and organizational details
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <User className="size-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <X className="size-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <span className="size-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <ProfilePhotoSection name={formData.fullName} email={formData.email} />

      {/* Personal Information */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <User className="size-4 text-primary" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Full name
            </label>
            {isEditing ? (
              <Input
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Enter your full name"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground">
                <User className="size-4 text-muted-foreground" />
                {formData.fullName}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Email address
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 text-sm text-muted-foreground">
              <Mail className="size-4" />
              {formData.email}
              <span className="ml-auto text-[10px] text-muted-foreground">(Cannot be changed)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Phone number
            </label>
            {isEditing ? (
              <Input
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground">
                <Phone className="size-4 text-muted-foreground" />
                {formData.phone}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Job title
            </label>
            {isEditing ? (
              <Input
                value={formData.jobTitle}
                onChange={(e) => handleChange('jobTitle', e.target.value)}
                placeholder="Enter job title"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground">
                <Briefcase className="size-4 text-muted-foreground" />
                {formData.jobTitle}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Organization Information */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="size-4 text-primary" />
          Organization Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Organization/Company
            </label>
            {isEditing ? (
              <Input
                value={formData.organization}
                onChange={(e) => handleChange('organization', e.target.value)}
                placeholder="Enter organization name"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground">
                <Building2 className="size-4 text-muted-foreground" />
                {formData.organization}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Department
            </label>
            {isEditing ? (
              <Input
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="Enter department"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground">
                <Briefcase className="size-4 text-muted-foreground" />
                {formData.department}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              User role
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary">
                {formData.userRole}
              </span>
              <span className="ml-auto text-[10px]">(Assigned by admin)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Employee/Staff ID
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground">
              <Hash className="size-4 text-muted-foreground" />
              {formData.employeeId}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Location
            </label>
            {isEditing ? (
              <Input
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Enter location"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground">
                <MapPin className="size-4 text-muted-foreground" />
                {formData.location}
              </div>
            )}
          </div>
        </div>
      </div>

      <ChangePasswordSection />

      {/* Security Notice */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Email cannot be changed</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your email address is tied to your authentication credentials. To change it, contact your system administrator at{' '}
              <a href="mailto:admin@mdmis.rw" className="text-primary hover:underline">admin@mdmis.rw</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChangePasswordSection() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function reset() {
    setCurrent(''); setNext(''); setConfirm(''); setError(''); setShow(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next.length < 8) { setError('New password must be at least 8 characters.'); return }
    if (next !== confirm) { setError('New passwords do not match.'); return }
    if (next === current) { setError('New password must be different from the current one.'); return }
    setSaving(true)
    setError('')
    try {
      await apiFetch('/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({ current_password: current, new_password: next }),
      })
      reset()
      setOpen(false)
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  const type = show ? 'text' : 'password'

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <KeyRound className="size-4 text-primary" />
            Password &amp; Security
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">Use at least 8 characters. You stay signed in on this device.</p>
        </div>
        {!open && (
          <Button variant="outline" onClick={() => { setOpen(true); setDone(false) }} className="gap-2">
            <KeyRound className="size-4" />
            Change password
          </Button>
        )}
      </div>

      {done && !open && (
        <p className="mt-4 flex items-center gap-2 text-xs text-[var(--success)]">
          <CheckCircle2 className="size-4" /> Password changed. Use the new password next time you sign in.
        </p>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Current password</label>
              <Input type={type} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">New password</label>
              <Input type={type} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm new password</label>
              <Input type={type} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
            </div>
          </div>
          <button type="button" onClick={() => setShow(!show)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />} {show ? 'Hide' : 'Show'} passwords
          </button>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="size-4" />
              {saving ? 'Saving…' : 'Update password'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false) }} className="gap-2">
              <X className="size-4" />
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

const AVATAR_PX = 256
const MAX_SOURCE_BYTES = 10 * 1024 * 1024

/** Centre-crop to a square and downscale to a small JPEG data: URL. */
async function toAvatarDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not read that image.'))
      el.src = url
    })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = AVATAR_PX
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not process that image.')
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
      0, 0, AVATAR_PX, AVATAR_PX,
    )
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function ProfilePhotoSection({ name, email }: { name: string; email: string }) {
  const { user, updateUser } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError('That image is over 10 MB.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const dataUrl = await toAvatarDataUrl(file)
      const updated = await apiFetch<RoleUser>('/auth/me/avatar/', {
        method: 'PUT',
        body: JSON.stringify({ data_url: dataUrl }),
      })
      updateUser(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    setError('')
    try {
      updateUser(await apiFetch<RoleUser>('/auth/me/avatar/', { method: 'DELETE' }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Profile Photo</h3>
      <div className="flex items-center gap-6">
        <div className="relative">
          <UserAvatar initials={user?.initials ?? ''} avatarUrl={user?.avatarUrl} className="size-24 text-2xl" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-label="Change profile photo"
            className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Camera className="size-4" />
          </button>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{email}</p>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Camera className="size-3.5" />
              {busy ? 'Saving…' : user?.avatarUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {user?.avatarUrl && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={handleRemove}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                Remove
              </Button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">JPEG, PNG or WebP. Cropped to a square automatically.</p>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  )
}
