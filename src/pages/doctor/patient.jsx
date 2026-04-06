import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { storage } from '../../firebase/config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../utils/api';

const Row = ({ left, right }) => (
  <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
    <div className="text-sm text-muted-foreground">{left}</div>
    <div className="font-medium">{right}</div>
  </div>
);

const PatientDetail = () => {
  const { patientId } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [risk, setRisk] = useState('Low');
  const [rx, setRx] = useState({ drug: '', dose: '', note: '' });
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      if (!user) return;
      const token = await user.getIdToken();

      const [pRes, rxRes, repRes] = await Promise.all([
        fetch(buildApiUrl(`/api/doctor/patients/${patientId}`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl(`/api/doctor/patients/${patientId}/prescriptions`), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl(`/api/doctor/patients/${patientId}/reports`), { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const pData = await pRes.json();
      const rxData = await rxRes.json();
      const repData = await repRes.json();

      if (!mounted) return;
      if (pData?.patient) {
        setPatient(pData.patient);
        setRisk(pData.patient.risk || 'Low');
      }
      setPrescriptions(rxData?.prescriptions || []);
      setReports(repData?.reports || []);
    };
    loadAll();
    return () => { mounted = false; };
  }, [patientId, user]);

  const saveRisk = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(buildApiUrl(`/api/doctor/patients/${patientId}`), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ risk }),
    });
  };

  const addPrescription = async () => {
    if (!rx.drug || !rx.dose) return;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(buildApiUrl(`/api/doctor/patients/${patientId}/prescriptions`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        drug: rx.drug,
        dose: rx.dose,
        note: rx.note,
      }),
    });
    setRx({ drug: '', dose: '', note: '' });
    const res = await fetch(buildApiUrl(`/api/doctor/patients/${patientId}/prescriptions`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setPrescriptions(data?.prescriptions || []);
  };

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const storageRef = ref(storage, `patients/${patientId}/reports/${Date.now()}_${file.name}`);
    const task = uploadBytesResumable(storageRef, file);
    setUploading(true);
    task.on('state_changed', (s) => {
      const pct = Math.round((s.bytesTransferred / s.totalBytes) * 100);
      setProgress(pct);
    }, () => setUploading(false), async () => {
      const url = await getDownloadURL(task.snapshot.ref);
      if (user) {
        const token = await user.getIdToken();
        await fetch(buildApiUrl(`/api/doctor/patients/${patientId}/reports`), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: file.name,
            type: file.type,
            size: file.size,
            url,
          }),
        });
        const res = await fetch(buildApiUrl(`/api/doctor/patients/${patientId}/reports`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setReports(data?.reports || []);
      }
      setUploading(false);
      setProgress(0);
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-10 px-4 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Patient Details</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            {/* Summary */}
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <div className="text-lg font-semibold mb-2">{patient?.name || '—'}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Row left="Risk" right={patient?.risk || '—'} />
              </div>
            </div>

            {/* Prescriptions */}
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <div className="text-lg font-semibold mb-2">Prescriptions</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input label="Medicine" value={rx.drug} onChange={(e)=>setRx((x)=>({ ...x, drug: e.target.value }))} />
                <Input label="Dose" value={rx.dose} onChange={(e)=>setRx((x)=>({ ...x, dose: e.target.value }))} />
                <Input label="Notes" value={rx.note} onChange={(e)=>setRx((x)=>({ ...x, note: e.target.value }))} />
              </div>
              <div className="mt-3 text-right"><Button size="sm" onClick={addPrescription}>Add Prescription</Button></div>
              <div className="mt-4 space-y-2">
                {prescriptions.map((p)=>(
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div>
                      <div className="font-medium">{p.drug} — {p.dose}</div>
                      {p.note && <div className="text-xs text-muted-foreground">{p.note}</div>}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reports */}
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <div className="text-lg font-semibold mb-2">Reports</div>
              <div className="flex items-center gap-2">
                <input type="file" onChange={onUpload} />
                {uploading && <div className="text-sm text-muted-foreground">Uploading… {progress}%</div>}
              </div>
              <div className="mt-3 space-y-2">
                {reports.map((r)=>(
                  <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="block p-3 rounded-lg bg-muted">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.type || 'file'} • {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <aside className="space-y-4">
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft">
              <div className="text-lg font-semibold mb-2">Risk Profile</div>
              <select value={risk} onChange={(e)=>setRisk(e.target.value)} className="w-full bg-input px-3 py-2 rounded-lg outline-none">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <div className="mt-3 text-right"><Button size="sm" onClick={saveRisk}>Save</Button></div>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-soft text-sm text-muted-foreground">
              Upload ultrasound, scan reports, and lab tests. Add safe prescriptions with doses.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default PatientDetail;
