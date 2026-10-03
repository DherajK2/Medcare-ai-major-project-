import { useState } from 'react';
import { usePatients } from '../hooks/usePatients';
import { patientsApi } from '../api/patients';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Users, UserPlus, CheckCircle, Trash2, Edit3, FileText, Pill, Sparkles, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PatientPage() {
  const { patients, activePatientId, setActivePatient, refetch, loading } = usePatients();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<any>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: 'male',
    date_of_birth: '',
    blood_type: 'O+',
    phone: '+91 ',
    address: '',
    medical_notes: '',
    allergies: '',
  });

  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        gender: formData.gender,
        blood_type: formData.blood_type,
        phone: (formData.phone.trim() === '+91' || formData.phone.trim() === '+91 ') ? undefined : formData.phone.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        address: formData.address.trim() || undefined,
        medical_notes: formData.medical_notes.trim() || undefined,
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      const created = await patientsApi.createPatient(payload);
      setIsAddModalOpen(false);
      showToast(`✅ Profile for "${formData.first_name} ${formData.last_name}" created successfully!`);
      setFormData({
        first_name: '',
        last_name: '',
        gender: 'male',
        date_of_birth: '',
        blood_type: 'O+',
        phone: '+91 ',
        address: '',
        medical_notes: '',
        allergies: '',
      });
      await refetch();
      if (created?.id) {
        setActivePatient(created.id);
      }
    } catch (err: any) {
      console.error('Failed to create patient:', err);
      showToast('Error creating patient. Please verify details.', 'error');
    }
  };

  const openEditModal = (p: any) => {
    setSelectedPatientForEdit(p);
    setFormData({
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      gender: p.gender || 'male',
      date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : '',
      blood_type: p.blood_type || 'O+',
      phone: p.phone || '',
      address: p.address || '',
      medical_notes: p.medical_notes || '',
      allergies: Array.isArray(p.allergies) ? p.allergies.join(', ') : '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForEdit?.id) return;
    try {
      const payload: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        gender: formData.gender,
        blood_type: formData.blood_type,
        phone: formData.phone.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        address: formData.address.trim() || undefined,
        medical_notes: formData.medical_notes.trim() || undefined,
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      await patientsApi.updatePatient(selectedPatientForEdit.id, payload);
      setIsEditModalOpen(false);
      showToast(`✅ Details for "${formData.first_name} ${formData.last_name}" saved successfully!`);
      await refetch();
    } catch (err: any) {
      console.error('Failed to update patient:', err);
      showToast('Error updating patient details.', 'error');
    }
  };

  const handleDeletePatient = async (p: any) => {
    if (patients.length <= 1) {
      alert('You must have at least one registered patient profile in the platform.');
      return;
    }
    const confirmMsg = `Are you sure you want to delete patient "${p.first_name} ${p.last_name}"? All associated prescriptions, medical documents, and records will be purged.`;
    if (!confirm(confirmMsg)) return;

    try {
      await patientsApi.deletePatient(p.id);
      showToast(`✅ Profile for "${p.first_name} ${p.last_name}" deleted.`);
      await refetch();
      if (activePatientId === p.id) {
        const remaining = patients.filter(item => item.id !== p.id);
        if (remaining.length > 0) {
          setActivePatient(remaining[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to delete patient:', err);
      showToast('Error deleting patient.', 'error');
    }
  };

  const activePatient = patients.find(p => p.id === activePatientId) || patients[0];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users size={26} className="text-blue-600 mr-2" /> Family Patients & Care Profiles
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage profiles for all monitored family members, switch active patient context, or add new records.
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center shadow-sm">
          <UserPlus size={16} className="mr-2" /> Add New Patient
        </Button>
      </div>

      {toast && (
        <div className={`p-4 rounded-xl text-sm flex items-center shadow-xs animate-in fade-in duration-200 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <CheckCircle size={18} className="mr-2 text-emerald-600 shrink-0" />
          <span className="font-medium">{toast.text}</span>
        </div>
      )}

      {/* Active Patient Focus Banner */}
      {activePatient && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-2xl font-bold text-white shadow-inner">
              {activePatient.first_name?.[0]}{activePatient.last_name?.[0]}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-emerald-500/90 text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                  Active Monitoring
                </span>
                <span className="text-xs text-blue-200">ID: {activePatient.id?.slice(0, 8)}...</span>
              </div>
              <h2 className="text-2xl font-black mt-0.5">{activePatient.first_name} {activePatient.last_name}</h2>
              <div className="flex flex-wrap gap-3 text-xs text-blue-100 mt-1.5">
                <span>Gender: <strong className="capitalize">{activePatient.gender || 'Not specified'}</strong></span>
                <span>•</span>
                <span>Blood: <strong>{activePatient.blood_type || 'Unknown'}</strong></span>
                {activePatient.date_of_birth && (
                  <>
                    <span>•</span>
                    <span>DOB: <strong>{activePatient.date_of_birth.split('T')[0]}</strong></span>
                  </>
                )}
                {activePatient.address && (
                  <>
                    <span>•</span>
                    <span className="flex items-center"><MapPin size={12} className="mr-1" /> {activePatient.address}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Hub Navigation */}
          <div className="flex flex-wrap gap-2 pt-2 md:pt-0">
            <Link to="/documents" className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium flex items-center transition-colors">
              <FileText size={13} className="mr-1.5" /> Upload Reports
            </Link>
            <Link to="/medications" className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium flex items-center transition-colors">
              <Pill size={13} className="mr-1.5" /> Medications
            </Link>
            <Link to="/chat" className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium flex items-center transition-colors">
              <Sparkles size={13} className="mr-1.5" /> AI Companion
            </Link>
          </div>
        </div>
      )}

      {/* Patient Directory Grid */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">All Registered Patients ({patients.length})</h2>
          <span className="text-xs text-gray-500">Click "Set Active" to switch app view to that family member</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading patient directory...</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {patients.map((p) => {
              const isActive = p.id === activePatientId;
              return (
                <Card
                  key={p.id}
                  className={`p-5 rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                    isActive
                      ? 'border-2 border-blue-600 bg-blue-50/20 shadow-md ring-2 ring-blue-500/10'
                      : 'border border-gray-200 hover:border-blue-300 hover:shadow'
                  }`}
                >
                  <div>
                    {/* Top Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {p.first_name?.[0]}{p.last_name?.[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-base leading-snug">
                            {p.first_name} {p.last_name}
                          </h3>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="text-xs text-gray-500 capitalize">{p.gender || 'Patient'}</span>
                            <span className="text-gray-300">•</span>
                            <Badge variant="info" size="sm">
                              {p.blood_type || 'Blood: N/A'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <span className="p-1 text-blue-600 bg-blue-100 rounded-full" title="Currently Selected">
                          <CheckCircle size={16} />
                        </span>
                      )}
                    </div>

                    {/* Patient Details & Clinical Notes */}
                    <div className="mt-4 space-y-2 text-xs">
                      {p.date_of_birth && (
                        <div className="text-gray-600">
                          <span className="text-gray-400 font-medium">DOB:</span> {p.date_of_birth.split('T')[0]}
                        </div>
                      )}
                      {p.address && (
                        <div className="text-gray-600 flex items-start">
                          <MapPin size={12} className="mr-1 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{p.address}</span>
                        </div>
                      )}
                      {p.medical_notes && (
                        <div className="p-2.5 bg-gray-50 rounded-lg text-gray-700 border border-gray-100 line-clamp-2">
                          <strong className="text-gray-900">Diagnosis/Notes:</strong> {p.medical_notes}
                        </div>
                      )}
                      {p.allergies && p.allergies.length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center pt-1">
                          <span className="text-gray-400 text-[11px]">Allergies:</span>
                          {p.allergies.map((a, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-medium">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    {isActive ? (
                      <span className="text-xs font-semibold text-blue-700 flex items-center">
                        <CheckCircle size={14} className="mr-1 text-blue-600" /> Active Profile
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActivePatient(p.id)}
                        className="text-xs flex-1"
                      >
                        Set as Active
                      </Button>
                    )}

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Patient Details"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeletePatient(p)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Patient"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Patient / Family Member">
        <form onSubmit={handleAddPatient} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
              <Input
                required
                placeholder="e.g. Ramesh"
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name *</label>
              <Input
                required
                placeholder="e.g. Kumar"
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
              <Input
                type="date"
                className="w-full text-sm px-3"
                value={formData.date_of_birth}
                onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Gender *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-2 min-h-[44px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Type</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-2 min-h-[44px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.blood_type}
                  onChange={e => setFormData({ ...formData, blood_type: e.target.value })}
                >
                  <option value="O+">O+</option>
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="AB+">AB+</option>
                  <option value="O-">O-</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Primary Phone / Emergency WhatsApp Number (e.g. +91 9876543210)
            </label>
            <Input
              type="tel"
              placeholder="e.g. +91 9876543210"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Residential Address / City</label>
            <Input
              placeholder="e.g. 14th Cross, Jayanagar, Mysuru, Karnataka"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Medical Conditions / Clinical Notes</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={2}
              placeholder="e.g. Type 2 Diabetes, Mild Hypertension, or Post-surgical recovery"
              value={formData.medical_notes}
              onChange={e => setFormData({ ...formData, medical_notes: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Known Allergies (comma-separated)</label>
            <Input
              placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
              value={formData.allergies}
              onChange={e => setFormData({ ...formData, allergies: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Patient Profile</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Patient Details">
        <form onSubmit={handleUpdatePatient} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
              <Input
                required
                value={formData.first_name}
                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name *</label>
              <Input
                required
                value={formData.last_name}
                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
              <Input
                type="date"
                className="w-full text-sm px-3"
                value={formData.date_of_birth}
                onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-2 min-h-[44px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Type</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-2 min-h-[44px] text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.blood_type}
                  onChange={e => setFormData({ ...formData, blood_type: e.target.value })}
                >
                  <option value="O+">O+</option>
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="AB+">AB+</option>
                  <option value="O-">O-</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Primary Phone / Emergency WhatsApp Number (e.g. +91 9876543210)
            </label>
            <Input
              type="tel"
              placeholder="e.g. +91 9876543210"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
            <Input
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Medical Notes / Diagnosis</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={2}
              value={formData.medical_notes}
              onChange={e => setFormData({ ...formData, medical_notes: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Known Allergies</label>
            <Input
              value={formData.allergies}
              onChange={e => setFormData({ ...formData, allergies: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}