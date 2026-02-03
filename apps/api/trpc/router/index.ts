import { router, publicProcedure } from '../index';
import { z } from 'zod';
import { userRouter } from './user';
import { questionRouter } from './question';
import { questionBankRouter } from './questionBank';
import { postRouter } from './post';
import { postThumbRouter } from './postThumb';
import { postFavourRouter } from './postFavour';
import { authRouter } from './auth';
import { uploadRouter } from './upload';
import { dashboardRouter } from './dashboard';
import { exploreRouter } from './explore';
import { searchRouter } from './search';
import { questionFavourRouter } from './questionFavour';
import { practiceRouter } from './practice';

export const appRouter = router({
  users: userRouter,
  questions: questionRouter.questions,
  question: questionRouter,
  questionBanks: questionBankRouter.questionBanks,
  questionBank: questionBankRouter,
  explore: exploreRouter,
  search: searchRouter,
  questionFavours: questionFavourRouter,
  practice: practiceRouter,
  posts: postRouter.posts,
  postThumbs: postThumbRouter.postThumbs,
  postFavours: postFavourRouter.postFavours,
  auth: authRouter,
  upload: uploadRouter,
  dashboard: dashboardRouter,
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  hello: publicProcedure.input(z.object({ name: z.string() })).query(({ input }) => {
    return { message: `Hello ${input.name}!` };
  }),
});

export type AppRouter = typeof appRouter;
