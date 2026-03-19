import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersService } from '../firebase';
import { Card, Button, Input, Badge } from '../components/ui';
import { Camera, Save, UserCircle } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { userData } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    photo: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        nickname: userData.nickname || '',
        photo: userData.photo || ''
      });
    }
  }, [userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    setIsSaving(true);
    setMessage(null);

    try {
      await usersService.update(userData.id, {
        name: formData.name,
        nickname: formData.nickname,
        photo: formData.photo
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!userData) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <Card>
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {formData.photo ? (
                <img src={formData.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-16 h-16 text-gray-400" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormData({ ...formData, photo: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
          <div>
            <h2 className="text-xl font-bold">{userData.name}</h2>
            <p className="text-gray-500">{userData.email}</p>
            <Badge variant={userData.role === 'admin' ? 'danger' : 'info'} className="mt-2">
              {userData.role?.toUpperCase()}
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Nickname"
            type="text"
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
            placeholder="Optional display name"
          />

          <Input
            label="Profile Photo URL"
            type="url"
            value={formData.photo}
            onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
            placeholder="https://example.com/photo.jpg"
          />

          {message && (
            <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">Account Information</h3>
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-500">Email:</span> {userData.email}</p>
          <p><span className="text-gray-500">Role:</span> {userData.role}</p>
          <p><span className="text-gray-500">Joined:</span> {new Date(userData.createdAt).toLocaleDateString()}</p>
        </div>
      </Card>
    </div>
  );
};
