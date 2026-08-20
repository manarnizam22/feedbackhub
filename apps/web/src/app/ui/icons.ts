import { Component, input } from '@angular/core';

/* Inline stroke icons (Heroicons outline paths) — no icon font, no requests,
   theme-aware via currentColor. */
@Component({
  selector: 'fh-icon',
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.8"
      stroke="currentColor"
      aria-hidden="true"
      [style.width.px]="size()"
      [style.height.px]="size()"
    >
      @switch (name()) {
        @case ('bell') {
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        }
        @case ('chevron-up') {
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        }
        @case ('chat') {
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z"
          />
        }
        @case ('pin') {
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9.75 3.75h4.5m-4.5 0v6.568c0 .478-.226.925-.605 1.213l-2.29 1.719a1.5 1.5 0 0 0-.605 1.212v.288h11.5v-.288a1.5 1.5 0 0 0-.605-1.212l-2.29-1.72a1.517 1.517 0 0 1-.605-1.212V3.75m-4.5 0h-1.5m6 0h1.5M12 15v5.25"
          />
        }
      }
    </svg>
  `,
})
export class FhIcon {
  readonly name = input.required<'bell' | 'chevron-up' | 'chat' | 'pin'>();
  readonly size = input(20);
}
