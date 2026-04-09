import { useState, useEffect } from 'react';

export interface AISettings {
  // Chat API
  baseUrl: string;
  apiKey: string;
  modelName: string;

  // Image API
  imageBaseUrl: string;
  imageApiKey: string;
  imageModelName: string;
}

const DEFAULT_SETTINGS: AISettings = {
  // Chat defaults
  baseUrl: process.env.NEXT_PUBLIC_CHAT_API_BASE_URL || 'https://yunwu.ai/v1',
  apiKey: '', // API Key is hidden from client, server uses environment variable
  modelName: 'gemini-3.1-flash-lite-preview',

  // Image defaults
  imageBaseUrl: process.env.NEXT_PUBLIC_IMAGE_API_BASE_URL || 'https://yunwu.ai/v1',
  imageApiKey: '', // API Key is hidden from client, server uses environment variable
  imageModelName: 'gemini-3.1-flash-image-preview',
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();

        if (data.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        } else {
          const saved = localStorage.getItem('01agent_settings');
          if (saved) {
            try {
              setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
            } catch (e) {
              console.error('Failed to parse settings', e);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load settings from database:', error);
        const saved = localStorage.getItem('01agent_settings');
        if (saved) {
          try {
            setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
          } catch (e) {
            console.error('Failed to parse settings', e);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (newSettings: AISettings) => {
    setSettings(newSettings);
    localStorage.setItem('01agent_settings', JSON.stringify(newSettings));

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'default', settings: newSettings }),
      });
    } catch (error) {
      console.error('Failed to save settings to database:', error);
    }
  };

  return { settings, saveSettings, loading };
};
