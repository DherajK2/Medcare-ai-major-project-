import { useState, useEffect } from 'react';
import { usePatients } from '../hooks/usePatients';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import {
  Users,
  UserPlus,
  Eye,
  Bell,
  Pill,
  Heart,
  RefreshCw,
  Phone,
  Mail,
  Trash2,
  ShieldCheck,
  PhoneCall,
  UserCheck,
  AlertTriangle,
  HeartHandshake,
  Radio,
  LoaderCircle,
  Sparkles
} from 'lucide-react';
import { apiClient } from '../api/client';

export default function FamilyPage() {
  const { currentPatient, patients } = usePatients();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Emergency Broadcast Voice Calling State
  const [isCallingEmergencyAi, setIsCallingEmergencyAi] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastResults, setBroadcastResults] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+91 ',
    relationship_label: 'Son',
    custom_relationship: '',
    role: 'caregiver',
    can_view_records: true,
    can_manage_meds: true,
    can_receive_alerts: true,
    is_emergency_contact: true,
  });

  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const handleBroadcastCallAllFamily = async () => {
    if (!currentPatient?.id) {
      showToast('Please select an active patient profile first', 'error');
      return;
    }
    setIsCallingEmergencyAi(true);
    showToast('🚨 Dialing all registered family members & emergency contacts simultaneously...', 'success');
    try {
      const memberPhones = members.map(m => m.phone).filter(Boolean);
      const res = await apiClient.post('/api/telephony/emergency-call', {
        patient_id: currentPatient.id,
        phone_numbers: memberPhones.length > 0 ? memberPhones : undefined,
        patient_name: `${currentPatient.first_name} ${currentPatient.last_name}`,
        emergency_type: 'Acute Medical Distress / SOS Alert',
        location: 'Mysuru, Karnataka',
        symptoms: 'Emergency Safety Alert Triggered by Family Member',
        include_doctor: false
      });
      if (res.data.status === 'success' || res.data.success) {
        setBroadcastResults(res.data);
        setIsBroadcastModalOpen(true);
        const count = res.data.total_contacts_dialed || res.data.recipients?.length || 1;
        showToast(`🚨 Outbound Emergency Voice Calls Dispatched to ${count} family numbers simultaneously!`, 'success');
      } else {
        showToast(`Emergency Voice Dispatch: ${res.data.message || 'Call dispatch failed'}`, 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.message || 'Failed to dispatch emergency voice calls to family members', 'error');
    } finally {
      setIsCallingEmergencyAi(false);
    }
  };

  const handleTriggerEmergencyAiCall = async (phone: string, recipientName?: string) => {
    setIsCallingEmergencyAi(true);
    showToast(`Initiating AI Voice Call to ${recipientName || phone}...`, 'success');
    try {
      const res = await apiClient.post('/api/telephony/emergency-call', {
        phone_number: phone,
        patient_name: currentPatient ? `${currentPatient.first_name} ${currentPatient.last_name}` : 'Patient',
        emergency_type: 'Acute Medical Distress',
        location: 'Mysuru, Karnataka',
        symptoms: 'Emergency Safety Alert Triggered for Family Member'
      });
      if (res.data.status === 'success' || res.data.success) {
        showToast(`Automated Emergency Dispatch call dialed (${phone})!`, 'success');
      } else {
        showToast(`Emergency Voice Dispatch: ${res.data.message || 'Emergency call failed'}`, 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.message || 'Failed to dispatch emergency voice call', 'error');
    } finally {
      setIsCallingEmergencyAi(false);
    }
  };

  const fetchMembers = async () => {
    if (!currentPatient?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/family/${currentPatient.id}`);
      setMembers(res.data);
    } catch (err) {
      console.error('Failed to fetch family members', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [currentPatient?.id]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient?.id) {
      showToast('Please select or create a patient first', 'error');
      return;
    }

    const relationship = formData.relationship_label === 'Other'
      ? (formData.custom_relationship.trim() || 'Family Member')
      : formData.relationship_label;

    const phoneVal = formData.phone.trim();
    const cleanPhone = (phoneVal === '+91' || phoneVal === '+91 ') ? undefined : phoneVal;

    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/family', {
        patient_id: currentPatient.id,
        name: formData.name.trim() || relationship,
        email: formData.email.trim() || undefined,
        phone: cleanPhone,
        relationship_label: relationship,
        role: formData.role,
        can_view_records: formData.can_view_records,
        can_manage_meds: formData.can_manage_meds,
        can_receive_alerts: formData.can_receive_alerts,
        is_emergency_contact: formData.is_emergency_contact,
      });

      setIsModalOpen(false);
      const emailNote = formData.email.trim() ? ` Invitation email sent to ${formData.email.trim()}.` : '';
      showToast(`✅ Successfully invited "${formData.name.trim() || relationship}"!${emailNote}`);
      setFormData({
        name: '',
        email: '',
        phone: '+91 ',
        relationship_label: 'Son',
        custom_relationship: '',
        role: 'caregiver',
        can_view_records: true,
        can_manage_meds: true,
        can_receive_alerts: true,
        is_emergency_contact: true,
      });
      fetchMembers();
    } catch (err: any) {
      console.error('Failed to add family member', err);
      showToast(err.response?.data?.detail || 'Failed to add family member. Please check details.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from family access and emergency calling?`)) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/api/family/${id}`);
      showToast(`Removed access for ${name}`);
      fetchMembers();
    } catch (err: any) {
      console.error('Failed to delete member', err);
      showToast(err.response?.data?.detail || 'Failed to remove member', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getRelationshipColor = (rel: string) => {
    const r = (rel || '').toLowerCase();
    if (r.includes('nurse') || r.includes('caretaker') || r.includes('doctor')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (r.includes('son') || r.includes('daughter') || r.includes('child')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (r.includes('spouse') || r.includes('husband') || r.includes('wife')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (r.includes('mother') || r.includes('father') || r.includes('parent')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium border flex items-center space-x-2 transition-all ${
          toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200'
        }`}>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <HeartHandshake size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Family & Caregiver Access</h1>
              <p className="text-gray-500 text-sm">
                Manage shared family accounts, nursing caretakers, and automated SOS emergency phone call recipients for{' '}
                <strong className="text-gray-800 font-semibold">{currentPatient?.first_name} {currentPatient?.last_name || ''}</strong>
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto flex-wrap">
          {members.some(m => m.phone) && (
            <Button
              onClick={handleBroadcastCallAllFamily}
              disabled={isCallingEmergencyAi}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5"
              title="Broadcast automated AI Emergency Voice Calls to all family members"
            >
              {isCallingEmergencyAi ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <PhoneCall size={15} />
              )}
              <span>🚨 Broadcast Call All ({members.filter(m => m.phone).length})</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchMembers} disabled={loading} className="flex-1 md:flex-none">
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <UserPlus size={16} className="mr-2" /> Invite Member / Caregiver
          </Button>
        </div>
      </div>

      {/* Information Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/70 p-4 rounded-xl flex items-start space-x-3 text-xs text-blue-900">
          <div className="p-2 bg-blue-100/80 text-blue-700 rounded-lg shrink-0 mt-0.5">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="font-bold text-blue-950 mb-0.5 text-sm">🔑 Shared Login & Co-Management</h4>
            <p className="leading-relaxed">
              Family members or nurses invited via their email address can log in with Google or Email/Password to view vitals, manage daily medications, and track medical history.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 p-4 rounded-xl flex items-start space-x-3 text-xs text-amber-900">
          <div className="p-2 bg-amber-100/80 text-amber-700 rounded-lg shrink-0 mt-0.5">
            <PhoneCall size={18} />
          </div>
          <div>
            <h4 className="font-bold text-amber-950 mb-0.5 text-sm">🚨 Linked SOS Emergency Voice Calling</h4>
            <p className="leading-relaxed">
              Phone numbers added here are synchronized to the emergency telephony engine. When SOS is triggered or vitals breach critical thresholds, automated phone calls and WhatsApp alerts are dispatched instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      {members.length === 0 && !loading ? (
        <Card className="p-12 text-center border-dashed border-2 border-gray-200 bg-gray-50/50">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">No Family Members or Caregivers Added Yet</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Invite family members (son, daughter, spouse) or assigned caretakers/nurses so they can log in to co-manage health records and receive automated emergency SOS voice calls.
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <UserPlus size={16} className="mr-2" /> Invite First Family Member
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {members.map(m => {
            const memberId = m.relationship_id || m.emergency_contact_id || m.id;
            const isDeleting = deletingId === memberId;
            return (
              <Card key={memberId} className="p-5 border border-gray-200/80 flex flex-col justify-between hover:shadow-lg transition-all duration-200 bg-white rounded-2xl relative overflow-hidden group">
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-2xl border ${getRelationshipColor(m.relationship_label)}`}>
                        <Users size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base leading-tight">{m.name || m.relationship_label || 'Family Member'}</h3>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getRelationshipColor(m.relationship_label)}`}>
                            {m.relationship_label || 'Caregiver'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={m.role === 'owner' ? 'danger' : m.role === 'doctor' || m.role === 'nurse' ? 'warning' : 'info'} size="sm" className="capitalize">
                      {m.role || 'Caregiver'}
                    </Badge>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 space-y-1.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100 text-xs">
                    {m.email && (
                      <div className="flex items-center text-gray-700 truncate" title={m.email}>
                        <Mail size={13} className="mr-2 text-gray-400 shrink-0" />
                        <span className="truncate font-mono">{m.email}</span>
                      </div>
                    )}
                    {m.phone && (
                      <div className="flex items-center text-gray-700 font-medium">
                        <Phone size={13} className="mr-2 text-emerald-500 shrink-0" />
                        <span>{m.phone}</span>
                      </div>
                    )}
                    {!m.email && !m.phone && (
                      <span className="text-gray-400 italic">No direct contact details provided</span>
                    )}
                  </div>

                  {/* SOS Status Indicator */}
                  {m.is_emergency_contact && (
                    <div className="mt-3 flex items-center justify-between px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-100">
                      <span className="flex items-center">
                        <PhoneCall size={13} className="mr-1.5 animate-pulse text-red-600" />
                        Active SOS Call Recipient
                      </span>
                      <span className="text-[10px] bg-red-200/70 text-red-800 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        Live
                      </span>
                    </div>
                  )}

                  {/* Permissions Flags */}
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                    <p className="font-semibold text-gray-400 text-[11px] uppercase tracking-wider">Access Privileges</p>
                    <div className="grid grid-cols-2 gap-2 text-gray-700">
                      <span className={`flex items-center ${m.can_view_records ? 'text-green-700 font-medium' : 'text-gray-400 line-through'}`}>
                        <Eye size={13} className="mr-1.5" /> View Vitals
                      </span>
                      <span className={`flex items-center ${m.can_manage_meds ? 'text-green-700 font-medium' : 'text-gray-400 line-through'}`}>
                        <Pill size={13} className="mr-1.5" /> Manage Meds
                      </span>
                      <span className={`flex items-center ${m.can_receive_alerts ? 'text-green-700 font-medium' : 'text-gray-400 line-through'}`}>
                        <Bell size={13} className="mr-1.5" /> Receive Alerts
                      </span>
                      <span className={`flex items-center ${m.is_emergency_contact ? 'text-red-700 font-bold' : 'text-gray-400 line-through'}`}>
                        <Heart size={13} className="mr-1.5" /> Voice SOS
                      </span>
                    </div>
                  </div>

                  {/* Phone Call Actions */}
                  {m.phone && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleTriggerEmergencyAiCall(m.phone, m.name || m.relationship_label)}
                        disabled={isCallingEmergencyAi}
                        className="flex-1 text-center py-1.5 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-700 font-semibold rounded-lg text-xs flex items-center justify-center transition-colors border border-red-200"
                        title={`Trigger AI Voice Emergency Call to ${m.name || m.relationship_label}`}
                      >
                        {isCallingEmergencyAi ? (
                          <LoaderCircle size={12} className="mr-1 animate-spin text-red-600" />
                        ) : (
                          <PhoneCall size={12} className="mr-1 text-red-600" />
                        )}
                        AI Voice SOS
                      </button>
                      <a
                        href={`tel:${m.phone}`}
                        className="flex-1 text-center py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs flex items-center justify-center transition-colors"
                      >
                        <Phone size={12} className="mr-1 text-blue-600" /> Call
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer / Actions */}
                <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-gray-400">
                    {m.created_at ? `Added ${new Date(m.created_at).toLocaleDateString()}` : 'Active'}
                  </span>
                  <button
                    onClick={() => handleDeleteMember(memberId, m.name || m.relationship_label)}
                    disabled={isDeleting}
                    className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center space-x-1"
                    title="Remove member access"
                  >
                    <Trash2 size={14} className={isDeleting ? 'animate-spin' : ''} />
                    <span className="text-[11px] font-medium">Remove</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Invite Family Member or Caretaker">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
            <Input
              required
              placeholder="e.g. Rahul Sharma, Sister Anita, Dr. Priya"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship / Title *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={formData.relationship_label}
                onChange={e => setFormData({ ...formData, relationship_label: e.target.value })}
              >
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Spouse">Spouse (Husband / Wife)</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Visiting Nurse / Caretaker">Visiting Nurse / Caretaker</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Guardian">Guardian</option>
                <option value="Other">Other (Custom)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Access Role *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="caregiver">Caregiver (Full vitals & med management)</option>
                <option value="viewer">Viewer (Read-only vitals & records)</option>
                <option value="doctor">Nurse / Doctor (Clinical provider)</option>
                <option value="owner">Owner (Full administrative co-owner)</option>
              </select>
            </div>
          </div>

          {formData.relationship_label === 'Other' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Specify Relationship</label>
              <Input
                placeholder="e.g. Neighbor, Family Doctor, Social Worker"
                value={formData.custom_relationship}
                onChange={e => setFormData({ ...formData, custom_relationship: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="example@gmail.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="+91 9876543210"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2 pt-3 border-t text-xs">
            <p className="font-semibold text-gray-700">Permissions:</p>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.can_view_records}
                onChange={e => setFormData({ ...formData, can_view_records: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">View health records & vitals</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.can_manage_meds}
                onChange={e => setFormData({ ...formData, can_manage_meds: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Manage medications & dose schedules</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.can_receive_alerts}
                onChange={e => setFormData({ ...formData, can_receive_alerts: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Receive notifications on abnormal vitals</span>
            </label>

            <label className="flex items-center space-x-2 p-2.5 bg-red-50/80 rounded-xl border border-red-200/60 cursor-pointer text-red-900 font-medium">
              <input
                type="checkbox"
                checked={formData.is_emergency_contact}
                onChange={e => setFormData({ ...formData, is_emergency_contact: e.target.checked })}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span className="flex items-center">
                <PhoneCall size={14} className="mr-2 text-red-600" />
                Emergency Contact (Receives SOS phone call)
              </span>
            </label>

            {formData.role === 'doctor' && (
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start space-x-2">
                <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Doctor Consent Notice</p>
                  <p className="text-[11px] text-amber-800">
                    Doctors will only receive automated emergency voice calls if they provide explicit consent by having "Emergency Contact" checked above.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? 'Granting Access...' : 'Grant Access & Link SOS'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Multi-Number Emergency Broadcast Voice Call Status Modal */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="🚨 Emergency Voice SOS - Multi-Number Family Broadcast"
        maxWidth="max-w-2xl"
      >
        {broadcastResults && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start space-x-3 text-red-950">
              <div className="p-2 bg-red-100 rounded-lg text-red-700 shrink-0">
                <Radio size={20} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-red-900">
                    {broadcastResults.message || 'Emergency Voice Broadcast Dispatched'}
                  </h4>
                  <Badge variant="danger" size="sm">
                    {broadcastResults.total_contacts_dialed || broadcastResults.recipients?.length || 1} Dialed Simultaneously
                  </Badge>
                </div>
                <p className="text-xs text-red-800 mt-1">
                  Automated AI voice agent is connecting simultaneously to all registered family members and caretakers with clinical vitals and live GPS coordinates.
                </p>
              </div>
            </div>

            {/* Recipient Details List */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Recipients & Telephony Status
              </h5>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                {broadcastResults.recipients && broadcastResults.recipients.length > 0 ? (
                  broadcastResults.recipients.map((rec: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white flex items-center justify-between hover:bg-gray-50/70 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-gray-900 text-xs">{rec.name || 'Family Contact'}</span>
                            {rec.relationship && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                {rec.relationship}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 font-mono">{rec.phone_number || rec.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          rec.status === 'initiated' || rec.status === 'ringing' || rec.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rec.status || 'Initiated'}
                        </span>
                        {rec.call_id && (
                          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                            ID: {rec.call_id.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-white text-center text-xs text-gray-500">
                    Voice call dispatched to: {broadcastResults.phone_number || 'Registered Family Members'}
                  </div>
                )}
              </div>
            </div>

            {/* Provider and Telephony Details */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80 flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <Sparkles size={14} className="text-indigo-600" />
                <span>Voice Gateway: <strong>{broadcastResults.voice_provider || 'Sarvam AI Voice Agent'}</strong></span>
              </div>
              <div className="text-[11px] text-gray-400">
                Mode: Simultaneous Multi-Call Async
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsBroadcastModalOpen(false)} size="sm">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}