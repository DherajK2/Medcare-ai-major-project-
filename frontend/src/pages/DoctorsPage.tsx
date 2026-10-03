import { useState, useEffect } from 'react';
import { usePatients } from '../hooks/usePatients';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Stethoscope, Phone, Mail, MapPin, Plus, RefreshCw, Star } from 'lucide-react';
import { apiClient } from '../api/client';

export default function DoctorsPage() {
  const { currentPatient } = usePatients();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    specialty: 'Primary Care Physician',
    hospital: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    is_primary: false,
  });

  const fetchDoctors = async () => {
    if (!currentPatient?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/doctors/${currentPatient.id}`);
      setDoctors(res.data);
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [currentPatient?.id]);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient?.id) return;
    try {
      await apiClient.post('/api/doctors', {
        ...formData,
        patient_id: currentPatient.id,
      });
      setIsModalOpen(false);
      setFormData({ name: '', specialty: 'Primary Care Physician', hospital: '', phone: '', email: '', address: '', notes: '', is_primary: false });
      fetchDoctors();
    } catch (err) {
      console.error('Failed to add doctor', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Physicians & Care Team</h1>
          <p className="text-gray-500 text-sm">Manage treating doctors, specialists, and clinical contacts</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={fetchDoctors} disabled={loading}>
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={16} className="mr-2" /> Add Doctor
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {doctors.map(d => (
          <Card key={d.id} className="p-5 border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Stethoscope size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{d.name}</h3>
                    <p className="text-xs text-blue-600 font-medium">{d.specialty}</p>
                  </div>
                </div>
                {d.is_primary && (
                  <Badge variant="success" size="sm" className="flex items-center">
                    <Star size={10} className="mr-1 fill-green-500" /> Primary
                  </Badge>
                )}
              </div>

              <div className="mt-4 space-y-2 text-xs text-gray-600">
                {d.hospital && (
                  <p className="font-medium text-gray-800 flex items-center">
                    🏥 {d.hospital}
                  </p>
                )}
                {d.phone && (
                  <p className="flex items-center text-gray-700">
                    <Phone size={13} className="mr-1.5 text-gray-400" /> {d.phone}
                  </p>
                )}
                {d.email && (
                  <p className="flex items-center text-gray-700">
                    <Mail size={13} className="mr-1.5 text-gray-400" /> {d.email}
                  </p>
                )}
                {d.address && (
                  <p className="flex items-center text-gray-500">
                    <MapPin size={13} className="mr-1.5 text-gray-400 flex-shrink-0" /> {d.address}
                  </p>
                )}
                {d.notes && (
                  <div className="pt-2 border-t text-gray-500 text-[11px] italic">
                    "{d.notes}"
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex space-x-2">
              {d.phone && (
                <a
                  href={`tel:${d.phone}`}
                  className="flex-1 text-center py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs flex items-center justify-center transition-colors"
                >
                  <Phone size={13} className="mr-1.5" /> Call Doctor
                </a>
              )}
              {d.email && (
                <a
                  href={`mailto:${d.email}`}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-xs flex items-center justify-center transition-colors"
                >
                  <Mail size={13} />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add Doctor Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Physician">
        <form onSubmit={handleAddDoctor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Doctor's Full Name *</label>
            <Input required placeholder="e.g. Dr. Sarah Jenkins, MD" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Specialty *</label>
              <Input required placeholder="e.g. Cardiology, Endocrinology" value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Clinic / Hospital</label>
              <Input placeholder="Metro Health Medical Center" value={formData.hospital} onChange={e => setFormData({ ...formData, hospital: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <Input placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <Input type="email" placeholder="doctor@clinic.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Office Address</label>
            <Input placeholder="100 Medical Plaza, Suite 300" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          </div>
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="is_primary"
              checked={formData.is_primary}
              onChange={e => setFormData({ ...formData, is_primary: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="is_primary" className="text-xs font-medium text-gray-700">Set as Primary Care Physician (PCP)</label>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Physician</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}