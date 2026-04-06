import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../utils/api';

const PatientCard = ({ p, onOpen }) => (
  <div className="bg-card border border-border rounded-xl p-4 shadow-soft cursor-pointer" onClick={onOpen}>
    <div className="font-semibold">{p.name}</div>
    <div className="text-sm text-muted-foreground">Risk: {p.risk || '—'}</div>
  </div>
);

const DoctorDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [name, setName] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;
    const loadPatients = async () => {
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(buildApiUrl('/api/doctor/patients'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (mounted) setPatients(data?.patients || []);
    };
    loadPatients();
    return () => { mounted = false; };
  }, [user]);

  const addPatient = async () => {
    if (!name.trim()) return;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(buildApiUrl('/api/doctor/patients'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName('');
    const res = await fetch(buildApiUrl('/api/doctor/patients'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setPatients(data?.patients || []);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-10 px-4 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Doctor Dashboard</h1>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-soft">
          <div className="text-lg font-semibold mb-2">Add Patient</div>
          <div className="flex gap-2">
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Patient name" className="flex-1 bg-input px-3 py-2 rounded-lg outline-none" />
            <Button onClick={addPatient}>Add</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {patients.map((p) => (
            <div key={p.id}>
              <PatientCard p={p} onOpen={() => navigate(`/doctor/${p.id}`)} />
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Tip: You can extend this to show vitals, uploaded reports, and alerts.</div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
