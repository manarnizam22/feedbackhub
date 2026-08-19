import { z } from 'zod';

export const ListRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['newest', 'oldest', 'votes', 'comments']).default('newest'),
  status: z.uuid().optional(),
  category: z.uuid().optional(),
  q: z.string().trim().max(200).optional(),
  mine: z.coerce.boolean().optional(),
});

export const RequestListItemSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  categoryId: z.uuid(),
  categoryName: z.string(),
  statusId: z.uuid(),
  statusName: z.string(),
  authorId: z.uuid(),
  authorName: z.string(),
  pinned: z.boolean(),
  voteCount: z.number().int(),
  commentCount: z.number().int(),
  myVote: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ListRequestsResponseSchema = z.object({
  items: z.array(RequestListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

export const CommentSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
  authorId: z.uuid(),
  authorName: z.string(),
  body: z.string(),
  approved: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RequestDetailSchema = RequestListItemSchema.extend({
  comments: z.array(CommentSchema),
});

export const CreateRequestSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(10000),
  categoryId: z.uuid(),
});

export const UpdateRequestSchema = CreateRequestSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field must be provided',
);

export const SetStatusSchema = z.object({ statusId: z.uuid() });

export const CreateCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
});

export const UpdateCommentSchema = CreateCommentSchema;

export type ListRequestsQuery = z.infer<typeof ListRequestsQuerySchema>;
export type RequestListItem = z.infer<typeof RequestListItemSchema>;
export type ListRequestsResponse = z.infer<typeof ListRequestsResponseSchema>;
export type RequestDetail = z.infer<typeof RequestDetailSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type CreateRequest = z.infer<typeof CreateRequestSchema>;
export type UpdateRequest = z.infer<typeof UpdateRequestSchema>;
export type SetStatus = z.infer<typeof SetStatusSchema>;
export type CreateComment = z.infer<typeof CreateCommentSchema>;
