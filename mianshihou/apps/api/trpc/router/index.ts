import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { userRouter } from './user';
import { questionRouter } from './question';
import { questionBankRouter } from './questionBank';
import { postRouter } from './post';
import { postThumbRouter } from './postThumb';
import { postFavourRouter } from './postFavour';
import { authRouter } from './auth';

export const appRouter = router({
  users: userRouter,
  questions: questionRouter.questions,
  questionBanks: questionBankRouter.questionBanks,
  posts: postRouter.posts,
  postThumbs: postThumbRouter.postThumbs,
  postFavours: postFavourRouter.postFavours,
  auth: authRouter,
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  hello: publicProcedure.input(z.object({ name: z.string() })).query(({ input }) => {
    return { message: `Hello ${input.name}!` };
  }),
});

export type AppRouter = typeof appRouter;
