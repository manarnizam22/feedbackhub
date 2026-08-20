import type { Problem } from '@feedbackhub/types';

/* The typed form of the API's problem-details responses. Produced exactly once,
   by the api-error interceptor; everything downstream catches ApiError, never
   raw HttpErrorResponse. */
export class ApiError extends Error {
  constructor(readonly problem: Problem) {
    super(problem.message);
  }

  get details() {
    return this.problem.details ?? [];
  }
}
