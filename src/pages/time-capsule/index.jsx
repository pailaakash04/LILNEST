import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../utils/api';
import { storage } from '../../firebase/config';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

// Capsule Card Component
const CapsuleCard = ({ capsule, onClick }) => {
  const getStatusColor = (status) => {
    if (status === 'locked') return 'from-blue-400 to-blue-500';
    if (status === 'editable') return 'from-amber-400 to-orange-400';
    return 'from-emerald-400 to-green-500';
  };

  const getStatusIcon = (status) => {
    if (status === 'locked') return 'Lock';
    if (status === 'editable') return 'Edit';
    return 'Unlock';
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-gradient-to-br from-card to-card/50 rounded-3xl p-6 border border-border hover:border-primary/50 cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl overflow-hidden"
    >
      {/* Animated Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Status Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r ${getStatusColor(capsule.status)} text-white text-xs font-bold shadow-lg flex items-center gap-1`}>
        <Icon name={getStatusIcon(capsule.status)} className="w-3 h-3" />
        {capsule.status === 'locked' ? 'Locked' : capsule.status === 'editable' ? 'Editable' : 'Unlocked'}
      </div>

      <div className="relative">
        {/* Icon */}
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${capsule.gradient} flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
          <Icon name={capsule.icon} className="w-10 h-10 text-white" />
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
            {capsule.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {capsule.description}
          </p>
        </div>

        {/* Unlock Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Icon name="Calendar" className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Created {capsule.createdDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="Clock" className="w-4 h-4 text-purple-500" />
            <span className="font-semibold text-purple-600">{capsule.unlockText}</span>
          </div>
        </div>

        {/* Media Count */}
        {capsule.mediaCount > 0 && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-border/50">
            {capsule.photos > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon name="Image" className="w-4 h-4" />
                <span>{capsule.photos}</span>
              </div>
            )}
            {capsule.videos > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon name="Video" className="w-4 h-4" />
                <span>{capsule.videos}</span>
              </div>
            )}
            {capsule.audio > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icon name="Mic" className="w-4 h-4" />
                <span>{capsule.audio}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Template Card Component
const TemplateCard = ({ template, onClick }) => (
  <div
    onClick={onClick}
    className="group relative bg-gradient-to-br from-card to-card/30 rounded-3xl p-6 border border-border hover:border-primary/50 cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl overflow-hidden"
  >
    {/* Animated Background */}
    <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient} opacity-3 group-hover:opacity-8 transition-opacity duration-500`}></div>
    
    <div className="relative">
      {/* Icon */}
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${template.gradient} flex items-center justify-center mb-4 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
        <Icon name={template.icon} className="w-8 h-8 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
        {template.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
        {template.description}
      </p>

      {/* Unlock Age */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold">
        <Icon name="Gift" className="w-3 h-3" />
        Unlock at {template.unlockAge}
      </div>
    </div>
  </div>
);

const CapsuleDetailsModal = ({ capsule, onClose }) => {
  if (!capsule) return null;

  const media = capsule.media || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-primary/20">
        <div className="sticky top-0 bg-gradient-to-r from-primary to-primary text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{capsule.title}</h2>
              <p className="text-white/80 text-sm">{capsule.unlockText}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <Icon name="X" className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-foreground mb-2">Message</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{capsule.description || 'No message added.'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-card rounded-xl border border-border p-3">
              <p className="text-muted-foreground">Created</p>
              <p className="font-semibold text-foreground">{capsule.createdDate}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-3">
              <p className="text-muted-foreground">Status</p>
              <p className="font-semibold text-foreground capitalize">{capsule.status}</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-3">
              <p className="text-muted-foreground">Memories</p>
              <p className="font-semibold text-foreground">{capsule.mediaCount}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">Uploaded Media</h3>
            {media.length === 0 ? (
              <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                No media files in this capsule.
              </div>
            ) : (
              <div className="space-y-4">
                {media.map((item) => (
                  <div key={item.id || item.storageUrl} className="rounded-xl border border-border p-3 bg-card/70">
                    {item.type === 'image' && (
                      <img src={item.storageUrl} alt="Capsule upload" className="w-full max-h-64 object-contain rounded-lg" />
                    )}
                    {item.type === 'video' && (
                      <video controls className="w-full rounded-lg" src={item.storageUrl} />
                    )}
                    {item.type === 'audio' && (
                      <audio controls className="w-full" src={item.storageUrl} />
                    )}
                    {!['image', 'video', 'audio'].includes(item.type) && (
                      <a href={item.storageUrl} target="_blank" rel="noreferrer" className="text-primary underline text-sm">
                        Open file
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Create Capsule Modal
const CreateCapsuleModal = ({ isOpen, onClose, template, user, onCreated }) => {
  const defaultCapsuleData = {
    title: template?.title || '',
    message: '',
    memoryType: 'letter',
    photos: [],
    videos: [],
    audio: [],
    unlockDate: '',
    unlockType: 'age',
  };

  const [step, setStep] = useState(1);
  const [capsuleData, setCapsuleData] = useState(defaultCapsuleData);
  const [isCreating, setIsCreating] = useState(false);
  const photosInputRef = useRef(null);
  const videosInputRef = useRef(null);
  const audioInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setIsCreating(false);
    setCapsuleData({ ...defaultCapsuleData, title: template?.title || '' });
  }, [isOpen, template]);

  if (!isOpen) return null;

  const unlockOptions = [
    { id: 'birth', label: 'At Birth', icon: 'Baby', age: '0' },
    { id: '1year', label: '1st Birthday', icon: 'Cake', age: '1' },
    { id: '5years', label: '5 Years Old', icon: 'School', age: '5' },
    { id: '10years', label: '10 Years Old', icon: 'BookOpen', age: '10' },
    { id: '13years', label: 'Teenage Years', icon: 'Users', age: '13' },
    { id: '18years', label: '18th Birthday', icon: 'Award', age: '18' },
    { id: 'wedding', label: 'Wedding Day', icon: 'Heart', age: '25+' },
    { id: 'custom', label: 'Custom Date', icon: 'Calendar', age: 'Custom' }
  ];

  const memoryTypeOptions = [
    {
      id: 'letter',
      icon: 'FileText',
      title: 'Letter',
      description: 'Write a heartfelt message',
    },
    {
      id: 'photos',
      icon: 'Camera',
      title: 'Photos',
      description: 'Capture precious moments',
    },
    {
      id: 'videos',
      icon: 'Video',
      title: 'Video',
      description: 'Upload a video message',
    },
    {
      id: 'audio',
      icon: 'Mic',
      title: 'Voice Note',
      description: 'Upload your audio note',
    },
  ];

  const handleMediaSelect = (type, files) => {
    if (!files?.length) return;

    const selectedFiles = Array.from(files);
    setCapsuleData((prev) => ({
      ...prev,
      [type]: [...prev[type], ...selectedFiles],
    }));
  };

  const removeMediaItem = (type, index) => {
    setCapsuleData((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const hasSelectedMemoryMedia = () => {
    if (capsuleData.memoryType === 'photos') return capsuleData.photos.length > 0;
    if (capsuleData.memoryType === 'videos') return capsuleData.videos.length > 0;
    if (capsuleData.memoryType === 'audio') return capsuleData.audio.length > 0;
    return true;
  };

  const handleCreate = async () => {
    if (!user) {
      alert('Please log in to create a time capsule.');
      return;
    }

    if (!capsuleData.title || !capsuleData.message) {
      alert('Please add title and message before creating the capsule.');
      return;
    }

    if (!hasSelectedMemoryMedia()) {
      alert(`Please upload at least one ${capsuleData.memoryType === 'audio' ? 'audio file' : capsuleData.memoryType.slice(0, -1)}.`);
      return;
    }

    setIsCreating(true);

    try {
      const token = await user.getIdToken();
      const unlockType = capsuleData.unlockType === 'custom' ? 'custom' : 'age';

      const res = await fetch(buildApiUrl('/api/time-capsules'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: capsuleData.title,
          message: capsuleData.message,
          unlockType,
          unlockDate: capsuleData.unlockDate || null,
          meta: {
            memoryType: capsuleData.memoryType,
            unlockOption: capsuleData.unlockType,
            templateId: template?.id || null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || 'Failed to create capsule.');
        return;
      }

      const mediaQueue = [
        ...capsuleData.photos.map((file) => ({ file, type: 'image' })),
        ...capsuleData.videos.map((file) => ({ file, type: 'video' })),
        ...capsuleData.audio.map((file) => ({ file, type: 'audio' })),
      ];

      let failedUploads = 0;
      for (const item of mediaQueue) {
        try {
          const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `time-capsules/${user.uid}/${data.id}/${Date.now()}-${safeName}`;
          const fileRef = ref(storage, storagePath);
          await uploadBytes(fileRef, item.file);
          const downloadUrl = await getDownloadURL(fileRef);

          await fetch(buildApiUrl(`/api/time-capsules/${data.id}/media`), {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: item.type,
              storageUrl: downloadUrl,
            }),
          });
        } catch {
          failedUploads += 1;
        }
      }

      if (failedUploads > 0) {
        alert(`Capsule created, but ${failedUploads} media file(s) failed to upload.`);
      }

      if (onCreated) await onCreated();
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-primary/20">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-primary text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Create Time Capsule</h2>
              <p className="text-white/80 text-sm">A gift from today to tomorrow</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <Icon name="X" className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-2 rounded-full bg-white/30 overflow-hidden">
                <div 
                  className={`h-full bg-white transition-all duration-500 ${i <= step ? 'w-full' : 'w-0'}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">Choose Your Memory Type</h3>
                <div className="grid grid-cols-2 gap-4">
                  {memoryTypeOptions.map((option) => {
                    const selected = capsuleData.memoryType === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setCapsuleData((prev) => ({ ...prev, memoryType: option.id }))}
                        className={`p-4 border-2 rounded-2xl text-left transition-all ${
                          selected
                            ? 'bg-primary/10 border-primary hover:bg-primary/20'
                            : 'bg-card border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon name={option.icon} className={`w-8 h-8 mb-2 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <h4 className="font-bold text-foreground">{option.title}</h4>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button onClick={() => setStep(2)} className="w-full" size="lg">
                Continue
                <Icon name="ArrowRight" className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">Add Your Memory</h3>
                <p className="text-sm text-muted-foreground mb-4 capitalize">
                  Selected type: {capsuleData.memoryType === 'audio' ? 'voice note' : capsuleData.memoryType}
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Title</label>
                    <input
                      type="text"
                      value={capsuleData.title}
                      onChange={(e) => setCapsuleData({ ...capsuleData, title: e.target.value })}
                      placeholder="e.g., First Day Home"
                      className="w-full px-4 py-3 bg-card border-2 border-border focus:border-primary rounded-xl outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Your Message</label>
                    <textarea
                      value={capsuleData.message}
                      onChange={(e) => setCapsuleData({ ...capsuleData, message: e.target.value })}
                      placeholder="What do you want your child to know about this moment? How did you feel today?"
                      className="w-full h-48 px-4 py-3 bg-card border-2 border-border focus:border-primary rounded-xl outline-none resize-none transition-colors"
                    />
                  </div>
                  
                  {/* Media Upload */}
                  <input
                    ref={photosInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleMediaSelect('photos', e.target.files)}
                  />
                  <input
                    ref={videosInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleMediaSelect('videos', e.target.files)}
                  />
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleMediaSelect('audio', e.target.files)}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => photosInputRef.current?.click()}
                      className="p-4 bg-card border-2 border-dashed border-border hover:border-primary rounded-xl transition-all"
                    >
                      <Icon name="Image" className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Upload Photos</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{capsuleData.photos.length} selected</p>
                    </button>
                    <button
                      onClick={() => videosInputRef.current?.click()}
                      className="p-4 bg-card border-2 border-dashed border-border hover:border-primary rounded-xl transition-all"
                    >
                      <Icon name="Video" className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Upload Video</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{capsuleData.videos.length} selected</p>
                    </button>
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className="p-4 bg-card border-2 border-dashed border-border hover:border-primary rounded-xl transition-all"
                    >
                      <Icon name="Mic" className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Upload Audio</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{capsuleData.audio.length} selected</p>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'photos', label: 'Photos', icon: 'Image' },
                      { key: 'videos', label: 'Videos', icon: 'Video' },
                      { key: 'audio', label: 'Audio', icon: 'Mic' },
                    ].map((section) => (
                      <div key={section.key} className="rounded-xl border border-border p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon name={section.icon} className="w-4 h-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">{section.label}</p>
                        </div>
                        {capsuleData[section.key].length === 0 ? (
                          <p className="text-xs text-muted-foreground">No files selected</p>
                        ) : (
                          <div className="space-y-2">
                            {capsuleData[section.key].map((file, index) => (
                              <div key={`${section.key}-${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-card/70 px-3 py-2">
                                <p className="text-xs text-foreground truncate pr-3">{file.name}</p>
                                <button
                                  onClick={() => removeMediaItem(section.key, index)}
                                  className="text-xs text-red-500 hover:text-red-600"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                  <Icon name="ArrowLeft" className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1" disabled={!capsuleData.title || !capsuleData.message || !hasSelectedMemoryMedia()}>
                  Continue
                  <Icon name="ArrowRight" className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">When Should This Unlock?</h3>
                <div className="grid grid-cols-2 gap-4">
                  {unlockOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setCapsuleData({ ...capsuleData, unlockType: option.id })}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${
                        capsuleData.unlockType === option.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon name={option.icon} className="w-8 h-8 text-primary mb-2" />
                      <h4 className="font-bold text-foreground">{option.label}</h4>
                      <p className="text-xs text-muted-foreground">Age {option.age}</p>
                    </button>
                  ))}
                </div>
                {capsuleData.unlockType === 'custom' && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-foreground mb-2">Choose Date</label>
                    <input
                      type="date"
                      value={capsuleData.unlockDate}
                      onChange={(e) => setCapsuleData({ ...capsuleData, unlockDate: e.target.value })}
                      className="w-full px-4 py-3 bg-card border-2 border-border focus:border-primary rounded-xl outline-none"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                  <Icon name="ArrowLeft" className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Continue
                  <Icon name="ArrowRight" className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">Review & Lock</h3>
                
                {/* Summary */}
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 mb-6 border border-primary/20">
                  <h4 className="font-bold text-foreground mb-4">Capsule Summary</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title</span>
                      <span className="font-semibold">{capsuleData.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Message Length</span>
                      <span className="font-semibold">{capsuleData.message.length} characters</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unlock Type</span>
                      <span className="font-semibold capitalize">{capsuleData.unlockType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Media Files</span>
                      <span className="font-semibold">
                        {capsuleData.photos.length + capsuleData.videos.length + capsuleData.audio.length}
                      </span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-border">
                      <span className="font-bold text-foreground">Lock Status</span>
                      <span className="text-sm text-yellow-600">24-hour edit window</span>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                  <div className="flex gap-3">
                    <Icon name="AlertCircle" className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-yellow-600 mb-1">Important</h4>
                      <p className="text-sm text-muted-foreground">
                        After 24 hours, this capsule will be permanently locked and cannot be edited. This ensures authenticity of your memory.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(3)} variant="outline" className="flex-1">
                  <Icon name="ArrowLeft" className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button onClick={handleCreate} className="flex-1" loading={isCreating} disabled={isCreating}>
                  <Icon name="Lock" className="w-5 h-5 mr-2" />
                  Create & Lock Capsule
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TimeCapsule = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-capsules');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [myCapsules, setMyCapsules] = useState([]);
  const [loadError, setLoadError] = useState('');

  const mapCapsule = (capsule) => {
    const createdDate = capsule.createdAt ? new Date(capsule.createdAt) : new Date();
    const createdLabel = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const media = capsule.media || [];
    const photos = media.filter((m) => m.type === 'image').length;
    const videos = media.filter((m) => m.type === 'video').length;
    const audio = media.filter((m) => m.type === 'audio').length;
    const mediaCount = media.length;

    let unlockText = 'Locked';
    if (capsule.status === 'editable') unlockText = 'Editable';
    if (capsule.unlockDate) {
      const diff = Math.max(0, Math.ceil((new Date(capsule.unlockDate).getTime() - Date.now()) / 86400000));
      unlockText = diff === 0 ? 'Opens today' : `Opens in ${diff} days`;
    }

    return {
      id: capsule.id,
      title: capsule.title,
      description: capsule.message,
      icon: 'Gift',
      gradient: 'from-pink-400 to-rose-400',
      createdDate: createdLabel,
      unlockText,
      unlockDate: capsule.unlockDate || null,
      status: capsule.status || 'locked',
      photos,
      videos,
      audio,
      mediaCount,
      media,
    };
  };

  const loadCapsules = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(buildApiUrl('/api/time-capsules'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load capsules');
      }
      setLoadError('');
      setMyCapsules((data?.capsules || []).map(mapCapsule));
    } catch (error) {
      setMyCapsules([]);
      setLoadError(error?.message || 'Unable to load capsules.');
    }
  };

  useEffect(() => {
    loadCapsules();
  }, [user]);

  // Mock data - Template Ideas
  const templates = useMemo(() => [
    {
      id: 1,
      title: 'First Day Home',
      description: 'Capture the emotions of bringing your baby home for the first time. The joy, nerves, and overwhelming love.',
      icon: 'Home',
      gradient: 'from-pink-400 to-rose-400',
      unlockAge: 'Birth'
    },
    {
      id: 2,
      title: 'First Birthday Letter',
      description: 'Reflect on the incredible first year. All the milestones, challenges, and beautiful moments.',
      icon: 'Cake',
      gradient: 'from-blue-400 to-indigo-400',
      unlockAge: '1 Year'
    },
    {
      id: 3,
      title: 'First Day of School',
      description: 'Message for their first day of kindergarten. Encouraging words for this big milestone.',
      icon: 'School',
      gradient: 'from-sky-400 to-cyan-400',
      unlockAge: '5 Years'
    },
    {
      id: 4,
      title: 'Teenage Wisdom',
      description: 'Advice for navigating adolescence. Life lessons you wish you knew at their age.',
      icon: 'Users',
      gradient: 'from-emerald-400 to-teal-400',
      unlockAge: '13 Years'
    },
    {
      id: 5,
      title: 'Graduation Message',
      description: 'For their high school graduation. Pride, joy, and hopes for their future.',
      icon: 'Award',
      gradient: 'from-amber-400 to-orange-400',
      unlockAge: '18 Years'
    },
    {
      id: 6,
      title: 'Wedding Day',
      description: 'A heartfelt letter for the day they marry their love. Wishes for lifelong happiness.',
      icon: 'Heart',
      gradient: 'from-pink-400 to-pink-500',
      unlockAge: '25+ Years'
    },
    {
      id: 7,
      title: 'First Heartbeat',
      description: 'The day you heard their heartbeat. That magical sound that changed everything.',
      icon: 'Heart',
      gradient: 'from-rose-400 to-pink-400',
      unlockAge: '5 Years'
    },
    {
      id: 8,
      title: 'First Steps',
      description: 'When they took their first steps. The pride and excitement of watching them walk.',
      icon: 'Baby',
      gradient: 'from-orange-400 to-amber-400',
      unlockAge: '10 Years'
    }
  ], []);

  const filteredCapsules = useMemo(() => {
    return myCapsules.filter(capsule =>
      capsule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      capsule.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [myCapsules, searchQuery]);

  const stats = useMemo(() => {
    const total = myCapsules.length;
    const locked = myCapsules.filter((c) => c.status === 'locked').length;
    const mediaCount = myCapsules.reduce((sum, c) => sum + (c.mediaCount || 0), 0);
    const nextUnlockDate = myCapsules
      .map((c) => (c.unlockDate ? new Date(c.unlockDate) : null))
      .filter((d) => d && d.getTime() >= Date.now())
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const nextUnlock = nextUnlockDate
      ? nextUnlockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';

    return {
      total,
      locked,
      nextUnlock,
      mediaCount,
    };
  }, [myCapsules]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      
      <main className="pt-20 pb-10 px-4 max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5"></div>
          <div className="relative p-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Icon name="Lock" className="w-4 h-4" />
              Memories Locked Until Their Future
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-foreground">
              Legacy Time Capsule
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
              Capture today's emotions for tomorrow's joy. Write letters, save memories, and create gifts your child will cherish for a lifetime.
            </p>
            <Button 
              size="lg" 
              onClick={() => setShowCreateModal(true)}
              className="shadow-lg"
            >
              <Icon name="Plus" className="w-5 h-5 mr-2" />
              Create Time Capsule
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: 'Archive', label: 'Total Capsules', value: stats.total, color: 'from-blue-400 to-blue-500' },
            { icon: 'Lock', label: 'Locked', value: stats.locked, color: 'from-teal-400 to-cyan-500' },
            { icon: 'Clock', label: 'Next Unlock', value: stats.nextUnlock, color: 'from-emerald-400 to-green-500' },
            { icon: 'Image', label: 'Memories', value: stats.mediaCount, color: 'from-pink-400 to-rose-400' }
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-lg transition-all">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <Icon name={stat.icon} className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-2xl p-2 border border-border shadow-lg inline-flex">
          <button
            onClick={() => setActiveTab('my-capsules')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'my-capsules'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name="Archive" className="w-5 h-5 inline mr-2" />
            My Capsules
          </button>
          <button
            onClick={() => setActiveTab('inspiration')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'inspiration'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon name="Lightbulb" className="w-5 h-5 inline mr-2" />
            Ideas & Inspiration
          </button>
        </div>

        {/* Search Bar (My Capsules) */}
        {activeTab === 'my-capsules' && (
          <div className="relative group">
            <Icon name="Search" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search your capsules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-card border-2 border-border focus:border-primary rounded-xl outline-none transition-all text-lg"
            />
          </div>
        )}

        {activeTab === 'my-capsules' && loadError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-700 rounded-xl p-4">
            {loadError}
          </div>
        )}

        {/* Content */}
        {activeTab === 'my-capsules' ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                {filteredCapsules.length} {filteredCapsules.length === 1 ? 'Capsule' : 'Capsules'}
              </h2>
              <Button onClick={() => setShowCreateModal(true)}>
                <Icon name="Plus" className="w-4 h-4 mr-2" />
                New Capsule
              </Button>
            </div>

            {filteredCapsules.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCapsules.map((capsule) => (
                  <CapsuleCard
                    key={capsule.id}
                    capsule={capsule}
                    onClick={() => setSelectedCapsule(capsule)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-card rounded-2xl border border-border">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Search" className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No capsules found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your search</p>
                <Button onClick={() => setSearchQuery('')}>
                  <Icon name="RotateCcw" className="w-4 h-4 mr-2" />
                  Clear Search
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Ideas & Inspiration</h2>
              <p className="text-muted-foreground">Choose a template or start from scratch</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowCreateModal(true);
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Integration Links */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-3xl p-8 border-2 border-primary/20">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-foreground mb-2">Capture Memories Anywhere</h3>
            <p className="text-muted-foreground">Save special moments from across the app to your time capsule</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Community Posts',
                description: 'Save meaningful conversations',
                icon: 'Users',
                color: 'from-sky-400 to-cyan-400',
                link: '/community'
              },
              {
                title: 'Expert Sessions',
                description: 'Remember consultations',
                icon: 'Calendar',
                color: 'from-blue-400 to-indigo-400',
                link: '/marketplace'
              },
              {
                title: 'Baby Visualizer',
                description: 'Preserve weekly memories',
                icon: 'Baby',
                color: 'from-pink-400 to-rose-400',
                link: '/visualizer'
              }
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => navigate(item.link)}
                className="group bg-card hover:bg-card/80 rounded-2xl p-6 border border-border hover:border-primary/30 transition-all text-left"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon name={item.icon} className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Trust & Privacy */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon name="Shield" className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">Your Memories Are Safe</h3>
              <p className="text-muted-foreground leading-relaxed">
                All time capsules are end-to-end encrypted and securely stored. Only you and your chosen guardians can access them. Once locked, capsules remain sealed until the unlock date—preserving authentic emotions for the future.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Lock" className="w-4 h-4 text-green-500" />
                  <span className="font-semibold">End-to-End Encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Cloud" className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold">Cloud Backup</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Icon name="Users" className="w-4 h-4 text-purple-500" />
                  <span className="font-semibold">Trusted Guardians</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Modal */}
      <CreateCapsuleModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        user={user}
        onCreated={loadCapsules}
      />

      <CapsuleDetailsModal
        capsule={selectedCapsule}
        onClose={() => setSelectedCapsule(null)}
      />
    </div>
  );
};

export default TimeCapsule;
