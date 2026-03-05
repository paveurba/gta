import { RebarPlugin } from '../main/server/rebar/runtime';
import { registerInventoryModule } from '../main/server/modules/inventory';

const plugin: RebarPlugin = {
  name: 'inventory',
  register(context) {
    registerInventoryModule(context);
  },
};

export default plugin;
