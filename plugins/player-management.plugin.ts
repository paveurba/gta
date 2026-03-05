import { RebarPlugin } from '../main/server/rebar/runtime';
import { registerPlayerManagementModule } from '../main/server/modules/player-management';

const plugin: RebarPlugin = {
  name: 'player-management',
  register(context) {
    registerPlayerManagementModule(context);
  },
};

export default plugin;
