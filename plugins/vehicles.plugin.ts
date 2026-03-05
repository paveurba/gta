import { RebarPlugin } from '../main/server/rebar/runtime';
import { registerVehiclesModule } from '../main/server/modules/vehicles';

const plugin: RebarPlugin = {
  name: 'vehicles',
  register(context) {
    registerVehiclesModule(context);
  },
};

export default plugin;
