import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CreateRequestSchema } from '@feedbackhub/types';

import { ApiError } from '@core/api-error';
import { BootstrapStore } from '@core/bootstrap-store';
import { FhButton } from '@ui/button';
import { FhFormField } from '@ui/form-field';
import { FhSpinner } from '@ui/spinner';
import { FeedbackApi } from '@feedback/data/feedback-api';

/* One form, two modes: /requests/new and /requests/:id/edit. Client validation
   mirrors the shared zod contract; server 422 details attach to fields; the
   429 rate-limit message shows verbatim (it is actionable by design). */
@Component({
  selector: 'app-request-form-page',
  imports: [RouterLink, FhButton, FhFormField, FhSpinner],
  templateUrl: './request-form-page.html',
})
export class RequestFormPage {
  private readonly api = inject(FeedbackApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly bootstrap = inject(BootstrapStore);

  readonly editId = this.route.snapshot.paramMap.get('id');
  readonly isEdit = this.editId !== null;
  readonly loading = signal(this.isEdit);
  readonly saving = signal(false);
  readonly banner = signal('');

  readonly title = signal('');
  readonly description = signal('');
  readonly categoryId = signal('');
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly descriptionCount = computed(() => this.description().length);

  constructor() {
    if (this.isEdit) {
      void this.prefill();
    }
  }

  private async prefill(): Promise<void> {
    try {
      const detail = await firstValueFrom(this.api.detail(this.editId!));
      this.title.set(detail.title);
      this.description.set(detail.description);
      this.categoryId.set(detail.categoryId);
    } catch {
      await this.router.navigate(['/requests']);
      return;
    }
    this.loading.set(false);
  }

  async submit(): Promise<void> {
    const input = {
      title: this.title().trim(),
      description: this.description().trim(),
      categoryId: this.categoryId(),
    };
    const parsed = CreateRequestSchema.safeParse(input);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || 'form';
        errors[key] = errors[key] ?? issue.message;
      }
      this.fieldErrors.set(errors);
      return;
    }
    this.fieldErrors.set({});
    this.banner.set('');
    this.saving.set(true);
    try {
      const saved = this.isEdit
        ? await firstValueFrom(this.api.update(this.editId!, parsed.data))
        : await firstValueFrom(this.api.create(parsed.data));
      await this.router.navigate(['/requests', saved.id]);
    } catch (error) {
      if (error instanceof ApiError && error.details.length > 0) {
        const errors: Record<string, string> = {};
        for (const detail of error.details) {
          errors[detail.path] = detail.message;
        }
        this.fieldErrors.set(errors);
      } else if (error instanceof ApiError) {
        this.banner.set(error.message);
      } else {
        this.banner.set('Something went wrong — try again.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}
