import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Preferences, UpdateProfile, UserProfile } from '@feedbackhub/types';

import { env } from '@core/env';

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly http = inject(HttpClient);
  private readonly base = env.apiUrl;

  updateProfile(
    body: UpdateProfile,
  ): Observable<Pick<UserProfile, 'id' | 'email' | 'displayName'>> {
    return this.http.patch<Pick<UserProfile, 'id' | 'email' | 'displayName'>>(
      `${this.base}/me/profile`,
      body,
    );
  }

  updatePreferences(body: Preferences): Observable<Preferences> {
    return this.http.put<Preferences>(`${this.base}/me/preferences`, body);
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(`${this.base}/me`);
  }
}
