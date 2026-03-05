import { RebarPlugin } from '../main/server/rebar/runtime';
import { registerJobsModule } from '../main/server/modules/jobs';

const plugin: RebarPlugin = {
  name: 'jobs',
  register(context) {
    registerJobsModule(context);
  },
};

export default plugin;
