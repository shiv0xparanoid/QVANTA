import React from 'react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@qvanta/ui';
import AvatarScene from '@/components/tutor/AvatarScene';
import ChatPanel from '@/components/tutor/ChatPanel';
import { useAuthStore } from '@/store/auth';
import { AvatarPresetPicker } from '@qvanta/ui';
import type { AvatarPresetId } from '@qvanta/ui';
import { apiClient } from '@/lib/api-client';
import type { User } from '@qvanta/types';

const TutorPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [showPicker, setShowPicker] = React.useState(false);
  const [savingPreset, setSavingPreset] = React.useState(false);

  const currentPreset: AvatarPresetId = Math.max(0, Math.min(2, (user?.avatarPreset ?? 0))) as AvatarPresetId;
  const numericPresetNum: number = currentPreset;

  const handlePresetChange = async (presetId: AvatarPresetId) => {
    setSavingPreset(true);
    try {
      const numericPreset: number = typeof presetId === 'number' ? presetId : Number(presetId) || 0;
      const res = await apiClient.patch<User>('/users/me', { avatarPreset: numericPreset });
      setUser(res.data);
    } catch {
      // ignore; optimistic update already handled by picker UX
    } finally {
      setSavingPreset(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-100">AI Tutor</h1>
          <p className="mt-1 text-sm text-text-400">
            Ask anything about quantum computing. Your tutor answers grounded in lesson content and your current circuit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowPicker((v) => !v)}>
            Customize Avatar
          </Button>
        </div>
      </div>

      {showPicker && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avatar Customization</CardTitle>
          </CardHeader>
          <CardContent>
            <AvatarPresetPicker
              value={currentPreset}
              onChange={handlePresetChange}
              disabled={savingPreset}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="flex min-h-[460px] flex-col">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-bg-800 pb-3">
            <CardTitle className="text-base">Virtual Tutor</CardTitle>
            <span className="text-xs text-text-500">Preset #{numericPresetNum + 1}</span>
          </CardHeader>
          <CardContent className="relative flex-1 overflow-hidden p-0">
            <AvatarScene presetId={currentPreset} />
          </CardContent>
        </Card>

        <Card className="flex min-h-[460px] flex-col">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-bg-800 pb-3">
            <CardTitle className="text-base">Conversation</CardTitle>
            <span className="text-xs text-text-500">Responses use RAG over QVANTA lessons</span>
          </CardHeader>
          <CardContent className="flex h-[560px] flex-1 flex-col p-0">
            <ChatPanel />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TutorPage;
