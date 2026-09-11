import { supabase } from '../../lib/supabase';
import { IDriveRepository } from '../../domain/repositories';

export class GoogleDriveRepository implements IDriveRepository {
  private scopes = ['https://www.googleapis.com/auth/drive.file'];

  initiateAuth(): void {
    // These should ideally be fetched from a config service, but for now we keep the public ones 
    // needed for the client-side redirect. The Secret remains on the backend.
    const clientId = '122661586517-b1notd57qo7vcrgalrl5mllm2fibim10.apps.googleusercontent.com';
    const redirectUri = `${window.location.origin}/auth/google/callback`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', this.scopes.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    window.location.href = authUrl.toString();
  }

  async handleCallback(code: string): Promise<void> {
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const { data, error } = await supabase.functions.invoke('google-drive-auth', {
      body: { code, redirectUri }
    });

    if (error || !data.success) {
      throw new Error(error?.message || data?.error || "Failed to exchange code for tokens");
    }
  }

  async uploadFile(file: File, name: string, phase?: number): Promise<{ fileId: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (phase !== undefined) {
      formData.append('phase', String(phase));
    }

    const { data, error } = await supabase.functions.invoke('upload-to-drive', {
      body: formData,
    });

    if (error || !data.fileId) {
      throw new Error(error?.message || data?.error || 'Failed to upload file to Google Drive');
    }

    return { fileId: data.fileId };
  }

  async getFileUrl(fileId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('get-file-url', {
      body: { fileId }
    });

    if (error || !data.url) {
      throw new Error(error?.message || data?.error || 'Failed to get file URL');
    }

    return data.url;
  }

  async isConnected(userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('google_drive_auth')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    return !!data;
  }

  async verifyConnection(): Promise<{ connected: boolean; folderId?: string }> {
    const { data, error } = await supabase.functions.invoke('verify-drive-connection');

    if (error) {
      console.error('Verify connection error:', error);
      return { connected: false };
    }

    return {
      connected: data.connected,
      folderId: data.folderId
    };
  }
}
