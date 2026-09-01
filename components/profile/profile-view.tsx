'use client'

import { useState } from 'react'
import { User, Mail, Phone, Briefcase, Building2, MapPin, Hash, Camera, Save, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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

      {/* Profile Photo */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Profile Photo</h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
              {user?.initials}
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-card hover:bg-primary/90 transition-colors">
                <Camera className="size-4" />
              </button>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{formData.fullName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formData.email}</p>
            {isEditing && (
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Camera className="size-3.5" />
                  Upload Photo
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  Remove
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

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
