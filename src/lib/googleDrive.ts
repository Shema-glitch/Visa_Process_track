import { supabase } from './supabase';

const GOOGLE_CLIENT_ID = '122661586517-b1notd57qo7vcrgalrl5mllm2fibim10.apps.googleusercontent.com';
const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;

export async function initiateGoogleOAuth() {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
  authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', GOOGLE_SCOPES.join(' '));
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');

  window.location.href = authUrl.toString();
}

export async function handleGoogleCallback(code: string) {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with Google Drive');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Google Drive auth error:', error);
    throw error;
  }
}

export async function uploadFileToGoogleDrive(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-drive`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file to Google Drive');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

export async function isGoogleDriveConnected() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('google_drive_auth')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  return !!data;
}
