import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  AdminSettings,
  Category,
  PendingComment,
  Status,
  UpsertCategory,
  UpsertStatus,
} from '@feedbackhub/types';

import { env } from '@core/env';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = env.apiUrl;

  pendingComments(): Observable<PendingComment[]> {
    return this.http.get<PendingComment[]>(`${this.base}/admin/comments/pending`);
  }

  approveComment(id: string): Observable<unknown> {
    return this.http.post(`${this.base}/comments/${id}/approve`, {});
  }

  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/comments/${id}`);
  }

  createCategory(body: UpsertCategory): Observable<Category> {
    return this.http.post<Category>(`${this.base}/admin/categories`, body);
  }

  updateCategory(id: string, body: Partial<UpsertCategory>): Observable<Category> {
    return this.http.patch<Category>(`${this.base}/admin/categories/${id}`, body);
  }

  createStatus(body: UpsertStatus): Observable<Status> {
    return this.http.post<Status>(`${this.base}/admin/statuses`, body);
  }

  updateStatus(id: string, body: Partial<UpsertStatus>): Observable<Status> {
    return this.http.patch<Status>(`${this.base}/admin/statuses/${id}`, body);
  }

  getSettings(): Observable<AdminSettings> {
    return this.http.get<AdminSettings>(`${this.base}/admin/settings`);
  }

  updateSettings(body: AdminSettings): Observable<AdminSettings> {
    return this.http.put<AdminSettings>(`${this.base}/admin/settings`, body);
  }
}
