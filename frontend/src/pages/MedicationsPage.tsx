import { useState, useEffect } from 'react';
import { usePatients } from '../hooks/usePatients';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Pill, Plus, Trash2, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';

export default function MedicationsPage() {
  const { currentPatient } = usePatients();
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    dosage: '',
    frequency: 'Once daily',
    route: 'oral',
    start_date: new Date().toISOString().split('T')[0],
    prescribing_doctor: '',
    instructions: '',
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMedications = async () => {
    if (!currentPatient?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/medications/${currentPatient.id}`);
      setMedications(res.data);
    } catch (err) {
      console.error('Failed to fetch medications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [currentPatient?.id]);

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient?.id) return;
    try {
      await apiClient.post('/api/medications', {
        ...formData,
        patient_id: currentPatient.id,
      });
      setIsModalOpen(false);
      showToast(`✅ "${formData.name}" added to prescriptions & automated WhatsApp reminders scheduled!`);
      setFormData({
        name: '',
        generic_name: '',
        dosage: '',
        frequency: 'Once daily',
        route: 'oral',
        start_date: new Date().toISOString().split('T')[0],
        prescribing_doctor: '',
        instructions: '',
      });
      fetchMedications();
    } catch (err: any) {
      console.error('Failed to add medication', err);
      showToast('Error adding medication. Please verify details.', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from prescribed medications?`)) return;
    try {
      await apiClient.delete(`/api/medications/${id}`);
      setMedications(prev => prev.filter(m => m.id !== id));
      showToast(`✅ "${name}" removed from active prescriptions.`);
    } catch (err) {
      console.error('Failed to delete', err);
      showToast('Error removing medication.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medications & Prescriptions</h1>
          <p className="text-gray-500 text-sm">Schedule doses, monitor adherence, and manage active prescriptions</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchMedications} disabled={loading}>
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={16} className="mr-2" /> Add Medication
          </Button>
        </div>
      </div>

      {toast && (
        <div className={`p-4 rounded-xl text-sm flex items-center shadow-xs animate-in fade-in duration-200 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <CheckCircle2 size={18} className="mr-2 text-emerald-600 shrink-0" />
          <span className="font-medium">{toast.text}</span>
        </div>
      )}

      {/* Automated Timed Reminders Status Banner */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-900 flex items-center">
              <span>Automated Background WhatsApp Reminders Active</span>
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 font-bold rounded-md">LIVE 24/7</span>
            </div>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Scheduled doses automatically trigger WhatsApp alerts to the patient's registered phone number without manual interaction.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            if (!currentPatient?.id) return;
            try {
              const res = await apiClient.post(`/api/notifications/trigger-now/${currentPatient.id}`);
              if (res.data?.whatsapp_link) {
                window.open(res.data.whatsapp_link, '_blank');
              }
              showToast(`⚡ WhatsApp reminder dispatched for ${currentPatient.first_name} to ${currentPatient.phone || 'mobile'}!`);
            } catch (e) {
              showToast('Failed to trigger reminder alert.', 'error');
            }
          }}
          className="bg-white hover:bg-blue-50 text-blue-700 border-blue-300 text-xs shrink-0 font-semibold"
        >
          ⚡ Test WhatsApp Alert Now
        </Button>
      </div>

      {medications.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <Pill size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700">No active medications scheduled</p>
          <p className="text-sm text-gray-400 mt-1">Click "Add Medication" to schedule a prescription</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {medications.map(m => (
            <Card key={m.id} className="p-5 border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                      <Pill size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{m.name}</h3>
                      <p className="text-xs text-gray-500 font-medium">{m.dosage} • {m.route}</p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>

                <div className="mt-4 space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center"><Clock size={13} className="mr-1" /> Frequency:</span>
                    <span className="font-medium text-gray-800">{m.frequency}</span>
                  </div>
                  {m.prescribing_doctor && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Doctor:</span>
                      <span className="font-medium text-gray-800">{m.prescribing_doctor}</span>
                    </div>
                  )}
                  {m.instructions && (
                    <div className="pt-1 border-t border-gray-200 text-gray-700">
                      <strong>Notes:</strong> {m.instructions}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                <span className="text-gray-400">Started {new Date(m.start_date).toLocaleDateString()}</span>
                <button
                  onClick={() => handleDelete(m.id, m.name)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Medication Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Medication">
        <form onSubmit={handleAddMedication} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Medication Name *</label>
            <Input required placeholder="e.g. Lisinopril or Metformin" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Dosage *</label>
              <Input required placeholder="e.g. 500mg" value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Frequency *</label>
              <Input required placeholder="e.g. Twice daily with meals" value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Route</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                value={formData.route}
                onChange={e => setFormData({ ...formData, route: e.target.value })}
              >
                <option value="oral">Oral (Tablet / Liquid)</option>
                <option value="injection">Subcutaneous Injection</option>
                <option value="topical">Topical / Patch</option>
                <option value="inhalation">Inhaler</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prescribing Doctor</label>
              <Input placeholder="e.g. Dr. Jenkins" value={formData.prescribing_doctor} onChange={e => setFormData({ ...formData, prescribing_doctor: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Instructions / Notes</label>
            <Input placeholder="Take after breakfast with water" value={formData.instructions} onChange={e => setFormData({ ...formData, instructions: e.target.value })} />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Medication</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}