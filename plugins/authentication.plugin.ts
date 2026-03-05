import { RebarPlugin } from '../main/server/rebar/runtime';
import { registerAuthenticationModule } from '../main/server/modules/authentication';

const plugin: RebarPlugin = {
  name: 'authentication',
  register(context) {
    registerAuthenticationModule(context);
  },
};

export default plugin;
