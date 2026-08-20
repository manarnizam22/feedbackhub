import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Comment,
  CreateComment,
  CreateRequest,
  ListRequestsQuery,
  ListRequestsResponse,
  RequestDetail,
  UpdateRequest,
} from '@feedbackhub/types';

import { env } from '@core/env';

/* Plain typed HTTP surface of the feedback domain. Error mapping lives in the
   api-error interceptor; auth lives in the auth interceptor — nothing here but
   the contract. */
@Injectable({ providedIn: 'root' })
export class FeedbackApi {
  private readonly http = inject(HttpClient);
  private readonly base = env.apiUrl;

  list(query: Partial<ListRequestsQuery>): Observable<ListRequestsResponse> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '' && value !== false) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ListRequestsResponse>(`${this.base}/requests`, { params });
  }

  detail(id: string): Observable<RequestDetail> {
    return this.http.get<RequestDetail>(`${this.base}/requests/${id}`);
  }

  create(body: CreateRequest): Observable<RequestDetail> {
    return this.http.post<RequestDetail>(`${this.base}/requests`, body);
  }

  update(id: string, body: UpdateRequest): Observable<RequestDetail> {
    return this.http.patch<RequestDetail>(`${this.base}/requests/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/requests/${id}`);
  }

  vote(id: string): Observable<void> {
    return this.http.put<void>(`${this.base}/requests/${id}/vote`, {});
  }

  unvote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/requests/${id}/vote`);
  }

  comment(requestId: string, body: CreateComment): Observable<Comment> {
    return this.http.post<Comment>(`${this.base}/requests/${requestId}/comments`, body);
  }

  updateComment(id: string, body: CreateComment): Observable<Comment> {
    return this.http.patch<Comment>(`${this.base}/comments/${id}`, body);
  }

  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/comments/${id}`);
  }

  approveComment(id: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.base}/comments/${id}/approve`, {});
  }

  setStatus(id: string, statusId: string): Observable<RequestDetail> {
    return this.http.patch<RequestDetail>(`${this.base}/requests/${id}/status`, { statusId });
  }

  setPinned(id: string, pinned: boolean): Observable<void> {
    const url = `${this.base}/requests/${id}/pin`;
    return pinned ? this.http.put<void>(url, {}) : this.http.delete<void>(url);
  }
}
