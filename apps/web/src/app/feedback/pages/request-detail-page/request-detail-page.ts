import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { subject } from '@feedbackhub/auth';
import type { RequestDetail } from '@feedbackhub/types';

import { ApiError } from '@core/api-error';
import { BootstrapStore } from '@core/bootstrap-store';
import { relativeTime } from '@core/format';
import { ConfirmService } from '@ui/confirm-dialog';
import { FhButton } from '@ui/button';
import { FhErrorState } from '@ui/error-state';
import { FhSpinner } from '@ui/spinner';
import { FeedbackApi } from '@feedback/data/feedback-api';

type DetailState = 'loading' | 'missing' | 'error' | 'ready';

@Component({
  selector: 'app-request-detail-page',
  imports: [RouterLink, FhButton, FhErrorState, FhSpinner],
  templateUrl: './request-detail-page.html',
})
export class RequestDetailPage {
  private readonly api = inject(FeedbackApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  readonly bootstrap = inject(BootstrapStore);
  readonly relativeTime = relativeTime;

  readonly id = this.route.snapshot.paramMap.get('id')!;
  readonly state = signal<DetailState>('loading');
  readonly request = signal<RequestDetail | null>(null);
  readonly commentDraft = signal('');
  readonly commentError = signal('');
  readonly posting = signal(false);
  readonly editingCommentId = signal<string | null>(null);
  readonly editDraft = signal('');

  readonly canEdit = computed(() => {
    const request = this.request();
    const ability = this.bootstrap.ability();
    return !!(
      request && ability?.can('update', subject('Request', { authorId: request.authorId }))
    );
  });
  readonly canDelete = computed(() => {
    const request = this.request();
    const ability = this.bootstrap.ability();
    return !!(
      request && ability?.can('delete', subject('Request', { authorId: request.authorId }))
    );
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.request.set(await firstValueFrom(this.api.detail(this.id)));
      this.state.set('ready');
    } catch (error) {
      this.state.set(
        error instanceof ApiError && error.problem.status === 404 ? 'missing' : 'error',
      );
    }
  }

  canTouchComment(authorId: string): boolean {
    return !!this.bootstrap.ability()?.can('update', subject('Comment', { authorId }));
  }

  canModerateComment(authorId: string): boolean {
    return !!this.bootstrap.ability()?.can('delete', subject('Comment', { authorId }));
  }

  async toggleVote(): Promise<void> {
    const current = this.request();
    if (!current) {
      return;
    }
    const voting = !current.myVote;
    this.request.set({
      ...current,
      myVote: voting,
      voteCount: current.voteCount + (voting ? 1 : -1),
    });
    try {
      await firstValueFrom(voting ? this.api.vote(this.id) : this.api.unvote(this.id));
    } catch {
      this.request.set(current);
    }
  }

  async postComment(): Promise<void> {
    const body = this.commentDraft().trim();
    if (!body) {
      this.commentError.set('Comment cannot be empty');
      return;
    }
    this.posting.set(true);
    this.commentError.set('');
    try {
      await firstValueFrom(this.api.comment(this.id, { body }));
      this.commentDraft.set('');
      await this.load();
    } catch (error) {
      this.commentError.set(error instanceof ApiError ? error.message : 'Could not post comment');
    } finally {
      this.posting.set(false);
    }
  }

  startEdit(commentId: string, body: string): void {
    this.editingCommentId.set(commentId);
    this.editDraft.set(body);
  }

  async saveEdit(): Promise<void> {
    const id = this.editingCommentId();
    const body = this.editDraft().trim();
    if (!id || !body) {
      return;
    }
    try {
      await firstValueFrom(this.api.updateComment(id, { body }));
      this.editingCommentId.set(null);
      await this.load();
    } catch {
      this.editingCommentId.set(null);
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete comment?',
      message: 'The comment will be removed from the discussion.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await firstValueFrom(this.api.deleteComment(commentId));
    await this.load();
  }

  async deleteRequest(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete this request?',
      message: 'It will disappear from the board, along with its discussion.',
      confirmLabel: 'Delete request',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    await firstValueFrom(this.api.remove(this.id));
    await this.router.navigate(['/requests']);
  }
}
